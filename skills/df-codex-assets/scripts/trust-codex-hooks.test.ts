import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { collectPluginHookTrustEntries, trustPluginHooks } from './trust-codex-hooks'

// Manifest-derived hashes are validated by shape; values intentionally remain dynamic.
const UPSTREAM_CODEX_RAW_ROOT = 'https://raw.githubusercontent.com/openai/codex/main'
const UPSTREAM_TRUST_SOURCES = [
  {
    path: 'codex-rs/hooks/src/engine/discovery.rs',
    slices: [
      {
        start: '                HookHandlerConfig::Command {\n',
        end: '                HookHandlerConfig::McpTool {',
      },
      {
        start: '            let NormalizedHandler {\n',
        end: '            let key = ',
      },
      {
        start: '/// Hash a normalized, config-derived identity instead of source text',
        end: 'fn hook_trust_status(',
      },
    ],
    fingerprint: 'sha256:c2fd2dd31da552d248d29c44f9e20b48480a7444d847288bd992f9126a99f67a',
  },
  {
    path: 'codex-rs/config/src/fingerprint.rs',
    slices: [{ start: 'pub fn version_for_toml(' }],
    fingerprint: 'sha256:5a132e504a6fe88b34c5606c71304df3e7f064d6ea7403a191820bac548c635d',
  },
] as const
const tempRoots: string[] = []

afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'devopsflow-trust-hooks-'))
  tempRoots.push(root)
  return root
}

function writeFixturePlugin(root: string, hooks: Record<string, unknown>): void {
  writeFile(
    root,
    '.codex-plugin/plugin.json',
    JSON.stringify({
      name: 'devopsflow',
      hooks: './hooks/hooks.codex.json',
    }),
  )
  writeFile(root, '.codex-plugin/marketplace.json', JSON.stringify({ name: 'devopsflow' }))
  writeFile(root, 'hooks/hooks.codex.json', JSON.stringify({ hooks }))
}

function writeFile(root: string, path: string, content: string): void {
  const absolutePath = join(root, path)
  mkdirSync(dirname(absolutePath), { recursive: true })
  writeFileSync(absolutePath, content)
}

function hookState(configPath: string): Record<string, { trusted_hash: string }> {
  const parsed = Bun.TOML.parse(readFileSync(configPath, 'utf-8')) as {
    hooks?: { state?: Record<string, { trusted_hash: string }> }
  }
  return parsed.hooks?.state ?? {}
}

function extractSourceSlices(source: string, slices: readonly { start: string; end?: string }[]): string {
  const normalized = source.replaceAll('\r\n', '\n')
  return slices
    .map(({ start, end }) => {
      const startIndex = normalized.indexOf(start)
      if (startIndex < 0) throw new Error(`Upstream start marker missing: ${start}`)
      const endIndex = end ? normalized.indexOf(end, startIndex + start.length) : normalized.length
      if (endIndex < 0) throw new Error(`Upstream end marker missing: ${end}`)
      return normalized.slice(startIndex, endIndex).trimEnd()
    })
    .join('\n\n')
}

function sha256(value: string): string {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(value)
  return `sha256:${hasher.digest('hex')}`
}

describe('Codex hook trust hash', () => {
  it('keeps the real manifest hook identities and hash shape stable', () => {
    const pluginRoot = resolve(import.meta.dir, '../../..')

    const entries = collectPluginHookTrustEntries(pluginRoot, 'win32')

    expect(entries.map(({ key }) => key)).toEqual([
      'devopsflow@devopsflow:hooks/hooks.codex.json:session_start:0:0',
      'devopsflow@devopsflow:hooks/hooks.codex.json:session_start:0:1',
      'devopsflow@devopsflow:hooks/hooks.codex.json:session_start:0:2',
      'devopsflow@devopsflow:hooks/hooks.codex.json:pre_tool_use:0:0',
      'devopsflow@devopsflow:hooks/hooks.codex.json:post_tool_use:0:0',
    ])
    expect(entries.every(({ trustedHash }) => /^sha256:[a-f0-9]{64}$/.test(trustedHash))).toBe(true)
  })

  it('matches the upstream Codex hook trust implementation on main', async () => {
    const results = await Promise.all(
      UPSTREAM_TRUST_SOURCES.map(async ({ path, slices, fingerprint }) => {
        const response = await fetch(`${UPSTREAM_CODEX_RAW_ROOT}/${path}`, {
          signal: AbortSignal.timeout(30_000),
        })
        if (!response.ok) {
          throw new Error(`Unable to fetch upstream Codex source ${path}: ${response.status} ${response.statusText}`)
        }
        return {
          path,
          actual: sha256(extractSourceSlices(await response.text(), slices)),
          expected: fingerprint,
        }
      }),
    )

    for (const { path, actual, expected } of results) {
      expect(actual, `${path} trust logic changed upstream`).toBe(expected)
    }
  }, 40_000)

  it('creates trust entries for asynchronous command hooks', () => {
    const pluginRoot = tempRoot()
    writeFixturePlugin(pluginRoot, {
      PreToolUse: [
        {
          matcher: 'shell_command',
          hooks: [
            {
              type: 'command',
              command: 'bun audit.ts',
              async: true,
            },
          ],
        },
      ],
    })

    expect(collectPluginHookTrustEntries(pluginRoot, 'win32')).toHaveLength(1)
  })

  it('keeps SessionEnd async in the trust identity even though execution is synchronous', () => {
    const pluginRoot = tempRoot()
    writeFixturePlugin(pluginRoot, {
      SessionEnd: [
        {
          hooks: [
            {
              type: 'command',
              command: 'bun cleanup.ts',
              async: true,
            },
          ],
        },
      ],
    })
    const [asyncEntry] = collectPluginHookTrustEntries(pluginRoot, 'win32')

    writeFixturePlugin(pluginRoot, {
      SessionEnd: [
        {
          hooks: [
            {
              type: 'command',
              command: 'bun cleanup.ts',
              async: false,
            },
          ],
        },
      ],
    })
    const [syncEntry] = collectPluginHookTrustEntries(pluginRoot, 'win32')

    expect(asyncEntry?.trustedHash).not.toBe(syncEntry?.trustedHash)
  })
})

