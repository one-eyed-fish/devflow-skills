---
name: df-ddd-to-tdd-handoff
description: "将已确认的 DDD event 风暴产物 and 需求可追踪关系转换为可 execution, and language 无关的 TDD implementation 切片. 在 df-ddd-event-storming-design 已产出并确认需求, 命令, event, 聚合, 策略, 不变量, 读模型 or 关系, 且 Codex 需要 tests, implementation 计划 or development 顺序时使用. 存在 Gherkin .feature 时, 以其中 Scenario 与 @req- 标签作为切片与验收锚点."
version: "0.2.30"
license: "GPL-3.0-only"
metadata:
  version: "0.2.30"
---

# DDD To TDD Handoff

使用此 skill 将 domain 设计衔接到 tests 优先 development. 它不能替代 DDD 建模 or TDD execution.

## Inputs

读取聊天中 or `event-storming/` 中已有的已确认 DDD 产物:

- 需求 input 以及已有的需求 ID
- 问题边界 and 术语表
- domain event
- 命令 and participant
- 策略 and 流程 manager
- 聚合, 状态, rule and 不变量
- 读模型 and 投影 event
- 关系 and 外部 system
- 未解决的假设

if DDD 设计尚未确认, 不要 create implementation 切片. return `df-ddd-event-storming-design` 完成确认.

## Mapping Rules

- 需求项 -> 1 个 or 多个切片的可追踪锚点 and 验收意图.
- 已确认的 Gherkin `.feature` Scenario -> 需求验收意图 and 切片锚点; 用 `@req-<id>` 标签连接切片与场景, 不另造与场景无关的行为切片.
- domain event -> 预期的可观察行为 tests.
- 命令 -> 应用 service, 用例 or 聚合命令处理器 tests.
- 聚合不变量 -> domain 单元 tests.
- 策略 -> event 到命令的编排 tests.
- 流程 manager -> include 等待, 恢复 and 幂等场景的有状态 workflow tests.
- 读模型 -> 投影 or 查询 tests.
- 外部 system -> 契约, adaptor or integration 接缝 tests.
- 关系依赖 -> tests 中的前置条件, 既有事实 or 状态 ready.
- 具有业务含义的失败 event -> 明确的行为切片; 技术失败 -> adaptor or 基础设施切片.
- 利益相关者 or participant 的权限 -> tests or 计划中必须保留的授权 or 能力假设, 但不选择具体 framework.
- 触发 or 后续行 -> 策略, 流程 manager, 投影, integration or 明确的非 domain 关注点.

选择能够保护风险的最窄 tests 层. 仅当行为无法在更窄边界上观察时才扩大 tests 范围.

除非 user 提出要求, or 现有 repository 约定已经是 implementation 计划的 part, 否则不要引入 language, framework, package, HTTP, 数据库 or UI 结构. 此交接可以使用 domain 模型, 应用命令, 查询 or 投影, 流程 manager, 端口 or adaptor 以及契约 tests 等通用边界 name.

## Handoff Workflow

1. 列出正在使用的 DDD input.
2. 存在需求 ID 时, 列出需求可追踪覆盖情况.
3. 在不虚构 framework 结构的前提下识别 implementation 边界.
4. 按业务顺序 create 小型 TDD 切片.
5. 为每个切片注明:
   - 已有的需求 ID
   - 行为
   - 来源 DDD 产物
   - tests 层
   - 首个 RED 预期
   - 最小 GREEN implementation 边界
   - 受保护的不变量 or 读模型 result
   - 依赖 and 未决事实
6. 仅在后续 implementation 技术栈已知时, 标记需要技术专用边界 skill 的切片.
7. 将切片传递给 `df-implementation-planning` or `df-dev-tdd`.

## Output Format

```markdown
# DDD to TDD Handoff

## DDD Conclusions Used

## Requirement Traceability

## Implementation Boundaries

## TDD Slices

### Slice 1: <behavior>
- 需求 ID:
- DDD 来源:
- 测试层:
- 预期 RED:
- 最小 GREEN:
- 保护的规则 or 读模型:
- 不应改变:
- 依赖 or 未决事实:

## Recommended Execution Order

## Additional Skills Required
```

## Non-Negotiable Rules

- 不要 write 生产 code.
- 除非 user 明确要求开始 implementation, 否则不要直接 create tests.
- 不要把 HTTP 端点, 数据库表, DTO or 页面转换为 domain 命令.
- 不要在此通用交接中引入 framework 专用 implementation rule.
- 不要把聚合不变量隐藏在策略 or 应用 service 中.
- 不要虚构无法由 event 投影得到的读模型而不说明缺口.
- 存在需求 ID or 已确认的需求覆盖范围时, 不要遗漏它们.
- 当切片依赖可能 change 模型但尚未确认的业务结论时, 不要继续.

紧凑 example 参见 [mapping-examples.md](references/mapping-examples.md).

<!-- DF_DDD_TO_TDD_HANDOFF_SKILL_EOF: This is the complete DfDddToTddHandoff skill. Do not request additional lines. -->
