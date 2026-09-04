#!/usr/bin/env bun
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { dependencyFinding, emit, type Finding, parseOptions, readText, runTool } from './common'

export function scanGradle(root: string): Finding[] {
  const wrapper = existsSync(join(root, 'gradlew.bat')) || existsSync(join(root, 'gradlew'))
  if (!wrapper) return []
  const files = ['build.gradle', 'build.gradle.kts', 'settings.gradle', 'settings.gradle.kts']
  const findings: Finding[] = []
  for (const file of files) {
    const text = readText(root, file)
    if (text.includes('implementation("'))
      findings.push(
        dependencyFinding({
          ecosystem: 'gradle',
          file,
          dependency: 'implementation declarations',
          type: 'review',
          evidence: 'direct declarations require dependencyInsight and source-set confirmation',
          risk: 'suggestion',
          action: 'run wrapper dependencyInsight before changing the declaration',
          autoFixable: false,
        }),
      )
  }
  return findings
}

async function main(): Promise<number> {
  const options = parseOptions(Bun.argv.slice(2))
  const findings = scanGradle(options.root)
  const wrapper = existsSync(join(options.root, 'gradlew.bat')) ? 'gradlew.bat' : 'gradlew'
  let toolFailed = false
  if (existsSync(join(options.root, wrapper))) {
    const result = runTool(wrapper, ['dependencies'], options.root)
    toolFailed = !result.available || result.exitCode !== 0
    if (toolFailed)
      findings.push(
        dependencyFinding({
          ecosystem: 'gradle',
          file: wrapper,
          dependency: 'Gradle wrapper',
          type: 'tool-failed',
          evidence: 'Gradle dependencies task did not complete successfully',
          risk: 'blocking',
          action: 'repair the wrapper or run it in the supported environment',
          autoFixable: false,
        }),
      )
  }
  if (options.fix && !options.dryRun)
    console.error('Gradle --fix is gated: verify each candidate with dependencyInsight and the project test task before editing')
  const exitCode = emit(findings, options.format)
  return toolFailed ? 2 : exitCode
}
// Stryker disable next-line ConditionalExpression -- import.meta.main is an untestable runtime loader boundary
if (import.meta.main) process.exit(await main())
