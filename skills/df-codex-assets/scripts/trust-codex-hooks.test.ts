import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import {
  appendStateSection,
  canonicalize,
  collectPluginHookTrustEntries,
  commandHookHash,
  configuredHookStates,
  defaultCodexConfigPath,
  defaultPluginRoot,
  existingTrustedHash,
  isRecord,
  normalizedCommandHook,
  normalizedTimeout,
  parseConfig,
  pluginRelativePath,
  readJsonRecord,
  runCli,
  runCliIfMain,
  trustPluginHooks,
  updateExistingSection,
  writeConfigAtomically,
} from './trust-codex-hooks'

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
    fingerprint: 'sha256:00d152d28e49d452a162bada1b877dbcb8939cfa7688dbe5072946685337a8ba',
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
    const logPath = join(pluginRoot, '.logs', readdirSync(join(pluginRoot, '.logs'))[0] ?? '')
    const logEntries = readFileSync(logPath, 'utf-8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as Record<string, unknown>)
    expect(logEntries.map(({ script }) => script)).toEqual(['trust-codex-hooks', 'trust-codex-hooks', 'trust-codex-hooks'])
    expect(logEntries.map(({ event }) => event)).toEqual(['script.start', 'script.output', 'script.finish'])
  })

  it('prints the exact already-trusted CLI result', () => {
    const pluginRoot = tempRoot()
    const codexRoot = tempRoot()
    writeFixturePlugin(pluginRoot, {
      SessionStart: [{ hooks: [{ type: 'command', command: 'bun first.ts' }] }],
    })
    const previousCodexHome = process.env.CODEX_HOME
    const previousPluginRoot = process.env.PLUGIN_ROOT
    process.env.CODEX_HOME = codexRoot
    process.env.PLUGIN_ROOT = pluginRoot
    const originalLog = console.log
    const messages: string[] = []
    console.log = (message?: unknown) => messages.push(String(message))
    expect(runCliIfMain(false)).toBeUndefined()
    try {
      expect(runCli()).toBe(0)
      expect(runCli()).toBe(0)
      expect(runCliIfMain(true)).toBe(0)
    } finally {
      console.log = originalLog
      if (previousCodexHome === undefined) delete process.env.CODEX_HOME
      else process.env.CODEX_HOME = previousCodexHome
      if (previousPluginRoot === undefined) delete process.env.PLUGIN_ROOT
      else process.env.PLUGIN_ROOT = previousPluginRoot
    }
    expect(messages).toEqual([
      'Trusted 1 DevopsFlow hooks; 0 were already trusted.',
      'All 1 DevopsFlow hooks are already trusted.',
      'All 1 DevopsFlow hooks are already trusted.',
    ])
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
    const expectedWindowsEntries = collectPluginHookTrustEntries(pluginRoot, 'win32')
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
    for (const entry of expectedWindowsEntries) {
      expect(state[entry.key]?.trusted_hash).toBe(entry.trustedHash)
    }
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

describe('hook trust normalization boundaries', () => {
  it('recognizes records and canonicalizes nested arrays and object keys', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord(null)).toBe(false)
    expect(isRecord([])).toBe(false)
    expect(isRecord('value')).toBe(false)
    expect(JSON.stringify(canonicalize({ z: [{ y: 2, x: 1 }], a: true }))).toBe('{"a":true,"z":[{"x":1,"y":2}]}')
    expect(JSON.stringify(canonicalize([{ z: 2, a: 1 }]))).toBe('[{"a":1,"z":2}]')
    expect(canonicalize('unchanged')).toBe('unchanged')
  })

  it('normalizes ordinary and SessionEnd timeout boundaries', () => {
    expect(normalizedTimeout('pre_tool_use')).toBe(600)
    expect(normalizedTimeout('pre_tool_use', 0)).toBe(1)
    expect(normalizedTimeout('pre_tool_use', 19)).toBe(19)
    expect(normalizedTimeout('session_end')).toBe(1)
    expect(normalizedTimeout('session_end', 0)).toBe(1)
    expect(normalizedTimeout('session_end', 2)).toBe(2)
    expect(normalizedTimeout('session_end', 9)).toBe(3)
  })

  it('normalizes command platform, optional fields, and blank commands exactly', () => {
    const handler = {
      type: 'command' as const,
      command: 'bun unix.ts',
      commandWindows: 'bun windows.ts',
      timeout: 12,
      async: true,
      statusMessage: 'Checking',
      additionalContextLimit: 123,
    }
    expect(normalizedCommandHook('pre_tool_use', handler, 'win32')).toEqual({
      type: 'command',
      command: 'bun windows.ts',
      timeout: 12,
      async: true,
      statusMessage: 'Checking',
      additionalContextLimit: 123,
    })
    expect(normalizedCommandHook('stop', handler, 'linux')).toEqual({
      type: 'command',
      command: 'bun unix.ts',
      timeout: 12,
      async: true,
      statusMessage: 'Checking',
    })
    const defaults = normalizedCommandHook('pre_tool_use', { type: 'command', command: 'bun x.ts' }, 'linux')
    expect(defaults).toEqual({
      type: 'command',
      command: 'bun x.ts',
      timeout: 600,
      async: false,
    })
    expect(Object.keys(defaults ?? {})).toEqual(['type', 'command', 'timeout', 'async'])
    expect(normalizedCommandHook('pre_tool_use', { type: 'command', command: '   ' }, 'linux')).toBeUndefined()
  })

  it('includes matcher and additional context only for the supported events', () => {
    const matcherEvents = [
      'pre_tool_use',
      'permission_request',
      'post_tool_use',
      'pre_compact',
      'post_compact',
      'session_start',
      'session_end',
      'subagent_start',
      'subagent_stop',
    ] as const
    for (const event of matcherEvents) {
      const withMatcher = commandHookHash(event, { matcher: 'shell', hooks: [] }, { type: 'command', command: 'bun x.ts' }, 'linux')
      const withoutMatcher = commandHookHash(event, { hooks: [] }, { type: 'command', command: 'bun x.ts' }, 'linux')
      expect(withMatcher, event).not.toBe(withoutMatcher)
    }
    for (const event of ['stop', 'user_prompt_submit'] as const) {
      const withMatcher = commandHookHash(event, { matcher: 'shell', hooks: [] }, { type: 'command', command: 'bun x.ts' }, 'linux')
      const withoutMatcher = commandHookHash(event, { hooks: [] }, { type: 'command', command: 'bun x.ts' }, 'linux')
      expect(withMatcher, event).toBe(withoutMatcher)
    }

    for (const event of ['pre_tool_use', 'post_tool_use', 'session_start', 'user_prompt_submit', 'subagent_start'] as const) {
      expect(normalizedCommandHook(event, { type: 'command', command: 'bun x.ts', additionalContextLimit: 123 }, 'linux')).toHaveProperty(
        'additionalContextLimit',
        123,
      )
    }
    const withoutAdditionalContext = normalizedCommandHook('session_end', { type: 'command', command: 'bun x.ts', additionalContextLimit: 123 }, 'linux')
    expect(withoutAdditionalContext).not.toHaveProperty('additionalContextLimit')
    expect(Object.keys(withoutAdditionalContext ?? {})).not.toContain('additionalContextLimit')
    expect(normalizedCommandHook('pre_tool_use', { type: 'command', command: 'bun x.ts', additionalContextLimit: 2_500 }, 'linux')).not.toHaveProperty(
      'additionalContextLimit',
    )
    expect(commandHookHash('pre_tool_use', { hooks: [] }, { type: 'command', command: ' ' }, 'linux')).toBeUndefined()
  })
})

