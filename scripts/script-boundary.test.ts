import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

// biome-ignore lint/style/noNonNullAssertion: import.meta.dir is always defined at runtime
const ROOT = join(import.meta.dir!, '..')
const SCRIPTS_DIRECTORY = join(ROOT, 'scripts')
const EXCLUDED_DIRECTORIES = new Set(['.git', '.stryker-tmp', 'coverage', 'node_modules', 'reports', 'scripts'])
const TEXT_EXTENSIONS = new Set(['', '.json', '.md', '.toml', '.ts', '.yml', '.yaml'])

function collectFiles(directory: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(directory)) {
    if (EXCLUDED_DIRECTORIES.has(entry)) continue
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) {
      files.push(...collectFiles(path))
    } else {
      files.push(path)
    }
  }
  return files
}

describe('repository scripts boundary', () => {
  it('exposes every repository script through package.json', () => {
    const packageJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')) as { scripts?: Record<string, string> }
    const packageCommands = Object.values(packageJson.scripts ?? {}).join('\n')
    const repositoryScripts = readdirSync(SCRIPTS_DIRECTORY).filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))

    for (const script of repositoryScripts) {
      const scriptPath = ['scripts', script].join('/')
      expect(packageCommands, scriptPath).toContain(scriptPath)
    }
    expect(packageJson.scripts?.['test:repository-scripts']).toBe('bun test scripts/')
  })

  it('keeps direct implementation paths out of repository consumers', () => {
    const implementationPaths = readdirSync(SCRIPTS_DIRECTORY)
      .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
      .map((file) => ['scripts', file].join('/'))

    for (const file of collectFiles(ROOT)) {
      if (!TEXT_EXTENSIONS.has(extname(file))) continue
      const projectPath = relative(ROOT, file).replaceAll('\\', '/')
      if (projectPath === 'package.json' || projectPath.startsWith('.husky/') || projectPath.startsWith('.devopsflow/checkpoints/')) {
        continue
      }
      const content = readFileSync(file, 'utf-8')
      for (const implementationPath of implementationPaths) {
        expect(content, `${projectPath}: ${implementationPath}`).not.toContain(implementationPath)
      }
    }
  })

  it('routes Husky through package scripts', () => {
    const huskyHook = readFileSync(join(ROOT, '.husky', 'pre-commit'), 'utf-8')
    expect(huskyHook).toContain('bun run check:skill-eof')
    expect(huskyHook).not.toMatch(/bun\s+scripts\//)
  })
})
