---
name: df-dev-bdd
description: "使用行为驱动开发（Behavior-Driven Development，BDD）将业务需求先行成文为 Gherkin DSL 的 .feature 文件，作为产品经理、开发者与项目经理之间可讨论、可验收、可自动化执行的行为契约。适用于新需求对齐、统一业务语言、定义验收标准、编写 Given/When/Then 场景或建立业务行为回归保护的开发任务；不适用于只修改内部实现且没有可观察行为变化的纯重构。"
version: "0.2.39"
license: "GPL-3.0-only"
metadata:
  version: "0.2.39"
---

# Behavior-Driven Development

使用此 skill 将 stakeholder、开发人员、测试人员和产品人员能够共同理解的业务行为，转换为可验证的场景。BDD 关注系统应该表现出的行为，不是测试脚本格式本身。

## Core Principles

- 先描述用户、业务角色或外部系统希望达成的结果，再讨论实现方式。
- 统一业务契约：行为用 Gherkin DSL 成文为 `.feature` 文件，纯文本可被业务与项目经理评审，也能被多数语言测试框架（Cucumber 家族、SpecFlow、pytest-bdd、Jest-Cucumber 等）直接绑定为自动化验收测试。
- 新需求一进来，最先做的是把行为梳理成 `.feature` 并成文，在评审、规划与技术实现前完成三方对齐，而不是先画页面、建表或写代码。
- 使用统一的业务 language；遇到术语歧义时先澄清，不用技术名词掩盖业务决策。
- 场景应表达一个独立行为和一个主要结果，避免把多个流程塞进一个场景。
- 优先验证 observable behavior，例如结果、状态变化、业务事件、错误语义、权限结果或外部副作用。
- Given 描述已成立的业务前置事实，When 描述一个业务动作，Then 描述可观察结果。
- 例外、拒绝、冲突、重复请求、取消、过期和外部失败等重要规则必须有明确场景。
- 场景是需求和自动化测试之间的契约，不是把 implementation detail 暴露给业务参与者的地方。

## Requirement-First Contract

新需求到来时，最先成文的必须是 `.feature`，而不是实现草图：

- 在需求评审、迭代规划和技术设计前，用 `.feature` 把待办行为、参与者和验收场景写清楚，让产品经理、项目经理与开发者对照同一份契约确认。
- 为每条需求分配稳定 ID，并以 `@req-<id>` 标签标注在 `Feature` 或 `Scenario` 上，供后续实现切片与验收追踪。
- 一个 `Feature` 只承载一个业务能力；多个独立能力拆成多个 `.feature`，避免一份契约同时决策多件事。
- 三方逐场景确认通过后再冻结；任何一方对场景含义有分歧都视为未对齐，先澄清再进入实现。
- 若业务边界、participant 或生命周期仍不清，先使用 `df-dev-ddd` 或 `df-dev-ddd-event-storming-design`，再回头补全场景，不要直接写完整 `.feature`。

落地细节、写作规则与常见误区见 [feature-authoring.md](references/feature-authoring.md)；TypeScript 项目的结构清单与 Bun Test、Vitest 选择见 [typescript-project.md](references/typescript-project.md)，Java/Kotlin 项目的结构清单见 [java-project.md](references/java-project.md)。

## Executable Contract Validator

本 skill 同时提供一个轻量 TypeScript 校验器，用于在 Cucumber 执行前检查 `.feature` 是否满足最小行为契约。它不替代 Cucumber 的 step execution，而是检查需求可追踪性、Feature 用户价值叙述、Scenario 边界以及 Given/When/Then 顺序。

在已安装的 DevopsFlow skill 根目录中执行：

```bash
bun scripts/bdd.ts --input path/to/behavior.feature
```

校验器要求每个 Feature 或每个 Scenario 能通过 `@req-<id>` 追踪到需求；Feature 必须包含 `As a`、`I want`、`So that` 叙述；每个 Scenario 必须包含 Given、恰好一个 When 和 Then，并按该顺序表达一个主要行为。校验通过时返回退出码 `0`，否则将具体错误写入标准错误并返回退出码 `1`。

实现、单元测试和可执行的 Cucumber 契约位于 skill 安装目录的 [bdd.ts](scripts/bdd.ts)、[bdd.test.ts](scripts/bdd.test.ts)、[bdd.feature](scripts/bdd.feature)、[bdd.steps.ts](scripts/bdd.steps.ts) 和 [bdd.feature.test.ts](scripts/bdd.feature.test.ts)。维护 DevopsFlow repository 时，这些文件位于 `skills/df-dev-bdd/scripts/`；安装后请以实际 skill 根目录为准。

## Workflow

