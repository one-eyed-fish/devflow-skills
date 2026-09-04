import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

// biome-ignore lint/style/noNonNullAssertion: import.meta.dir is always defined at runtime
const ROOT = join(import.meta.dir!, '..')
const EXCLUDED_DIRECTORIES = new Set(['.codex', '.git', '.stryker-tmp', 'coverage', 'node_modules', 'reports'])
const TEXT_EXTENSIONS = new Set(['', '.json', '.md', '.toml', '.ts', '.yml', '.yaml'])

const legacyExtension = ['.', 'py'].join('')
const legacyStubExtension = [legacyExtension, 'i'].join('')
const legacyCacheDirectory = ['__', 'pycache', '__'].join('')
const legacyEditorGlob = ['[*.', 'py', ']'].join('')
const legacyManifestNames = new Set(['pyproject.toml', 'requirements.txt', 'Pipfile', 'Pipfile.lock', 'poetry.lock', 'uv.lock'])
const legacyScriptNames = [
  ['validate', '_ddd', '_design', legacyExtension].join(''),
  ['validate', '_tdd', '_protocol', legacyExtension].join(''),
  ['run', '_protocol', '_examples', legacyExtension].join(''),
]

function collectRepositoryFiles(directory: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(directory)) {
    if (EXCLUDED_DIRECTORIES.has(entry)) continue
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) {
      expect(entry, relative(ROOT, path)).not.toBe(legacyCacheDirectory)
      files.push(...collectRepositoryFiles(path))
    } else {
      files.push(path)
    }
  }
  return files
}

describe('Bun and TypeScript runtime migration', () => {
  it('contains no repository-owned Python runtime files or manifests', () => {
    for (const file of collectRepositoryFiles(ROOT)) {
      const projectPath = relative(ROOT, file).replaceAll('\\', '/')
      expect(projectPath, projectPath).not.toEndWith(legacyExtension)
      expect(projectPath, projectPath).not.toEndWith(legacyStubExtension)
      expect(legacyManifestNames.has(projectPath.split('/').at(-1) ?? ''), projectPath).toBeFalse()
    }
  })

  it('contains no legacy repository script references or Python-only config', () => {
    for (const file of collectRepositoryFiles(ROOT)) {
      if (!TEXT_EXTENSIONS.has(extname(file))) continue
      const projectPath = relative(ROOT, file).replaceAll('\\', '/')
      const content = readFileSync(file, 'utf-8')
      for (const legacyScriptName of legacyScriptNames) {
        expect(content, projectPath).not.toContain(legacyScriptName)
      }
      expect(content, projectPath).not.toContain(legacyEditorGlob)
      expect(content, projectPath).not.toContain(legacyCacheDirectory)
    }
  })

  it('documents Bun commands for repository validators', () => {
    const dddSkill = readFileSync(join(ROOT, 'skills', 'df-ddd-event-storming-design', 'SKILL.md'), 'utf-8')
    const tddSkill = readFileSync(join(ROOT, 'skills', 'df-dev-tdd', 'SKILL.md'), 'utf-8')
    const hookProtocol = readFileSync(join(ROOT, 'skills', 'df-dev-tdd', 'references', 'hook-protocol.md'), 'utf-8')

    expect(dddSkill).toContain('bun "<SKILL_INSTALL_ROOT>/scripts/validate-ddd-design.ts"')
    expect(tddSkill).toContain('install 后 skill 根 directory 中的 `validate-tdd-protocol.ts`')
    expect(hookProtocol).toContain('bun "<SKILL_INSTALL_ROOT>/scripts/validate-tdd-protocol.ts"')
  })

  it('uses the local Biome schema and includes agent integration directories', () => {
    const biome = JSON.parse(readFileSync(join(ROOT, 'biome.json'), 'utf-8')) as { $schema?: string; files?: { includes?: string[] } }

    expect(biome.$schema).toBe('./node_modules/@biomejs/biome/configuration_schema.json')
    expect(biome.files?.includes).toEqual(expect.arrayContaining(['**', '.agents/**', '.opencode/**']))
  })
})
