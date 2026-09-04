#!/usr/bin/env bun
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { dependencyFinding, emit, type Finding, parseOptions, readText, runTool } from './common'

export function scanMaven(root: string): Finding[] {
  if (!existsSync(join(root, 'pom.xml'))) return []
  const text = readText(root, 'pom.xml')
  const duplicateTags = (text.match(/<groupId>/g) ?? []).length !== new Set(text.match(/<artifactId>([^<]+)/g) ?? []).size
  return duplicateTags
    ? [
        dependencyFinding({
          ecosystem: 'maven',
          file: 'pom.xml',
          dependency: 'dependency declarations',
          type: 'duplicate-review',
          evidence: 'repeated artifact declarations require dependency:tree and effective-pom confirmation',
          action: 'run mvn dependency:analyze and inspect profiles before editing',
          autoFixable: false,
        }),
      ]
    : []
}

async function main(): Promise<number> {
  const options = parseOptions(Bun.argv.slice(2))
  const findings = scanMaven(options.root)
  const wrapper = existsSync(join(options.root, 'mvnw.cmd')) ? 'mvnw.cmd' : existsSync(join(options.root, 'mvnw')) ? 'mvnw' : 'mvn'
  let toolFailed = false
  if (existsSync(join(options.root, 'pom.xml'))) {
    const result = runTool(wrapper, ['dependency:analyze', '-q'], options.root)
    toolFailed = !result.available || result.exitCode !== 0
    if (toolFailed)
      findings.push(
        dependencyFinding({
          ecosystem: 'maven',
          file: 'pom.xml',
          dependency: 'Maven',
          type: 'tool-failed',
          evidence: 'dependency:analyze did not complete successfully',
          risk: 'blocking',
          action: 'run dependency:analyze in the supported Java environment',
          autoFixable: false,
        }),
      )
  }
  if (options.fix && !options.dryRun) console.error('Maven --fix is gated: verify dependency:analyze and mvn verify before editing')
  const exitCode = emit(findings, options.format)
  return toolFailed ? 2 : exitCode
}
// Stryker disable next-line ConditionalExpression -- import.meta.main is an untestable runtime loader boundary
if (import.meta.main) process.exit(await main())
