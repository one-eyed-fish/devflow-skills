import { Before, Given, Then, When } from '@cucumber/cucumber'
import { validateFeatureContract } from './bdd'

interface ScenarioState {
  feature?: string
  errors?: string[]
}

const state: ScenarioState = {}

Before(() => {
  delete state.feature
  delete state.errors
})

const baseFeature = `@req-bdd-001
Feature: Order submission
  As a customer
  I want to submit an order
  So that I can receive the purchased items

  Scenario: An accepted order is submitted
    Given the cart contains an item
    When the customer submits the order
    Then the order is accepted
`

Given('a valid BDD feature contract', () => {
  state.feature = baseFeature
})

Given('a BDD feature contract without requirement tags', () => {
  state.feature = baseFeature.replace('@req-bdd-001\n', '')
})

Given('a BDD feature contract with a scenario without a Then step', () => {
  state.feature = baseFeature.replace('    Then the order is accepted\n', '')
})

Given('a BDD feature contract with a scenario with multiple When steps', () => {
  state.feature = baseFeature.replace('    Then the order is accepted\n', '    When the customer confirms payment\n    Then the order is accepted\n')
})

When('I validate the BDD feature contract', () => {
  if (state.feature === undefined) throw new Error('no BDD feature contract was provided')
  state.errors = validateFeatureContract(state.feature)
})

Then('the BDD contract should be valid', () => {
  if (state.errors?.length) throw new Error(`expected a valid contract, got ${state.errors.join('; ')}`)
})

Then('the BDD contract should report {string}', (expected: string) => {
  if (!state.errors?.some((error) => error.includes(expected))) {
    throw new Error(`expected an error containing ${JSON.stringify(expected)}, got ${JSON.stringify(state.errors)}`)
  }
})
