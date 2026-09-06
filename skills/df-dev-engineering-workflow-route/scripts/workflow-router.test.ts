import { describe, expect, test } from 'bun:test'
import { RiskDimension, readOption, routeTask, Skill, TaskType } from './workflow-router'

// These tests protect routing contracts rather than implementation details.
// Each scenario represents a workflow combination whose order or deduplication
// would materially change how an agent performs engineering work.
describe('routeTask', () => {
  test('emits the exact reason for every registered skill', () => {
    const expectedReasons: Record<Skill, string> = {
      [Skill.EngineeringStandards]: 'The task is standards-sensitive and requires authoritative engineering guidance.',
      [Skill.ResumableWorkflowGuard]: 'The task is long-running, spans multiple stages, or requires resumable execution.',
      [Skill.DomainEventStormingDesign]: 'Domain language, business rules, or ownership boundaries require clarification.',
      [Skill.Bdd]: 'New requirement behavior must be captured in a Gherkin .feature contract before implementation.',
      [Skill.GlueCoding]: 'The implementation should reuse established repository patterns and local project materials.',
      [Skill.IamAccessControlDesign]: 'The task involves permissions, roles, RBAC, ABAC, or API authorization mapping.',
      [Skill.GoogleAipApiDesign]: 'The task involves resource-oriented API or transport design.',
      [Skill.DddToTddHandoff]: 'The confirmed domain design must be converted into executable implementation slices.',
      [Skill.ImplementationPlanning]: 'A multi-step or risky change requires a concrete implementation plan.',
      [Skill.ExecutingImplementationPlan]: 'The confirmed implementation plan must be executed step by step.',
      [Skill.Tdd]: 'New, corrected, or preserved executable behavior requires test-first development.',
      [Skill.MutationTesting]: 'Test effectiveness must be assessed against meaningful production-code mutations.',
      [Skill.SpringWebBoundaries]: 'The task changes a Spring Web boundary.',
      [Skill.SystematicDebugging]: 'The root cause of a failure or defect has not yet been proven.',
      [Skill.ParallelAgentOrchestration]: 'Independent scopes can be executed safely in parallel.',
      [Skill.RequestingCodeReview]: 'The completed implementation requires a focused defect-oriented self-review.',
      [Skill.ReceivingCodeReview]: 'Actionable code review feedback must be evaluated and addressed.',
      [Skill.VerificationBeforeCompletion]: 'Requirements and evidence must be verified before declaring completion.',
      [Skill.FinishingDevelopmentBranch]: 'The branch must be prepared for commit, push, pull request, or handoff.',
    }
    const decisions = Object.values(TaskType).flatMap((taskType) => Object.values(RiskDimension).map((risk) => routeTask({ taskType, risks: [risk] })))
    const selections = decisions.flatMap((decision) => decision.requiredSkills)

    expect(new Set(selections.map(({ skill }) => skill))).toEqual(new Set(Object.values(Skill)))
    for (const { skill, reason } of selections) expect(reason).toBe(expectedReasons[skill])
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

  test('routes test-effectiveness work through TDD and mutation testing in dependency order', () => {
    const decision = routeTask({
      taskType: TaskType.NewFeature,
      risks: [RiskDimension.TestEffectiveness, RiskDimension.TestEffectiveness],
    })

    expect(decision.risks).toEqual([RiskDimension.TestEffectiveness])
    expect(decision.executionOrder).toEqual([
      Skill.Bdd,
      Skill.ImplementationPlanning,
      Skill.ExecutingImplementationPlan,
      Skill.Tdd,
      Skill.MutationTesting,
      Skill.RequestingCodeReview,
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

  test('routes every task type through its complete baseline', () => {
    const expected: Record<TaskType, Skill[]> = {
      [TaskType.NewFeature]: [
        Skill.Bdd,
        Skill.ImplementationPlanning,
        Skill.ExecutingImplementationPlan,
        Skill.Tdd,
        Skill.RequestingCodeReview,
        Skill.VerificationBeforeCompletion,
      ],
      [TaskType.BugFix]: [Skill.SystematicDebugging, Skill.Tdd, Skill.VerificationBeforeCompletion],
      [TaskType.PureRefactor]: [Skill.ImplementationPlanning, Skill.ExecutingImplementationPlan, Skill.Tdd, Skill.VerificationBeforeCompletion],
      [TaskType.DomainModeling]: [Skill.DomainEventStormingDesign, Skill.VerificationBeforeCompletion],
      [TaskType.GlueCoding]: [Skill.GlueCoding, Skill.ImplementationPlanning, Skill.ExecutingImplementationPlan, Skill.VerificationBeforeCompletion],
      [TaskType.DesignReview]: [Skill.EngineeringStandards, Skill.VerificationBeforeCompletion],
      [TaskType.CodeReview]: [Skill.EngineeringStandards, Skill.VerificationBeforeCompletion],
      [TaskType.ReviewFeedback]: [Skill.ReceivingCodeReview, Skill.VerificationBeforeCompletion],
      [TaskType.Verification]: [Skill.VerificationBeforeCompletion],
      [TaskType.BranchFinish]: [Skill.VerificationBeforeCompletion, Skill.FinishingDevelopmentBranch],
      [TaskType.CommitOrPullRequest]: [Skill.VerificationBeforeCompletion, Skill.FinishingDevelopmentBranch],
    }

    for (const taskType of Object.values(TaskType)) {
      const decision = routeTask({ taskType })
      expect(decision.taskType).toBe(taskType)
      expect(decision.risks).toEqual([])
      expect(decision.executionOrder).toEqual(expected[taskType])
      expect(decision.requiredSkills.map(({ skill }) => skill)).toEqual(expected[taskType])
    }
  })

  test('adds the exact skills for every individual risk', () => {
    const expected: Record<RiskDimension, Skill[]> = {
      [RiskDimension.LongRunning]: [Skill.ResumableWorkflowGuard, Skill.VerificationBeforeCompletion],
      [RiskDimension.DomainAmbiguity]: [Skill.DomainEventStormingDesign, Skill.VerificationBeforeCompletion],
      [RiskDimension.LocalPatternReuse]: [Skill.GlueCoding, Skill.VerificationBeforeCompletion],
      [RiskDimension.BehaviorChange]: [Skill.Tdd, Skill.VerificationBeforeCompletion],
      [RiskDimension.TestEffectiveness]: [Skill.MutationTesting, Skill.VerificationBeforeCompletion],
      [RiskDimension.SpringWebBoundary]: [Skill.EngineeringStandards, Skill.SpringWebBoundaries, Skill.VerificationBeforeCompletion],
      [RiskDimension.ApiAuthorization]: [Skill.EngineeringStandards, Skill.IamAccessControlDesign, Skill.VerificationBeforeCompletion],
      [RiskDimension.ApiResourceDesign]: [Skill.EngineeringStandards, Skill.GoogleAipApiDesign, Skill.VerificationBeforeCompletion],
      [RiskDimension.ArchitectureBoundary]: [Skill.EngineeringStandards, Skill.VerificationBeforeCompletion],
      [RiskDimension.InputBoundary]: [Skill.EngineeringStandards, Skill.VerificationBeforeCompletion],
      [RiskDimension.SecurityBoundary]: [Skill.EngineeringStandards, Skill.VerificationBeforeCompletion],
      [RiskDimension.JavaStyle]: [Skill.EngineeringStandards, Skill.VerificationBeforeCompletion],
      [RiskDimension.UnknownRootCause]: [Skill.SystematicDebugging, Skill.VerificationBeforeCompletion],
      [RiskDimension.Parallelizable]: [Skill.ParallelAgentOrchestration, Skill.VerificationBeforeCompletion],
    }

    for (const risk of Object.values(RiskDimension)) {
      expect(routeTask({ taskType: TaskType.Verification, risks: [risk] }).executionOrder).toEqual(expected[risk])
    }
  })

  test('reads option values at index zero and distinguishes missing options', () => {
    expect(readOption('--task-type', ['--task-type', 'verification'])).toBe('verification')
    expect(readOption('--task-type', ['--help'])).toBeUndefined()
  })
  test('implements the exact CLI help, validation, and JSON contracts', () => {
    const script = `${import.meta.dir}/workflow-router.ts`
    const helpText = [
      'Usage: workflow-router.ts --task-type <type> [--risks <risk,...>]',
      'Task types: new_feature, bug_fix, pure_refactor, domain_modeling, glue_coding, design_review, code_review, review_feedback, verification, branch_finish, commit_or_pr',
      'Risks: long_running, domain_ambiguity, local_pattern_reuse, behavior_change, test_effectiveness, spring_web_boundary, api_authorization, api_resource_design, architecture_boundary, input_boundary, security_boundary, java_style, unknown_root_cause, parallelizable',
    ].join('\n')

    const help = Bun.spawnSync([process.execPath, script, '--help'], { stdout: 'pipe', stderr: 'pipe' })
    const missingTask = Bun.spawnSync([process.execPath, script], { stdout: 'pipe', stderr: 'pipe' })
    const invalidRisk = Bun.spawnSync([process.execPath, script, '--task-type', 'verification', '--risks', 'behavior_change,unknown'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const validWithoutRisks = Bun.spawnSync([process.execPath, script, '--task-type', 'verification'], { stdout: 'pipe', stderr: 'pipe' })
    const valid = Bun.spawnSync([process.execPath, script, '--risks', 'behavior_change,,test_effectiveness', '--task-type', 'verification'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    expect(help.exitCode).toBe(0)
    expect(help.stdout.toString()).toBe(`${helpText}\n`)
    expect(help.stderr.toString()).toBe('')
    expect(missingTask.exitCode).toBe(1)
    expect(missingTask.stderr.toString()).toBe(`${helpText}\n`)
    expect(invalidRisk.exitCode).toBe(1)
    expect(invalidRisk.stderr.toString()).toBe(`${helpText}\n`)
    expect(validWithoutRisks.exitCode).toBe(0)
    expect(JSON.parse(validWithoutRisks.stdout.toString())).toEqual(routeTask({ taskType: TaskType.Verification }))
    expect(valid.exitCode).toBe(0)
    expect(valid.stderr.toString()).toBe('')
    expect(JSON.parse(valid.stdout.toString())).toEqual(
      routeTask({
        taskType: TaskType.Verification,
        risks: [RiskDimension.BehaviorChange, RiskDimension.TestEffectiveness],
      }),
    )
  })
})
