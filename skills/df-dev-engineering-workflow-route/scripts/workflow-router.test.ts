import { describe, expect, test } from 'bun:test'
import { RiskDimension, routeTask, Skill, TaskType } from './workflow-router'

// These tests protect routing contracts rather than implementation details.
// Each scenario represents a workflow combination whose order or deduplication
// would materially change how an agent performs engineering work.
describe('routeTask', () => {
  // Every enum member must emit an English reason because route output is a
  // machine-readable skill contract shared by humans and agents.
  test('emits English reasons for every registered skill', () => {
    const decisions = Object.values(TaskType).flatMap((taskType) => Object.values(RiskDimension).map((risk) => routeTask({ taskType, risks: [risk] })))
    const reasons = decisions.flatMap((decision) => decision.requiredSkills.map(({ reason }) => reason))

    expect(reasons.length).toBeGreaterThan(0)
    expect(reasons.every((reason) => /^[\x20-\x7E]+$/.test(reason))).toBeTrue()
  })

  // Root-cause analysis must happen before a regression test and fix are
  // attempted, while verification remains the final completion gate.
  test('routes a bug fix through debugging, TDD, and verification', () => {
    expect(routeTask({ taskType: TaskType.BugFix }).executionOrder).toEqual([Skill.SystematicDebugging, Skill.Tdd, Skill.VerificationBeforeCompletion])
  })

  // A domain-aware implementation needs an explicit handoff from the confirmed
  // model to executable slices. Repeated risk input must remain idempotent.
  test('adds handoff when domain discovery precedes implementation', () => {
    const decision = routeTask({
      taskType: TaskType.NewFeature,
      risks: [RiskDimension.DomainAmbiguity, RiskDimension.LongRunning, RiskDimension.DomainAmbiguity],
    })

    expect(decision.risks).toEqual([RiskDimension.DomainAmbiguity, RiskDimension.LongRunning])
    expect(decision.executionOrder).toContain(Skill.DddToTddHandoff)
    expect(new Set(decision.executionOrder).size).toBe(decision.executionOrder.length)
  })

  // Authorization semantics and resource-oriented API design are complementary
  // design concerns, and both must still converge on one verification gate.
  test('combines API authorization and resource design without duplicating gates', () => {
    const decision = routeTask({
      taskType: TaskType.DesignReview,
      risks: [RiskDimension.ApiAuthorization, RiskDimension.ApiResourceDesign],
    })

    expect(decision.executionOrder).toEqual([
      Skill.EngineeringStandards,
      Skill.IamAccessControlDesign,
      Skill.GoogleAipApiDesign,
      Skill.VerificationBeforeCompletion,
    ])
  })

  test('routes code review through authoritative engineering standards', () => {
    expect(routeTask({ taskType: TaskType.CodeReview }).executionOrder).toEqual([Skill.EngineeringStandards, Skill.VerificationBeforeCompletion])
  })

  test('routes architecture and input boundary risks through the standards skill', () => {
    const decision = routeTask({
      taskType: TaskType.DesignReview,
      risks: [RiskDimension.ArchitectureBoundary, RiskDimension.InputBoundary],
    })

    expect(decision.executionOrder).toEqual([Skill.EngineeringStandards, Skill.VerificationBeforeCompletion])
  })

  test('routes security and Java style risks through the standards skill once', () => {
    const decision = routeTask({
      taskType: TaskType.NewFeature,
      risks: [RiskDimension.SecurityBoundary, RiskDimension.JavaStyle],
    })

    expect(decision.executionOrder.filter((skill) => skill === Skill.EngineeringStandards)).toHaveLength(1)
  })
})
