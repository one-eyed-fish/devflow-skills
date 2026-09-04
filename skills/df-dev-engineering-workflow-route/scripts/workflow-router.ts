#!/usr/bin/env bun

/**
 * Canonical task classifications accepted by the workflow router.
 *
 * Named members make routing definitions readable to both humans and agents,
 * while explicit string values preserve the stable CLI and JSON contract.
 */
export enum TaskType {
  /** Introduces user-visible behavior or a new engineering capability. */
  NewFeature = 'new_feature',
  /** Corrects behavior that is defective, failing, or inconsistent. */
  BugFix = 'bug_fix',
  /** Changes internal structure while intentionally preserving behavior. */
  PureRefactor = 'pure_refactor',
  /** Clarifies domain language, rules, events, aggregates, or boundaries. */
  DomainModeling = 'domain_modeling',
  /** Implements behavior primarily by adapting established local patterns. */
  GlueCoding = 'glue_coding',
  /** Evaluates a proposed design without implementing production behavior. */
  DesignReview = 'design_review',
  /** Reviews existing code or a change set for concrete engineering defects. */
  CodeReview = 'code_review',
  /** Evaluates and addresses feedback received from a code review. */
  ReviewFeedback = 'review_feedback',
  /** Collects completion evidence without introducing a planned behavior change. */
  Verification = 'verification',
  /** Prepares an implemented and verified development branch for handoff. */
  BranchFinish = 'branch_finish',
  /** Prepares or performs a commit or pull-request publication workflow. */
  CommitOrPullRequest = 'commit_or_pr',
}

/** Runtime task values derived from {@link TaskType} for CLI help and validation. */
export const TASK_TYPES = Object.values(TaskType)

/**
 * Independent risk signals that can extend the base route for a task type.
 *
 * A task has exactly one primary classification but may have several risks.
 * Risks are additive: they introduce required workflow skills without
 * replacing the baseline skills selected for the primary task type.
 */
export enum RiskDimension {
  /** The task is long, multi-stage, resumable, or likely to cross sessions. */
  LongRunning = 'long_running',
  /** Business language, rules, ownership, or domain boundaries are unclear. */
  DomainAmbiguity = 'domain_ambiguity',
  /** Existing repository patterns should guide the implementation structure. */
  LocalPatternReuse = 'local_pattern_reuse',
  /** The task adds or modifies observable executable behavior. */
  BehaviorChange = 'behavior_change',
  /** Existing tests require mutation analysis to assess their defect-detection strength. */
  TestEffectiveness = 'test_effectiveness',
  /** The change touches a Spring controller, HTTP contract, or web boundary. */
  SpringWebBoundary = 'spring_web_boundary',
  /** The design includes permissions, roles, RBAC, ABAC, or authorization checks. */
  ApiAuthorization = 'api_authorization',
  /** The design includes resource-oriented API or transport semantics. */
  ApiResourceDesign = 'api_resource_design',
  /** The task changes a module, layer, dependency, or ownership boundary. */
  ArchitectureBoundary = 'architecture_boundary',
  /** The task changes normalization, validation, or input-contract ownership. */
  InputBoundary = 'input_boundary',
  /** The task changes general security controls beyond API authorization. */
  SecurityBoundary = 'security_boundary',
  /** The task requires Java language style or layout rules. */
  JavaStyle = 'java_style',
  /** A failure exists but its earliest causal mechanism is not yet proven. */
  UnknownRootCause = 'unknown_root_cause',
  /** Independent scopes can be delegated without overlapping ownership. */
  Parallelizable = 'parallelizable',
}

/** Runtime risk values derived from {@link RiskDimension} for CLI help and validation. */
export const RISK_DIMENSIONS = Object.values(RiskDimension)

/**
 * Central registry of every skill identifier emitted by this router.
 *
 * Routing tables must reference this object instead of repeating string
 * literals. This makes renamed skills a single-definition change and lets
 * TypeScript constrain all output to known DevopsFlow skills.
 */
