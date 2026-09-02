---
name: df-dev-bdd
description: "使用行为驱动开发（Behavior-Driven Development，BDD）将业务需求转化为可讨论、可验收、可自动化执行的行为场景。适用于需要统一业务语言、协作澄清需求、定义验收标准、编写 Given/When/Then 场景或建立业务行为回归保护的开发任务；不适用于只修改内部实现且没有可观察行为变化的纯重构。"
version: "0.2.36"
license: "GPL-3.0-only"
metadata:
  version: "0.2.36"
---

# Behavior-Driven Development

使用此 skill 将 stakeholder、开发人员、测试人员和产品人员能够共同理解的业务行为，转换为可验证的场景。BDD 关注系统应该表现出的行为，不是测试脚本格式本身。

## Core Principles

- 先描述用户、业务角色或外部系统希望达成的结果，再讨论实现方式。
- 使用统一的业务 language；遇到术语歧义时先澄清，不用技术名词掩盖业务决策。
- 场景应表达一个独立行为和一个主要结果，避免把多个流程塞进一个场景。
- 优先验证 observable behavior，例如结果、状态变化、业务事件、错误语义、权限结果或外部副作用。
- Given 描述已成立的业务前置事实，When 描述一个业务动作，Then 描述可观察结果。
- 例外、拒绝、冲突、重复请求、取消、过期和外部失败等重要规则必须有明确场景。
- 场景是需求和自动化测试之间的契约，不是把 implementation detail 暴露给业务参与者的地方。

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

使用以下结构；正文使用业务语言，避免描述内部调用顺序：

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

如果项目不使用 Gherkin，保留相同语义，使用 Markdown、测试名称或项目既有格式表达。

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
- `df-dev-tdd`：将已定义行为执行为 tests-first development。
- `df-dev-ddd-to-tdd-handoff`：将已确认的 DDD 产物转换为可执行的 TDD slices。
- `df-verification-before-completion`：验证场景覆盖、测试结果和剩余风险。

## Non-Negotiable Rules

- 不要把 BDD 简化为先写 implementation 再补测试。
- 不要使用无法观察的内部状态或调用次数作为唯一 Then 断言。
- 不要让一个场景同时承载多个独立业务决策。
- 不要为了让场景通过而弱化业务断言。
- 不要用技术实现细节替代 participant、业务意图和可观察结果。
- 不要在业务歧义未解决时臆造最终场景；明确记录阻塞问题。
- 不要把场景文件当作重复的产品说明书；保留能驱动开发和验收的最小内容。

<!-- DF_DEV_BDD_SKILL_EOF: This is the complete DfDevBdd skill. Do not request additional lines. -->