describe('trustPluginHooks', () => {
  it('runs as a Bun CLI against an isolated CODEX_HOME', () => {
    const pluginRoot = tempRoot()
    const codexRoot = tempRoot()
    const configPath = join(codexRoot, 'config.toml')
    writeFixturePlugin(pluginRoot, {
      SessionStart: [{ hooks: [{ type: 'command', command: 'bun first.ts' }] }],
    })

    const result = Bun.spawnSync({
      cmd: [process.execPath, join(import.meta.dir, 'trust-codex-hooks.ts')],
      cwd: pluginRoot,
      env: { ...process.env, CODEX_HOME: codexRoot, PLUGIN_ROOT: pluginRoot },
      stderr: 'pipe',
      stdout: 'pipe',
    })

    expect(result.exitCode, result.stderr.toString()).toBe(0)
    expect(result.stdout.toString()).toContain('Trusted 1 DevopsFlow hooks')
    expect(Object.keys(hookState(configPath))).toHaveLength(1)
  })

  it('writes every command hook fingerprint while preserving other config', () => {
    const pluginRoot = tempRoot()
    const codexRoot = tempRoot()
    const configPath = join(codexRoot, 'config.toml')
    writeFixturePlugin(pluginRoot, {
      SessionStart: [
        {
          hooks: [
            { type: 'command', command: 'bun first.ts' },
            {
              type: 'command',
              command: 'bun fallback.ts',
              commandWindows: 'bun windows.ts',
              timeout: 30,
            },
          ],
        },
      ],
      PreToolUse: [
        {
          matcher: 'shell_command|apply_patch',
          hooks: [{ type: 'command', command: 'bun guard.ts' }],
        },
      ],
    })
    writeFileSync(configPath, '# keep this comment\nmodel = "gpt-5.6"\n')

    const result = trustPluginHooks({
      configPath,
      platform: 'win32',
      pluginRoot,
    })

    const config = readFileSync(configPath, 'utf-8')
    const state = hookState(configPath)
    expect(result).toEqual({ status: 'updated', trusted: 3, unchanged: 0 })
    expect(config).toStartWith('# keep this comment\nmodel = "gpt-5.6"\n')
    expect(Object.keys(state).sort()).toEqual([
      'devopsflow@devopsflow:hooks/hooks.codex.json:pre_tool_use:0:0',
      'devopsflow@devopsflow:hooks/hooks.codex.json:session_start:0:0',
      'devopsflow@devopsflow:hooks/hooks.codex.json:session_start:0:1',
    ])
    expect(Object.values(state)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trusted_hash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
        }),
      ]),
    )
  })

  it('updates stale trust and leaves an already trusted config byte-for-byte unchanged', () => {
    const pluginRoot = tempRoot()
    const codexRoot = tempRoot()
    const configPath = join(codexRoot, 'config.toml')
    writeFixturePlugin(pluginRoot, {
      SessionStart: [{ hooks: [{ type: 'command', command: 'bun first.ts' }] }],
    })
    const [entry] = collectPluginHookTrustEntries(pluginRoot, 'win32')
    if (!entry) throw new Error('fixture must produce one trust entry')
    writeFileSync(
      configPath,
      [
        '# preserve surrounding config',
        `[hooks.state."${entry.key}"]`,
        'trusted_hash = "sha256:stale"',
        '',
        '[projects."C:\\\\workspace"]',
        'trust_level = "trusted"',
        '',
      ].join('\n'),
    )

    const updated = trustPluginHooks({
      configPath,
      platform: 'win32',
      pluginRoot,
    })
    const trustedContent = readFileSync(configPath, 'utf-8')
    const unchanged = trustPluginHooks({
      configPath,
      platform: 'win32',
      pluginRoot,
    })

    expect(updated).toEqual({ status: 'updated', trusted: 1, unchanged: 0 })
    expect(trustedContent).toContain('# preserve surrounding config')
    expect(trustedContent).toContain('[projects."C:\\\\workspace"]')
    expect(hookState(configPath)[entry.key]?.trusted_hash).toBe(entry.trustedHash)
    expect(unchanged).toEqual({
      status: 'already-trusted',
      trusted: 0,
      unchanged: 1,
    })
    expect(readFileSync(configPath, 'utf-8')).toBe(trustedContent)
  })

  it('does not overwrite invalid TOML', () => {
    const pluginRoot = tempRoot()
    const codexRoot = tempRoot()
    const configPath = join(codexRoot, 'config.toml')
    writeFixturePlugin(pluginRoot, {
      SessionStart: [{ hooks: [{ type: 'command', command: 'bun first.ts' }] }],
    })
    const invalidConfig = 'model = "unterminated'
    writeFileSync(configPath, invalidConfig)

    expect(() => trustPluginHooks({ configPath, pluginRoot, platform: 'win32' })).toThrow('Unable to parse Codex config')
    expect(readFileSync(configPath, 'utf-8')).toBe(invalidConfig)
    expect(existsSync(`${configPath}.tmp`)).toBe(false)
  })
})
