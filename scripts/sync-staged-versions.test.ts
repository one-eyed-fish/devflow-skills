import { afterEach, describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { agentTomlPaths, checkStagedVersionAlignment, syncStagedVersionAlignment } from './sync-staged-versions'

const AGENT_TOML_PATHS = [
  'agents/df-dev-backend-engineer.toml',
  'agents/df-dev-backend-test-engineer.toml',
  'agents/df-dev-database-steward.toml',
  'agents/df-doc-documentation-writer.toml',
  'agents/df-dev-frontend-engineer.toml',
  'agents/df-dev-frontend-test-engineer.toml',
  'agents/df-ops-artifact-manager.toml',
  'agents/df-ops-vcs-manager.toml',
] as const

const tempRoots: string[] = []

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

function git(root: string, ...args: string[]): string {
  const result = Bun.spawnSync({
    cmd: ['git', ...args],
    cwd: root,
    stderr: 'pipe',
    stdout: 'pipe',
  })
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
  return result.stdout.toString().trim()
}

function createRepository(): string {
  const root = mkdtempSync(join(tmpdir(), 'devopsflow-version-sync-'))
  tempRoots.push(root)

  writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '1.0.0' }))
  const pluginPath = join(root, '.codex-plugin', 'plugin.json')
  mkdirSync(dirname(pluginPath), { recursive: true })
  writeFileSync(pluginPath, JSON.stringify({ version: '1.0.0' }))
  const cursorPluginPath = join(root, '.cursor-plugin', 'plugin.json')
  mkdirSync(dirname(cursorPluginPath), { recursive: true })
  writeFileSync(cursorPluginPath, JSON.stringify({ version: '1.0.0' }))
  for (const path of AGENT_TOML_PATHS) {
    const absolutePath = join(root, path)
    mkdirSync(dirname(absolutePath), { recursive: true })
    writeFileSync(absolutePath, '# devopsflow-version = "1.0.0"\nname = "test-agent"\n')
  }

  git(root, 'init')
  git(root, 'config', 'user.email', 'test@example.com')
  git(root, 'config', 'user.name', 'Devopsflow Test')
  git(root, 'add', '.')
  git(root, 'commit', '--no-verify', '-m', 'test: baseline')
  return root
}

describe('staged release version synchronization', () => {
  it('manages every distributable subagent TOML', () => {
    const root = createRepository()

    expect(new Set(agentTomlPaths(root))).toEqual(new Set(AGENT_TOML_PATHS))
  })

  it('rejects staged release versions that are not aligned', () => {
    const root = createRepository()
    writeFileSync(join(root, '.codex-plugin', 'plugin.json'), JSON.stringify({ version: '2.0.0' }))
    git(root, 'add', '.codex-plugin/plugin.json')

    expect(() => checkStagedVersionAlignment(root)).toThrow('Version mismatch: package.json=1.0.0, .codex-plugin/plugin.json=2.0.0')
  })

  it('syncs plugin and agent versions from the staged package version', () => {
    const root = createRepository()
    writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '2.0.0' }))
    git(root, 'add', 'package.json')

    const result = syncStagedVersionAlignment(root)

    expect(result.version).toBe('2.0.0')
    expect(new Set(result.paths)).toEqual(new Set(['.codex-plugin/plugin.json', '.cursor-plugin/plugin.json', ...AGENT_TOML_PATHS]))
    expect(JSON.parse(git(root, 'show', ':.codex-plugin/plugin.json')).version).toBe('2.0.0')
    expect(JSON.parse(git(root, 'show', ':.cursor-plugin/plugin.json')).version).toBe('2.0.0')
    for (const path of AGENT_TOML_PATHS) {
      expect(git(root, 'show', `:${path}`)).toContain('# devopsflow-version = "2.0.0"')
    }
    expect(checkStagedVersionAlignment(root)).toEqual({ version: '2.0.0' })
  })

  it('preserves unstaged release metadata while synchronizing the Git index', () => {
    const root = createRepository()
    writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '2.0.0' }))
    git(root, 'add', 'package.json')
    const pluginPath = join(root, '.codex-plugin', 'plugin.json')
    writeFileSync(pluginPath, JSON.stringify({ version: '1.0.0', note: 'keep unstaged' }))
    const agentPath = AGENT_TOML_PATHS[0]
    writeFileSync(join(root, agentPath), '# devopsflow-version = "1.0.0"\nname = "unstaged-agent"\n')

    syncStagedVersionAlignment(root)

    expect(JSON.parse(readFileSync(pluginPath, 'utf-8'))).toEqual({ version: '1.0.0', note: 'keep unstaged' })
    expect(JSON.parse(git(root, 'show', ':.codex-plugin/plugin.json'))).toEqual({ version: '2.0.0' })
    expect(readFileSync(join(root, agentPath), 'utf-8')).toContain('name = "unstaged-agent"')
    expect(git(root, 'show', `:${agentPath}`)).toBe('# devopsflow-version = "2.0.0"\nname = "test-agent"')
  })
})