export enum Skill {
  /** Selects authoritative engineering standards for standards-sensitive work. */
  EngineeringStandards = 'df-dev-engineering-standards',
  /** Protects long-running work with checkpoints and resumable state. */
  ResumableWorkflowGuard = 'df-resumable-workflow-guard',
  /** Clarifies domain behavior through event storming and DDD modeling. */
  DomainEventStormingDesign = 'df-ddd-event-storming-design',
  /** Reuses local repository patterns for thin implementation work. */
  GlueCoding = 'df-glue-coding',
  /** Defines IAM-style permissions, roles, bindings, and authorization checks. */
  IamAccessControlDesign = 'df-iam-access-control-design',
  /** Designs resource-oriented APIs according to Google AIP conventions. */
  GoogleAipApiDesign = 'df-google-aip-api-design',
  /** Converts confirmed DDD artifacts into executable TDD slices. */
  DddToTddHandoff = 'df-ddd-to-tdd-handoff',
  /** Produces a concrete, ordered, test-aware implementation plan. */
  ImplementationPlanning = 'df-implementation-planning',
  /** Executes an approved implementation plan step by step. */
  ExecutingImplementationPlan = 'df-executing-implementation-plan',
  /** Develops executable behavior with test-first feedback. */
  Tdd = 'df-dev-tdd',
  /** Evaluates test effectiveness by checking whether meaningful code mutations are detected. */
  MutationTesting = 'df-dev-tdd-mutation-testing',
  /** Applies Spring Web controller and service-boundary guardrails. */
  SpringWebBoundaries = 'df-spring-web-boundaries',
  /** Establishes evidence for the root cause before applying a fix. */
  SystematicDebugging = 'df-systematic-debugging',
  /** Splits independent work across agents with explicit ownership. */
  ParallelAgentOrchestration = 'df-parallel-agent-orchestration',
  /** Performs a focused self-review after the main implementation. */
  RequestingCodeReview = 'df-requesting-code-review',
  /** Classifies and addresses actionable review feedback. */
  ReceivingCodeReview = 'df-receiving-code-review',
  /** Verifies requirements, checks, evidence, and remaining risks. */
  VerificationBeforeCompletion = 'df-verification-before-completion',
  /** Prepares a verified branch for commit, push, pull request, or handoff. */
  FinishingDevelopmentBranch = 'df-finishing-development-branch',
}

/** Input supplied by an agent or by the command-line adapter. */
export interface RouteInput {
  /**
   * The single primary classification for the engineering request.
   *
   * The value selects the baseline workflow from `TASK_SKILLS`. Cross-cutting
   * concerns must be expressed through `risks` instead of inventing a second
   * primary task type.
   */
  readonly taskType: TaskType

  /**
   * Optional cross-cutting risk signals that extend the baseline workflow.
   *
   * Callers may provide the risks in discovery order and may include duplicate
   * values. The router preserves first-seen order in the returned `risks`
   * array, removes duplicates, and uses the unique set to select skills.
   * Omitting this field is equivalent to passing an empty array.
   */
  readonly risks?: readonly RiskDimension[]
}

/** A selected skill together with the user-facing reason for selecting it. */
export interface SkillSelection {
  /**
   * Canonical DevopsFlow skill identifier to invoke.
   *
   * The enum type ensures routing output cannot contain an identifier that is
   * absent from the central skill registry.
   */
  readonly skill: Skill

  /**
   * Concise explanation of why the skill is required for this route.
   *
   * This text is intended for user-facing route summaries. It is resolved from
   * `REASONS` and is therefore stable for every occurrence of the same skill.
   */
  readonly reason: string
}

/**
 * Complete deterministic routing result.
 *
 * `requiredSkills` carries explanations for presentation, while
 * `executionOrder` is the compact sequence agents should execute. Both arrays
 * are derived from the same ordered selection and therefore cannot disagree.
 */
export interface RouteDecision {
  /** The validated primary task classification copied from the input. */
  readonly taskType: TaskType

  /**
   * Deduplicated risk signals in first-seen input order.
   *
   * This field reports the normalized input. It does not represent execution
   * order; skill sequencing is available in `executionOrder`.
   */
  readonly risks: readonly RiskDimension[]

  /**
   * Ordered selected skills with a user-facing reason for every skill.
   *
   * Entries are unique and use the same order as `executionOrder`. Consumers
   * should use this form when presenting or logging the routing decision.
   */
  readonly requiredSkills: readonly SkillSelection[]

  /**
   * Unique canonical skill identifiers in dependency-safe execution order.
   *
   * Consumers should invoke skills in this exact order. The final sequence is
   * independent of the order in which task and risk mappings selected skills.
   */
  readonly executionOrder: readonly Skill[]
}

/**
 * User-facing explanations keyed by the canonical skill registry.
 * `Record` is deliberate: adding a member to `Skill` produces a type error
 * until its explanation is defined here.
 */
