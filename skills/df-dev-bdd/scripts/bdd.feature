@req-bdd-validator
Feature: BDD feature contract validation
  As a workflow maintainer
  I want to validate Gherkin feature contracts
  So that behavior requirements remain traceable and executable

  Rule: A contract must preserve observable behavior structure

    Scenario: A complete contract is accepted
      Given a valid BDD feature contract
      When I validate the BDD feature contract
      Then the BDD contract should be valid

    Scenario: A contract without requirement traceability is rejected
      Given a BDD feature contract without requirement tags
      When I validate the BDD feature contract
      Then the BDD contract should report "Feature or every Scenario must declare an @req-<id> requirement tag"

    Scenario: A scenario without an observable result is rejected
      Given a BDD feature contract with a scenario without a Then step
      When I validate the BDD feature contract
      Then the BDD contract should report "must include a Then step"

    Scenario: A scenario with multiple actions is rejected
      Given a BDD feature contract with a scenario with multiple When steps
      When I validate the BDD feature contract
      Then the BDD contract should report "must contain exactly one When step"
