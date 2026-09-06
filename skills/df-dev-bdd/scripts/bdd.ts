#!/usr/bin/env bun

import { readFileSync } from 'node:fs'

export type BddStepKeyword = 'Given' | 'When' | 'Then'

export interface BddStep {
  readonly keyword: BddStepKeyword | undefined
  readonly text: string
  readonly line: number
}

export interface BddScenario {
  readonly name: string
  readonly line: number
  readonly requirementTags: readonly string[]
  readonly effectiveRequirementTags: readonly string[]
  readonly steps: readonly BddStep[]
}

export interface BddFeature {
  readonly name: string
  readonly line: number
  readonly requirementTags: readonly string[]
  readonly narrative: readonly string[]
}

export interface BddFeatureDocument {
  readonly feature: BddFeature | undefined
  readonly featureCount: number
  readonly scenarios: readonly BddScenario[]
}

const REQUIREMENT_TAG = /^@req-[a-z0-9][a-z0-9_-]*$/i
const TAG_LINE = /^(?:@[\w-]+\s*)+$/
const FEATURE_LINE = /^Feature:\s*(.*)$/i
const SCENARIO_LINE = /^Scenario(?: Outline)?:\s*(.*)$/i
const STEP_LINE = /^(Given|When|Then|And|But)\b\s*(.*)$/i
const CHINESE_STEP_LINE = /^(假设|假定|当|那么|并且|而且|但是)\s*(.*)$/

function requirementTags(tags: readonly string[]): string[] {
  return tags.filter((tag) => REQUIREMENT_TAG.test(tag))
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)]
}

function stepKeyword(keyword: string, previous: BddStepKeyword | undefined): BddStepKeyword | undefined {
  const normalized = keyword.toLowerCase()
  if (normalized === 'given' || normalized === '假设' || normalized === '假定') return 'Given'
  if (normalized === 'when' || normalized === '当') return 'When'
  if (normalized === 'then' || normalized === '那么') return 'Then'
  return previous
}

function parseTags(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean)
}

/**
 * Parses the business-facing structure of one Gherkin feature contract.
 * Parsing is intentionally lightweight: Cucumber remains responsible for
 * executing steps, while this module checks the contract rules owned by BDD.
 */
export function parseFeatureContract(text: string): BddFeatureDocument {
  const lines = text.split(/\r?\n/)
  let feature: BddFeature | undefined
  let featureCount = 0
  let currentScenario:
    | {
        name: string
        line: number
        requirementTags: string[]
        steps: BddStep[]
      }
    | undefined
  let previousStepKeyword: BddStepKeyword | undefined
  let pendingTags: string[] = []
  const scenarios: BddScenario[] = []
  const narrative: string[] = []

  const finishScenario = (): void => {
    if (!currentScenario) return
    const featureRequirements = feature?.requirementTags ?? []
    scenarios.push({
      ...currentScenario,
      requirementTags: [...currentScenario.requirementTags],
      effectiveRequirementTags: unique([...featureRequirements, ...currentScenario.requirementTags]),
      steps: [...currentScenario.steps],
    })
    currentScenario = undefined
    previousStepKeyword = undefined
  }

  lines.forEach((rawLine, index) => {
    const line = index + 1
    const value = rawLine.trim()
    if (!value || value.startsWith('#')) return

    if (TAG_LINE.test(value)) {
      pendingTags = [...pendingTags, ...parseTags(value)]
      return
    }

    const featureMatch = value.match(FEATURE_LINE)
    if (featureMatch) {
      finishScenario()
      featureCount += 1
      const name = featureMatch[1].trim()
      const tags = requirementTags(pendingTags)
      feature = { name, line, requirementTags: tags, narrative: [] }
      pendingTags = []
      return
    }

    const scenarioMatch = value.match(SCENARIO_LINE)
    if (scenarioMatch) {
      finishScenario()
      currentScenario = {
        name: scenarioMatch[1].trim(),
        line,
        requirementTags: requirementTags(pendingTags),
        steps: [],
      }
      pendingTags = []
      previousStepKeyword = undefined
      return
    }

    const stepMatch = value.match(STEP_LINE) ?? value.match(CHINESE_STEP_LINE)
    if (stepMatch && currentScenario) {
      const keyword = stepKeyword(stepMatch[1], previousStepKeyword)
      currentScenario.steps.push({ keyword, text: stepMatch[2].trim(), line })
      previousStepKeyword = keyword
      return
    }

    if (feature && !currentScenario && !/^\b(?:Background|Rule|Examples):/i.test(value)) {
      narrative.push(value)
    }
  })

  finishScenario()

  if (feature) feature = { ...feature, narrative: [...narrative] }

  return { feature, featureCount, scenarios }
}

