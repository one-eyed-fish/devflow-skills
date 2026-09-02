---
name: df-dev-sdd
description: "使用规范驱动开发（Specification-Driven Development，SDD）将已确认的需求和系统约束维护为可执行、可追踪、可验证的规范，并以规范作为设计、实现、测试和变更审查的主线。适用于 API、协议、数据格式、CLI、配置、领域规则或跨团队契约等需要先定义规范再实现的开发任务；不适用于只做局部格式调整或没有明确可验证契约的探索性原型。"
version: "0.2.36"
license: "GPL-3.0-only"
metadata:
  version: "0.2.36"
---

# Specification-Driven Development

使用此 skill 将“系统应该满足什么”写成稳定、可审查、可执行的规范，再从规范推导设计、实现和验证。规范是 source of truth；代码、测试、示例和文档必须与其一致。

## Core Principles

- 先定义契约和约束，再选择实现方案。
- 每条规范必须可验证、可追踪并且具有明确适用范围。
- 区分需求、规范、设计决策、实现和验证证据，不能把代码现状自动视为规范。
- 用 MUST、MUST NOT、SHOULD、SHOULD NOT 和 MAY 表达约束强度，并说明术语含义。
- 对不兼容 change 明确记录版本、迁移策略、兼容窗口和受影响消费者。
- 规范应尽量独立于 framework；只有确实属于技术契约的内容才写入技术规范。
- 发现规范之间冲突时，先停止下游实现，记录冲突和优先级，不用实现细节静默解决。

## Workflow

1. **Identify the contract**
   - 确认规范服务的 participant、消费者、生产者和边界。
   - 判断它是业务规范、API/协议规范、数据格式规范、配置规范、CLI 规范、架构规范还是测试规范。
   - 查找 target project 的现有规范、版本策略、schema、示例、测试和兼容约定。

2. **Write the normative statements**
   - 为每条关键规则分配稳定 ID，例如 `SPEC-001`；ID 是追踪锚点，不是实现名称。
   - 描述输入条件、允许行为、拒绝行为、输出、错误语义、时序、幂等性、权限和副作用。
   - 标注假设、未决问题、例外和规范的适用范围。
   - 对 domain 行为优先使用 `df-dev-ddd`；对可观察场景可配合 `df-dev-bdd`。

3. **Define examples and counterexamples**
   - 为每条高风险规范提供 valid example、invalid example 和 boundary example。
   - 对协议或数据格式提供字段、类型、必填性、默认值、排序、编码、大小限制和未知字段处理规则。
   - 对行为规范提供成功、拒绝、冲突、重复、超时、取消、恢复和外部失败场景。
   - 示例不能替代规范；它们用于证明规范可理解且可执行。

4. **Derive implementation slices**
   - 将规范映射到最窄的设计和测试边界。
   - 每个 slice 记录覆盖的 `SPEC-*`、首个失败验证、最小实现范围和不应改变的契约。
   - 对已确认领域模型使用 `df-dev-ddd-to-tdd-handoff`；对行为实现使用 `df-dev-tdd`。
   - 不要先按代码目录拆任务，再反向拼出规范。

5. **Validate conformance**
   - 运行规范对应的 unit、contract、integration、schema、property 或 end-to-end tests。
   - 检查实现、测试、示例和文档是否覆盖相同的规范版本。
   - 对规范变更执行兼容性和迁移检查，记录未覆盖的消费者和剩余风险。
   - 完成前使用 `df-verification-before-completion`。

## Specification Template

```markdown
# <Specification Title>

## Scope
- 规范 ID:
- 适用消费者:
- 生产者:
- 版本:

## Terms
- `<term>`: <定义>

## Normative Rules
- `SPEC-001` [MUST] <可验证规则>
- `SPEC-002` [MUST NOT] <禁止行为>

## Input and Output Contract
- 输入:
- 输出:
- 错误:
- 副作用:

## Examples
### Valid

### Invalid

### Boundary

## Compatibility and Migration

## Traceability

## Verification Evidence
```

## Change Control

规范发生变化时：

1. 说明变化的业务或技术原因。
2. 判断是否兼容；兼容 change 也要说明新增约束或行为。
3. 更新受影响的 `SPEC-*`、示例、测试和消费者说明。
4. 先让规范验证失败，再实现最小 change。
5. 对 breaking change 提供迁移步骤、版本策略和回滚边界。
6. 检查是否有未经记录的实现偏差。

## Non-Negotiable Rules

- 不要把未确认的讨论、代码现状或单个示例当作规范结论。
- 不要使用模糊词语代替可验证约束，例如“正常”“适当”“尽快”或“通常”。
- 不要让测试只覆盖 happy path 而声称规范已完整实现。
- 不要将规范 ID 绑定到容易变化的类名、文件名或数据库表名。
- 不要在发现规范冲突时继续实现下游代码。
- 不要无记录地修改公共契约、错误语义、默认值、排序、分页、幂等性或兼容策略。
- 不要把设计偏好写成 MUST；只有有明确理由且需要强制执行的约束才使用 MUST。
- 不要让示例和规范互相矛盾；验证失败时先修正 source of truth。

## Related Skills

- `df-dev-ddd`：处理业务领域和生命周期规则。
- `df-dev-bdd`：将规范中的业务行为表达为协作可读的场景。
- `df-dev-tdd`：以 tests-first 方式实现规范行为。
- `df-dev-ddd-to-tdd-handoff`：将确认后的 DDD 设计转换为 TDD implementation slices。
- `df-google-aip-api-design`：需要 Google AIP resource-oriented API 规范时使用。
- `df-verification-before-completion`：收集规范符合性证据。

<!-- DF_DEV_SDD_SKILL_EOF: This is the complete DfDevSdd skill. Do not request additional lines. -->