describe('hook manifest validation boundaries', () => {
  it('reads JSON objects and rejects malformed or non-object JSON exactly', () => {
    const root = tempRoot()
    const path = join(root, 'value.json')
    writeFileSync(path, '{"ok":true}')
    expect(readJsonRecord(path)).toEqual({ ok: true })
    writeFileSync(path, '[]')
    expect(() => readJsonRecord(path)).toThrow(`Expected a JSON object in ${path}`)
    writeFileSync(path, '{')
    expect(() => readJsonRecord(path)).toThrow(`Unable to parse JSON ${path}:`)
  })

  it('rejects plugin and marketplace manifest shape errors', () => {
    const root = tempRoot()
    writeFile(root, '.codex-plugin/plugin.json', JSON.stringify({ name: 1, hooks: './hooks.json' }))
    writeFile(root, '.codex-plugin/marketplace.json', JSON.stringify({ name: 'market' }))
    expect(() => collectPluginHookTrustEntries(root)).toThrow('plugin.json must define string name and hooks fields')

    writeFile(root, '.codex-plugin/plugin.json', JSON.stringify({ name: 'plugin', hooks: 1 }))
    expect(() => collectPluginHookTrustEntries(root)).toThrow('plugin.json must define string name and hooks fields')

    writeFile(root, '.codex-plugin/plugin.json', JSON.stringify({ name: 'plugin', hooks: './hooks.json' }))
    writeFile(root, '.codex-plugin/marketplace.json', JSON.stringify({ name: 1 }))
    expect(() => collectPluginHookTrustEntries(root)).toThrow('marketplace.json must define a string name field')
  })

  it('keeps hook paths inside the plugin root', () => {
    const root = tempRoot()
    expect(pluginRelativePath(root, 'hooks/file.json')).toBe('hooks/file.json')
    expect(pluginRelativePath(root, 'hooks\\file.json')).toBe('hooks/file.json')
    expect(() => pluginRelativePath(root, '.')).toThrow('Plugin hook path must stay within plugin root: .')
    expect(() => pluginRelativePath(root, '..')).toThrow('Plugin hook path must stay within plugin root: ..')
    expect(() => pluginRelativePath(root, '../outside/file.json')).toThrow('Plugin hook path must stay within plugin root: ../outside/file.json')
  })

  it('rejects malformed hook manifests, groups, and handlers and skips unsupported handlers', () => {
    const root = tempRoot()
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ hooks: [] }, 'must define a hooks object'],
      [{ hooks: { Unknown: [] } }, 'Unsupported Codex hook event: Unknown'],
      [{ hooks: { Stop: {} } }, 'Codex hook event Stop must contain matcher groups'],
      [{ hooks: { Stop: [null] } }, 'Stop matcher group 0 is invalid'],
      [{ hooks: { Stop: [{ hooks: {} }] } }, 'Stop matcher group 0 is invalid'],
      [{ hooks: { Stop: [{ hooks: [null] }] } }, 'Stop hook 0:0 is invalid'],
      [{ hooks: { Stop: [{ hooks: [{}] }] } }, 'Stop hook 0:0 is invalid'],
      [{ hooks: { Stop: [{ hooks: [{ type: 'command' }] }] } }, 'Stop hook 0:0 is not a valid command hook'],
      [{ hooks: { Stop: [{ hooks: [{ type: 'other', command: 'bun x.ts' }] }] } }, 'Stop hook 0:0 is not a valid command hook'],
    ]
    for (const [manifest, message] of cases) {
      writeFile(root, '.codex-plugin/plugin.json', JSON.stringify({ name: 'plugin', hooks: './hooks.json' }))
      writeFile(root, '.codex-plugin/marketplace.json', JSON.stringify({ name: 'market' }))
      writeFile(root, 'hooks.json', JSON.stringify(manifest))
      expect(() => collectPluginHookTrustEntries(root), message).toThrow(message)
    }

    writeFixturePlugin(root, {
      Stop: [{ hooks: [{ type: 'prompt' }, { type: 'agent' }, { type: 'command', command: ' ' }, { type: 'command', command: 'bun ok.ts' }] }],
    })
    expect(collectPluginHookTrustEntries(root)).toHaveLength(1)
  })
})