const REASONS: Record<Skill, string> = {
  [Skill.EngineeringStandards]: 'The task is standards-sensitive and requires authoritative engineering guidance.',
  [Skill.ResumableWorkflowGuard]: 'The task is long-running, spans multiple stages, or requires resumable execution.',
  [Skill.DomainEventStormingDesign]: 'Domain language, business rules, or ownership boundaries require clarification.',
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

/**
 * Baseline workflow for each primary task classification.
 *
 * These entries describe required capabilities, not final sequence. Final
 * ordering is applied centrally through `EXECUTION_PRIORITY` after task and
 * risk selections have been merged.
 */
const TASK_SKILLS: Record<TaskType, readonly Skill[]> = {
  [TaskType.NewFeature]: [
    Skill.ImplementationPlanning,
    Skill.ExecutingImplementationPlan,
    Skill.Tdd,
    Skill.RequestingCodeReview,
    Skill.VerificationBeforeCompletion,
  ],
  [TaskType.BugFix]: [Skill.SystematicDebugging, Skill.Tdd, Skill.VerificationBeforeCompletion],
  [TaskType.PureRefactor]: [Skill.ImplementationPlanning, Skill.Tdd, Skill.ExecutingImplementationPlan, Skill.VerificationBeforeCompletion],
  [TaskType.DomainModeling]: [Skill.DomainEventStormingDesign, Skill.VerificationBeforeCompletion],
  [TaskType.GlueCoding]: [Skill.GlueCoding, Skill.ImplementationPlanning, Skill.ExecutingImplementationPlan, Skill.VerificationBeforeCompletion],
  [TaskType.DesignReview]: [Skill.EngineeringStandards, Skill.VerificationBeforeCompletion],
  [TaskType.CodeReview]: [Skill.EngineeringStandards, Skill.VerificationBeforeCompletion],
  [TaskType.ReviewFeedback]: [Skill.ReceivingCodeReview, Skill.VerificationBeforeCompletion],
  [TaskType.Verification]: [Skill.VerificationBeforeCompletion],
  [TaskType.BranchFinish]: [Skill.VerificationBeforeCompletion, Skill.FinishingDevelopmentBranch],
  [TaskType.CommitOrPullRequest]: [Skill.VerificationBeforeCompletion, Skill.FinishingDevelopmentBranch],
}

/**
 * Additional capabilities introduced by each risk signal.
 *
 * Several risks may select the same skill. The routing function merges them
 * through a Set so repeated evidence cannot duplicate an execution step.
 */
const RISK_SKILLS: Record<RiskDimension, readonly Skill[]> = {
  [RiskDimension.LongRunning]: [Skill.ResumableWorkflowGuard],
  [RiskDimension.DomainAmbiguity]: [Skill.DomainEventStormingDesign],
  [RiskDimension.LocalPatternReuse]: [Skill.GlueCoding],
  [RiskDimension.BehaviorChange]: [Skill.Tdd],
  [RiskDimension.TestEffectiveness]: [Skill.MutationTesting],
  [RiskDimension.SpringWebBoundary]: [Skill.EngineeringStandards, Skill.SpringWebBoundaries],
  [RiskDimension.ApiAuthorization]: [Skill.EngineeringStandards, Skill.IamAccessControlDesign],
  [RiskDimension.ApiResourceDesign]: [Skill.EngineeringStandards, Skill.GoogleAipApiDesign],
  [RiskDimension.ArchitectureBoundary]: [Skill.EngineeringStandards],
  [RiskDimension.InputBoundary]: [Skill.EngineeringStandards],
  [RiskDimension.SecurityBoundary]: [Skill.EngineeringStandards],
  [RiskDimension.JavaStyle]: [Skill.EngineeringStandards],
  [RiskDimension.UnknownRootCause]: [Skill.SystematicDebugging],
  [RiskDimension.Parallelizable]: [Skill.ParallelAgentOrchestration],
}

/**
 * Global dependency order for every skill the router can emit.
 *
 * This array is the sole sequencing definition. For example, root-cause
 * debugging precedes TDD, implementation review precedes the completion gate,
 * and branch finishing always follows verification. Selection tables must not
 * rely on their local array order because task and risk routes are merged.
 */
const EXECUTION_PRIORITY: readonly Skill[] = [
  Skill.EngineeringStandards,
  Skill.ResumableWorkflowGuard,
  Skill.DomainEventStormingDesign,
  Skill.GlueCoding,
  Skill.IamAccessControlDesign,
  Skill.GoogleAipApiDesign,
  Skill.DddToTddHandoff,
  Skill.ImplementationPlanning,
  Skill.SystematicDebugging,
  Skill.ExecutingImplementationPlan,
  Skill.Tdd,
  Skill.MutationTesting,
  Skill.SpringWebBoundaries,
  Skill.ParallelAgentOrchestration,
  Skill.RequestingCodeReview,
  Skill.ReceivingCodeReview,
  Skill.VerificationBeforeCompletion,
  Skill.FinishingDevelopmentBranch,
]

/**
 * Builds a stable workflow decision from a primary task type and risk signals.
 *
 * The function performs four steps: deduplicate risks, merge baseline and
 * risk-driven skills, infer the DDD-to-TDD handoff when domain discovery feeds
 * an implementation route, and finally sort all selected skills by the global
 * dependency order. It has no filesystem or process side effects, which keeps
 * it reusable by tests, hooks, and future adapters.
 *
 * @param input - Routing input containing one primary task classification and
 * optional additive risk signals. Duplicate risks are accepted and normalized.
 * @param input.taskType - Primary task classification used to select the
 * baseline workflow.
 * @param input.risks - Optional risk signals used to extend the baseline
 * workflow. The input array is never mutated.
 * @returns A deterministic route containing normalized risks, explained skill
 * selections, and the dependency-safe execution order. Returned arrays are new
 * values and share no mutable array reference with the input.
 */
export function routeTask({ taskType, risks = [] }: RouteInput): RouteDecision {
  const uniqueRisks = [...new Set(risks)]
  const selected = new Set<Skill>(TASK_SKILLS[taskType])
  for (const risk of uniqueRisks) {
    for (const skill of RISK_SKILLS[risk]) selected.add(skill)
  }

  // Domain discovery must be translated into executable slices before an
  // implementation plan is executed. Pure domain-modeling routes do not need
  // this bridge because they stop before implementation.
  if (selected.has(Skill.DomainEventStormingDesign) && selected.has(Skill.ExecutingImplementationPlan)) {
    selected.add(Skill.DddToTddHandoff)
  }

  const executionOrder = EXECUTION_PRIORITY.filter((skill) => selected.has(skill))
  return {
    taskType,
    risks: uniqueRisks,
    requiredSkills: executionOrder.map((skill) => ({
      skill,
      reason: REASONS[skill],
    })),
    executionOrder,
  }
}

/**
 * Renders command-line usage text from the canonical runtime tuples.
 *
 * @returns A newline-delimited help message containing the invocation syntax,
 * every supported task type, and every supported risk dimension. The returned
 * string does not contain a trailing newline; `console.log` adds it at output.
 */
function usage(): string {
  return [
    'Usage: workflow-router.ts --task-type <type> [--risks <risk,...>]',
    `Task types: ${TASK_TYPES.join(', ')}`,
    `Risks: ${RISK_DIMENSIONS.join(', ')}`,
  ].join('\n')
}

/**
 * Reads the value immediately following a named CLI option.
 * Validation remains in the main block so this helper performs no coercion and
 * cannot silently accept an unsupported task type or risk dimension.
 *
 * @param name - Exact option token to locate in `Bun.argv`, including its
 * leading hyphens, for example `--task-type` or `--risks`.
 * @returns The next raw argument when the option exists and has a following
 * token; otherwise `undefined`. The helper does not trim, split, or validate
 * the returned value.
 */
export function readOption(name: string, args: readonly string[] = Bun.argv): string | undefined {
  const index = args.indexOf(name)
  return index < 0 ? undefined : args[index + 1]
}

// CLI input is read from `Bun.argv`. Successful output is either human-readable
// help text or a JSON-serialized `RouteDecision`; invalid input writes help to
// stderr and sets exit code 1. Keeping these concerns at the boundary ensures
// importing the module exposes the pure router without process side effects.
if (import.meta.main) {
  if (Bun.argv.includes('--help')) {
    console.log(usage())
  } else {
    const taskType = readOption('--task-type')
    const risks = (readOption('--risks') ?? '').split(',').filter(Boolean)
    if (!TASK_TYPES.includes(taskType as TaskType)) {
      console.error(usage())
      process.exitCode = 1
    } else if (risks.some((risk) => !RISK_DIMENSIONS.includes(risk as RiskDimension))) {
      console.error(usage())
      process.exitCode = 1
    } else {
      console.log(
        JSON.stringify(
          routeTask({
            taskType: taskType as TaskType,
            risks: risks as RiskDimension[],
          }),
          null,
          2,
        ),
      )
    }
  }
}