function firstStepIndex(scenario: BddScenario, keyword: BddStepKeyword): number {
  return scenario.steps.findIndex((step) => step.keyword === keyword)
}

/**
 * Validates the minimum business contract required by `df-dev-bdd`.
 * Returned messages are stable enough for CLI users and acceptance tests.
 */
export function validateFeatureContract(text: string): string[] {
  const document = parseFeatureContract(text)
  const errors: string[] = []
  const feature = document.feature

  if (document.featureCount !== 1 || !feature) {
    errors.push('A feature contract must contain exactly one Feature declaration')
    return errors
  }

  if (!feature.name) errors.push('Feature must have a non-empty title')

  const narrative = feature.narrative.join(' ')
  if (!/^(?:As a\b|作为)/im.test(narrative) || !/(?:^|\s)(?:I want\b|我希望)/im.test(narrative) || !/(?:^|\s)(?:So that\b|以便)/im.test(narrative)) {
    errors.push('Feature must include As a, I want, and So that narrative lines')
  }

  if (!feature.requirementTags.length && document.scenarios.some((scenario) => !scenario.requirementTags.length)) {
    errors.push('Feature or every Scenario must declare an @req-<id> requirement tag')
  }
  if (!feature.requirementTags.length && !document.scenarios.length) {
    errors.push('Feature or every Scenario must declare an @req-<id> requirement tag')
  }

  for (const scenario of document.scenarios) {
    if (!scenario.name) errors.push(`Scenario at line ${scenario.line} must have a non-empty title`)
    if (!scenario.effectiveRequirementTags.length) {
      errors.push(`Scenario "${scenario.name}" must declare or inherit an @req-<id> requirement tag`)
    }

    const given = firstStepIndex(scenario, 'Given')
    const when = firstStepIndex(scenario, 'When')
    const then = firstStepIndex(scenario, 'Then')
    if (given < 0) errors.push(`Scenario "${scenario.name}" must include a Given step`)
    if (when < 0) errors.push(`Scenario "${scenario.name}" must include a When step`)
    if (then < 0) errors.push(`Scenario "${scenario.name}" must include a Then step`)

    const whenCount = scenario.steps.filter((step) => step.keyword === 'When').length
    if (whenCount !== 1) errors.push(`Scenario "${scenario.name}" must contain exactly one When step`)
    if (given >= 0 && when >= 0 && then >= 0 && !(given < when && when < then)) {
      errors.push(`Scenario "${scenario.name}" must order Given, When, and Then steps`)
    }
  }

  return unique(errors)
}

function readOption(name: string, args: readonly string[]): string | undefined {
  const index = args.indexOf(name)
  return index < 0 ? undefined : args[index + 1]
}

function usage(): string {
  return 'Usage: bdd.ts --input <feature-file>'
}

function main(): number {
  const input = readOption('--input', Bun.argv)
  if (!input) {
    console.error(usage())
    return 1
  }

  try {
    const errors = validateFeatureContract(readFileSync(input, 'utf8'))
    if (errors.length) {
      for (const error of errors) console.error(`ERROR: ${error}`)
      return 1
    }
    console.log('BDD feature contract valid')
    return 0
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    return 1
  }
}

if (import.meta.main) process.exit(main())