describe('Codex config text boundaries', () => {
  it('validates parsed hook state table shapes', () => {
    expect(parseConfig('', 'config.toml')).toEqual({})
    expect(() => parseConfig('value = [', 'config.toml')).toThrow('Unable to parse Codex config config.toml:')
    expect(configuredHookStates({})).toEqual({})
    expect(configuredHookStates({ hooks: {} })).toEqual({})
    expect(configuredHookStates({ hooks: { state: { key: { trusted_hash: 'hash' } } } })).toEqual({ key: { trusted_hash: 'hash' } })
    expect(() => configuredHookStates({ hooks: [] })).toThrow('Codex config hooks must be a table')
    expect(() => configuredHookStates({ hooks: { state: [] } })).toThrow('Codex config hooks.state must be a table')
    expect(existingTrustedHash({ trusted_hash: 'hash' })).toBe('hash')
    expect(existingTrustedHash({ trusted_hash: 1 })).toBeUndefined()
    expect(existingTrustedHash(null)).toBeUndefined()
  })

  it('updates only the targeted section and preserves CRLF and neighboring hashes', () => {
    const key = 'target'
    const content = [
      '# header',
      '  [hooks.state."target"]',
      'other = true',
      '  trusted_hash   = "old"',
      '   [hooks.state."next"]',
      'trusted_hash = "next-hash"',
      '',
    ].join('\r\n')
    expect(updateExistingSection(content, key, 'new-hash')).toBe(
      ['# header', '  [hooks.state."target"]', 'other = true', 'trusted_hash = "new-hash"', '   [hooks.state."next"]', 'trusted_hash = "next-hash"', ''].join(
        '\r\n',
      ),
    )
    expect(() => updateExistingSection('name = "x"', key, 'hash')).toThrow('Unable to locate existing Codex hook state section: target')
  })

  it('inserts missing hashes and appends sections with exact spacing', () => {
    expect(updateExistingSection('[hooks.state."target"]\ntrusted_hash = "old"\n', 'target', 'hash')).toBe('[hooks.state."target"]\ntrusted_hash = "hash"\n')
    expect(updateExistingSection('[hooks.state."target"]\nprefix trusted_hash = "decoy"\n', 'target', 'hash')).toBe(
      '[hooks.state."target"]\ntrusted_hash = "hash"\nprefix trusted_hash = "decoy"\n',
    )
    expect(updateExistingSection('[hooks.state."target"]\n   [hooks.state."next"]\ntrusted_hash = "next"\n', 'target', 'hash')).toBe(
      '[hooks.state."target"]\ntrusted_hash = "hash"\n   [hooks.state."next"]\ntrusted_hash = "next"\n',
    )
    expect(updateExistingSection('[hooks.state."target"]\nvalue = true\n[hooks.state."next"]\ntrusted_hash = "next"\n', 'target', 'hash')).toBe(
      '[hooks.state."target"]\ntrusted_hash = "hash"\nvalue = true\n[hooks.state."next"]\ntrusted_hash = "next"\n',
    )
    expect(updateExistingSection('[hooks.state."target"]\nvalue = true\n', 'target', 'hash')).toBe(
      '[hooks.state."target"]\ntrusted_hash = "hash"\nvalue = true\n',
    )
    expect(appendStateSection('', 'key', 'hash')).toBe('[hooks.state."key"]\ntrusted_hash = "hash"\n')
    expect(appendStateSection('model = "x"', 'key', 'hash')).toBe('model = "x"\n\n[hooks.state."key"]\ntrusted_hash = "hash"\n')
    expect(appendStateSection('model = "x"\n', 'key', 'hash')).toBe('model = "x"\n\n[hooks.state."key"]\ntrusted_hash = "hash"\n')
    expect(appendStateSection('model = "x"\n\n', 'key', 'hash')).toBe('model = "x"\n\n[hooks.state."key"]\ntrusted_hash = "hash"\n')
    expect(appendStateSection('model = "x"\r\n', 'key', 'hash')).toBe('model = "x"\r\n\r\n[hooks.state."key"]\r\ntrusted_hash = "hash"\r\n')
  })

  it('writes new and existing configs atomically and detects concurrent changes', () => {
    const root = tempRoot()
    const newPath = join(root, 'nested', 'config.toml')
    writeConfigAtomically(newPath, undefined, 'new = true\n')
    expect(readFileSync(newPath, 'utf-8')).toBe('new = true\n')
    expect(statSync(newPath).mode & 0o777).toBe(0o600)

    const existingPath = join(root, 'existing.toml')
    writeFileSync(existingPath, 'old = true\n', { mode: 0o640 })
    writeConfigAtomically(existingPath, 'old = true\n', 'new = true\n')
    expect(readFileSync(existingPath, 'utf-8')).toBe('new = true\n')
    expect(statSync(existingPath).mode & 0o777).toBe(0o640)

    writeFileSync(existingPath, 'stable = true\n')
    expect(() =>
      writeConfigAtomically(existingPath, 'stable = true\n', 'replacement = true\n', () => {
        writeFileSync(existingPath, 'concurrent = true\n')
      }),
    ).toThrow('Codex config changed while trust entries were being prepared')
    expect(readFileSync(existingPath, 'utf-8')).toBe('concurrent = true\n')
    expect(readdirSync(root).some((name) => name.endsWith('.tmp'))).toBe(false)
  })

  it('uses CODEX_HOME for the default config path and reports CLI errors', () => {
    const previousCodexHome = process.env.CODEX_HOME
    const previousPluginRoot = process.env.PLUGIN_ROOT
    const root = tempRoot()
    delete process.env.CODEX_HOME
    expect(defaultCodexConfigPath()).toBe(join(homedir(), '.codex', 'config.toml'))
    expect(defaultPluginRoot()).toBe(resolve(import.meta.dir, '../../..'))
    process.env.CODEX_HOME = root
    process.env.PLUGIN_ROOT = join(root, 'missing-plugin')
    try {
      expect(defaultCodexConfigPath()).toBe(join(root, 'config.toml'))
      const originalError = console.error
      const errors: string[] = []
      console.error = (message?: unknown) => errors.push(String(message))
      try {
        expect(runCli()).toBe(1)
      } finally {
        console.error = originalError
      }
      expect(errors).toHaveLength(1)
      expect(errors[0]).toContain('Unable to parse JSON')
    } finally {
      if (previousCodexHome === undefined) delete process.env.CODEX_HOME
      else process.env.CODEX_HOME = previousCodexHome
      if (previousPluginRoot === undefined) delete process.env.PLUGIN_ROOT
      else process.env.PLUGIN_ROOT = previousPluginRoot
    }
  })
})
