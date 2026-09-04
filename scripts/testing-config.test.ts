import { describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { availableParallelism } from 'node:os'
import path from 'node:path'

const repositoryRoot = path.resolve(import.meta.dir, '..')

const readRepositoryFile = async (fileName: string): Promise<string> => readFile(path.join(repositoryRoot, fileName), 'utf8')

describe('repository testing configuration', () => {
  test('keeps generated coverage and mutation artifacts local', async () => {
    const gitignore = await readRepositoryFile('.gitignore')

    expect(gitignore.split(/\r?\n/u)).toEqual(expect.arrayContaining(['coverage/', 'reports/mutation/', '.stryker-tmp/']))
  })

  test('configures Bun coverage without excluding repository scripts', async () => {
    const bunfig = await readRepositoryFile('bunfig.toml')

    expect(bunfig).toContain('[test]')
    expect(bunfig).toContain('coverage = true')
    expect(bunfig).toContain('coverageReporter = ["text", "lcov"]')
    expect(bunfig).toContain('coverageDir = "coverage"')
    expect(bunfig).toContain('coverageSkipTestFiles = true')
    expect(bunfig).toContain('"**/*.test.ts"')
    expect(bunfig).toContain('"**/generated/**"')
    expect(bunfig).toContain('"**/vendor/**"')
    expect(bunfig).toContain('"**/dist/**"')
    expect(bunfig).not.toContain('"scripts/**"')
    expect(bunfig).not.toContain('"skills/**/scripts/**"')
  })

  test('exposes explicit coverage and mutation package commands', async () => {
    const packageJson = JSON.parse(await readRepositoryFile('package.json')) as {
      scripts: Record<string, string>
    }

    expect(packageJson.scripts.test).toBe('bun test')
    expect(packageJson.scripts['test:coverage']).toBe('bun test --coverage')
    expect(packageJson.scripts['test:mutation']).toBe('stryker run stryker.config.ts')
  })

  test('mutates every repository-owned non-test TypeScript script', async () => {
    const { default: config, resolveStrykerConcurrency } = await import('../stryker.config')

    expect(config.mutate).toEqual(['scripts/**/*.ts', '!scripts/**/*.test.ts', 'skills/**/scripts/**/*.ts', '!skills/**/scripts/**/*.test.ts'])
    expect(config.ignorePatterns).toEqual(['**/generated/**', '**/vendor/**', '**/dist/**', '**/build/**'])
    expect(config.testRunner).toBe('command')
    expect(config.commandRunner).toEqual({ command: 'bun test' })
    expect(config.coverageAnalysis).toBe('off')
    expect(config.reporters).toEqual(['clear-text', 'progress', 'html', 'json'])
    expect(config.htmlReporter).toEqual({ fileName: 'reports/mutation/index.html' })
    expect(config.jsonReporter).toEqual({ fileName: 'reports/mutation/mutation.json' })
    expect(resolveStrykerConcurrency(24)).toBe(8)
    expect(resolveStrykerConcurrency(8)).toBe(4)
    expect(resolveStrykerConcurrency(2)).toBe(2)
    expect(resolveStrykerConcurrency(24, '12')).toBe(12)
    expect(resolveStrykerConcurrency(24, '0')).toBe(8)
    expect(resolveStrykerConcurrency(24, 'invalid')).toBe(8)
    expect(config.concurrency).toBe(resolveStrykerConcurrency(availableParallelism(), process.env.STRYKER_CONCURRENCY))
    expect(config.timeoutMS).toBe(60_000)
    expect(config.timeoutFactor).toBe(2)
    expect(config.tsconfigFile).toBe('.stryker-no-tsconfig.json')
    expect(config.thresholds).toEqual({ high: 100, low: 100, break: 100 })
  })
})
