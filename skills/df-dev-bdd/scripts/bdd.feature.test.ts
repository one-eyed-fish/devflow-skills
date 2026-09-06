import { expect, test } from 'bun:test'
import { join } from 'node:path'
import { loadConfiguration, runCucumber } from '@cucumber/cucumber/api'

const directory = import.meta.dir

test('BDD contract validation feature', async () => {
  const { runConfiguration } = await loadConfiguration({
    file: false,
    provided: {
      paths: [join(directory, 'bdd.feature')],
      import: [join(directory, 'bdd.steps.ts')],
      format: ['progress'],
    },
  })
  const { success } = await runCucumber(runConfiguration)
  expect(success).toBe(true)
}, 60000)
