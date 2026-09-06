import { describe, expect, test } from 'bun:test'
import { parseFeatureContract, validateFeatureContract } from './bdd'

const validFeature = `@req-checkout-001
Feature: Checkout
  As a customer
  I want to submit my order
  So that I can receive the purchased items

  Scenario: An accepted order is submitted
    Given the cart contains an item
    When the customer submits the order
    Then the order is accepted
`

describe('validateFeatureContract', () => {
  test('accepts a feature with a requirement tag and complete business narrative', () => {
    expect(validateFeatureContract(validFeature)).toEqual([])
  })

  test('inherits a feature requirement tag for every scenario', () => {
    const document = parseFeatureContract(validFeature)

    expect(document.feature?.requirementTags).toEqual(['@req-checkout-001'])
    expect(document.scenarios[0]?.requirementTags).toEqual([])
    expect(document.scenarios[0]?.effectiveRequirementTags).toEqual(['@req-checkout-001'])
  })

  test('accepts scenario-level requirement tags when the feature has none', () => {
    const feature = validFeature
      .replace('@req-checkout-001\n', '')
      .replace('Scenario: An accepted order is submitted', '@req-checkout-002\n  Scenario: An accepted order is submitted')

    expect(validateFeatureContract(feature)).toEqual([])
  })

  test('rejects a feature without a requirement tag', () => {
    const feature = validFeature.replace('@req-checkout-001\n', '')

    expect(validateFeatureContract(feature)).toContain('Feature or every Scenario must declare an @req-<id> requirement tag')
  })

  test('rejects a missing user-value narrative line', () => {
    const feature = validFeature.replace('  So that I can receive the purchased items\n', '')

    expect(validateFeatureContract(feature)).toContain('Feature must include As a, I want, and So that narrative lines')
  })

  test('rejects a scenario without Given, When, or Then', () => {
    const feature = validFeature.replace('    Then the order is accepted\n', '')

    expect(validateFeatureContract(feature)).toContain('Scenario "An accepted order is submitted" must include a Then step')
  })

  test('rejects more than one When step in a scenario', () => {
    const feature = validFeature.replace('    Then the order is accepted\n', '    When the payment is confirmed\n    Then the order is accepted\n')

    expect(validateFeatureContract(feature)).toContain('Scenario "An accepted order is submitted" must contain exactly one When step')
  })

  test('rejects a Then step that appears before the action', () => {
    const feature = validFeature.replace(
      '    When the customer submits the order\n    Then the order is accepted\n',
      '    Then the order is accepted\n    When the customer submits the order\n',
    )

    expect(validateFeatureContract(feature)).toContain('Scenario "An accepted order is submitted" must order Given, When, and Then steps')
  })

  test('rejects multiple Feature declarations', () => {
    expect(validateFeatureContract(`${validFeature}\nFeature: Another capability\n`)).toContain(
      'A feature contract must contain exactly one Feature declaration',
    )
  })
})