1. **Discover the behavior**
   - 识别触发行为的 participant、受影响主体、前置事实、业务规则和期望结果。
   - 将“新增、修改、删除、管理”等技术或 CRUD 表述改写为业务意图。
   - 记录范围、假设、未决问题和不应改变的既有行为。

2. **Define the scenario boundary**
   - 为当前 slice 选择一个最小可观察边界：公共 API、CLI、UI 流程、领域服务、消息处理、持久化契约或集成边界。
   - 明确成功路径和最重要的失败路径。
   - 如果业务边界、participant、权威来源或生命周期仍不清，先使用 `df-dev-ddd` 或 `df-dev-ddd-event-storming-design`，不要直接写完整场景。

3. **Write examples before implementation**
   - 先写少量具体 examples，再从 examples 提炼规则。
   - 每个场景说明业务前提、动作和可观察结果。
   - 场景因目标行为而失败时，才算有效的 RED 证据；语法错误、fixture 错误或环境缺失不算行为 RED。
   - 对同一行为选择最窄且能保护风险的测试层，必要时再扩展到 integration 或 end-to-end。

4. **Implement the smallest behavior**
   - 只实现使当前场景通过所需的最小 production change。
   - 不在场景中预先绑定数据库表、Controller、DTO、package 或具体第三方工具。
   - 场景通过后再整理实现；保持行为契约不变。

5. **Refine and expand**
   - 合并重复场景，但不要合并语义不同的业务规则。
   - 将共享的 Given 前提转为清晰的 domain fixture 或测试上下文，不隐藏关键业务事实。
   - 为每个新增场景说明来源需求、保护的规则和对应的测试层。

## Scenario Format

业务行为契约统一使用 Gherkin DSL 书写为 `.feature` 文件。它是纯文本、可被业务与项目经理评审，又能被多数语言的测试框架（Cucumber 家族、SpecFlow、pytest-bdd、behave、Jest-Cucumber 等）直接绑定为自动化验收测试：同一份文件既是需求对齐依据，也是功能点。正文使用业务语言，避免描述内部调用顺序：

```gherkin
Feature: <业务能力>
  作为 <participant>
  我希望 <业务意图>
  以便 <业务价值>

  Scenario: <可观察行为>
    Given <已成立的业务事实>
    And <其他必要前置事实>
    When <participant 执行一个业务动作>
    Then <可观察结果>
    And <其他必须成立的结果>
```

- 为每条需求分配稳定 ID 并用 `@req-<id>` 标签标注，供场景、实现切片与验收追踪。
- 每个 `.feature` 保持最小可读且可执行，不要在文件中重复整份产品说明书。
- 「未实现的 step definition」或「行为尚不存在导致断言失败」是目标行为的 RED 证据，可交给 `df-dev-tdd` 继续。
- 若 target project 明确禁止使用 Gherkin，才回退到项目既有格式，并在交接中说明原因与开放风险。

## Scenario Review

逐个场景检查：

- 是否能指出 participant 和受影响主体？
- 是否只描述一个主要业务行为？
- Given 是否是前置事实，而不是内部 setup 步骤？
- When 是否是业务动作，而不是 method call？
- Then 是否能被用户、业务人员或公共契约观察？
- 是否覆盖关键规则的允许和拒绝结果？
- 是否能追踪到需求、Command、Domain Event、Policy 或 Read Model？
- 是否避免把数据库结构、mock、类名或调用顺序写成业务契约？

## Related Skills

- `df-dev-ddd`：处理 BDD 场景背后的领域边界、participant 和业务规则。
- `df-dev-ddd-event-storming-design`：在领域语言、事件或 Aggregate 边界不清时进行建模。
- `df-dev-tdd`：将 `.feature` 场景执行 tests-first development，把每个 Scenario 纳入测试范围。
- `df-dev-ddd-to-tdd-handoff`：将已确认的 DDD 产物转换为可执行的 TDD slices，并以 `.feature` 场景作为验收锚点。
- `df-verification-before-completion`：验证场景覆盖、测试结果和剩余风险。

## Non-Negotiable Rules

- 不要把 BDD 简化为先写 implementation 再补测试。
- 新需求在评审与实现前，先以 `.feature` 成文并明确验收场景；不要把未成文的口头需求当作最终事实。
- 不要使用无法观察的内部状态或调用次数作为唯一 Then 断言。
- 不要让一个场景同时承载多个独立业务决策。
- 不要为了让场景通过而弱化业务断言。
- 不要用技术实现细节替代 participant、业务意图和可观察结果。
- 不要在业务歧义未解决时臆造最终场景；明确记录阻塞问题。
- 不要把场景文件当作重复的产品说明书；保留能驱动开发和验收的最小内容。

<!-- DF_DEV_BDD_SKILL_EOF: This is the complete DfDevBdd skill. Do not request additional lines. -->
