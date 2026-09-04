import { availableParallelism } from 'node:os'
import type { PartialStrykerOptions } from '@stryker-mutator/api/core'

export const resolveStrykerConcurrency = (parallelism: number, configuredConcurrency?: string): number => {
  const override = Number.parseInt(configuredConcurrency ?? '', 10)

  return Number.isSafeInteger(override) && override > 0 ? override : Math.min(8, Math.max(2, Math.floor(parallelism / 2)))
}

const config = {
  mutate: ['scripts/**/*.ts', '!scripts/**/*.test.ts', 'skills/**/scripts/**/*.ts', '!skills/**/scripts/**/*.test.ts'],
  ignorePatterns: ['**/generated/**', '**/vendor/**', '**/dist/**', '**/build/**'],
  testRunner: 'command',
  commandRunner: {
    command: 'bun test',
  },
  coverageAnalysis: 'off',
  reporters: ['clear-text', 'progress', 'html', 'json'],
  htmlReporter: {
    fileName: 'reports/mutation/index.html',
  },
  jsonReporter: {
    fileName: 'reports/mutation/mutation.json',
  },
  concurrency: resolveStrykerConcurrency(availableParallelism(), process.env.STRYKER_CONCURRENCY),
  timeoutMS: 60_000,
  timeoutFactor: 2,
  // Bun executes TypeScript directly. Pointing at an absent file avoids Stryker's
  // incompatible TypeScript 7 compiler-API rewrite while preserving tsconfig.json in sandboxes.
  tsconfigFile: '.stryker-no-tsconfig.json',
  thresholds: {
    high: 100,
    low: 100,
    break: 100,
  },
  tempDirName: '.stryker-tmp',
  cleanTempDir: true,
} satisfies PartialStrykerOptions

export default config
