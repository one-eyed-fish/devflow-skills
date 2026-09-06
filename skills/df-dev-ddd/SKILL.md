---
name: df-dev-ddd
description: "使用行为优先的 Domain-Driven Design（DDD）方法推进软件开发，从业务需求澄清、领域建模、Event Storming、Command/Event/Rule 设计，到已确认模型向 TDD implementation slices 的交接。适用于新功能、复杂业务规则、状态生命周期、多角色协作、跨聚合流程以及需要保持 domain language 一致的开发任务；不适用于仅有格式调整、纯技术升级或没有业务行为变化的简单修改。"
version: "0.2.37"
license: "GPL-3.0-only"
metadata:
  version: "0.2.37"
---

# DDD Development

使用此 skill 作为 DDD 开发任务的总入口。它负责组织开发顺序和边界，不替代领域建模、TDD 或具体技术栈 skill。

## Core Principle

先理解业务行为，再决定代码结构。不要从数据库表、CRUD 页面、HTTP endpoint、package、Entity 或 Repository 推导领域模型。

保持以下概念边界清晰：

- 需求条目描述 stakeholder 需要的结果，不自动成为 Command。
- participant 发起 Command，Command 表达业务意图，不表达 UI 操作或 HTTP 方法。
- Domain Event 表达已经发生且具有业务后果的事实，不表达缓存刷新、日志或普通数据更新。
- Aggregate 是 consistency boundary，由 Command、Invariant、生命周期和事件生产路径共同证明，不由名词或表直接决定。
- Policy 表达 event-to-command 的业务反应；需要等待、恢复、幂等或跨事务协调时，评估 Process Manager/SAGA。
- Read Model 服务查询需求，不应反向污染 Aggregate 状态。

## Routing Workflow

按以下顺序判断任务所处阶段：

1. **发现现有上下文**
   - 检查 target project 的规则、现有 domain 文档、术语表和近期相关实现。
   - 如果存在 `event-storming/`，先读取相关产物；它是当前项目上下文，不是假定必然存在的目录。
   - 记录现有需求、确认结论、假设和未决问题，不覆盖其他人的修改。

2. **判断是否存在 domain ambiguity**
   - 如果业务 language、participant、权威来源、状态转换、删除含义、关键 rule 或边界不清，暂停 implementation。
   - 使用 `df-dev-ddd-event-storming-design`，先完成需求收集、问题域边界、participant/authority 和候选 event 筛选。
   - 在上游确认门未完成前，不创建完整 Aggregate、Command、Event、Read Model 或生产代码。

3. **确认 Event-Command-Rule 模型**
   - 为每个 Command 指定 participant、业务意图、输入和满足的需求。
   - 为每个 Domain Event 证明业务事实、生产路径和至少一个非查询业务消费者。
   - 为每个 Aggregate 状态说明它被哪个 Command、Invariant、生命周期或事件生产决策直接使用。
   - 为 uniqueness、移除、恢复、外部同步和权限等高风险规则记录范围、时机和冲突结果。
   - 发现多个合理边界时，比较方案并记录推荐理由，而不是默认按表拆分。

4. **交接到可执行开发切片**
   - 仅当 DDD 结论已确认后，使用 `df-dev-ddd-to-tdd-handoff`。
   - 将需求、Command、Event、Invariant、Policy、Process Manager、Read Model 和外部边界映射为最窄的 TDD implementation slice。
   - 每个 slice 必须包含行为、来源、测试层、首个 RED 预期、最小 GREEN 边界、依赖和未决事实。

5. **进入 implementation**
   - 根据 target project 的实际技术栈选择对应的 implementation skill；不要在通用 DDD skill 中虚构 framework、目录、数据库或 API 结构。
   - 使用 `df-dev-tdd` 执行 tests-first workflow；复杂或多步任务先使用 `df-implementation-planning`。
   - 业务 rule 优先放在能够保护 Invariant 的 domain boundary 中，不要把核心规则隐藏在 Controller、Repository、Listener 或通用 Service 中。
   - 使用 `df-glue-coding` 复用 target project 的既有 pattern，但不能让旧代码结构替代已确认的领域模型。

6. **验证完整链路**
   - 验证需求到 Command/Event/Policy/Read Model 的追踪关系。
   - 验证成功、拒绝、冲突、取消、过期、重复执行和外部失败等已确认场景。
   - 验证实现没有引入未经确认的业务假设或查询侧状态。
   - 按 target project 可发现的命令运行测试、类型检查、静态检查和必要的集成验证。
   - 完成前使用 `df-verification-before-completion`，并明确报告已验证项、跳过项和剩余风险。

## Design Gates

在继续下游工作前，必须通过适用的 gate：

- **Requirements gate**：需求、stakeholder、受影响主体、触发条件和缺口已足够明确；新需求应先用 `df-dev-bdd` 把行为成文为 Gherkin `.feature`，完成产品经理、项目经理与开发者对齐。
- **Problem-domain gate**：当前 domain 的职责、排除范围、歧义术语和 CRUD 模板风险已确认。
- **Authority gate**：Command 发起者、受影响主体、外部 system 和权威来源已确认。
- **Rule gate**：关键生命周期、身份、唯一性、删除、冲突和后续动作已确认。
- **Model gate**：已接纳 event 具备业务事实、生产路径和非查询消费者；Aggregate 边界能够解释 Command/Event/Rule。
- **Handoff gate**：每个 implementation slice 都能追踪到 DDD 结论，并且没有把技术结构冒充业务模型。

任何一个 gate 被未决事实阻塞时，输出阻塞原因、受影响的下游概念和一个最聚焦的确认问题。

## Output Format

根据当前阶段使用最小必要输出：

```markdown
# DDD Development

## Current Stage

## Confirmed Context

## Domain Decisions

## Open Gates

## Recommended Next Skill

## Implementation Slices

## Verification Plan
```

如果任务仍处于建模前阶段，优先输出 `Current Stage`、`Confirmed Context`、`Open Gates` 和一个聚焦确认问题，不要臆造完整领域模型。

## Non-Negotiable Rules

- 不要因为存在数据库表、页面或 API 就创建同名 Aggregate。
- 不要把 CRUD 操作、DTO、Controller 方法或 Repository 方法直接命名为 domain Command。
- 不要为了 Read Model 投影、页面刷新、报表字段或缓存更新虚构 Domain Event。
- 不要在 DDD 结论未确认时创建生产 code、tests、持久化 mapping 或 framework 结构。
- 不要将 Aggregate Invariant 隐藏在 Policy、Application Service 或 Handler 中。
- 不要将查询字段加入 Aggregate，除非已有 Command、Invariant、生命周期或 consistency 证据。
- 不要把外部同步简化为无规则的 upsert；保留接纳、拒绝、冲突、延期和权威来源语义。
- 不要为了追踪完整而制造不存在的 Command 或 Event；追踪缺口应被明确报告。
- 不要重新生成整个既有模型；只修改已确认阶段及其直接受影响的产物。
- 不要生成 Java、Kotlin 或其他实现代码；本 skill 只负责 DDD development routing and handoff。

## Related Skills

- `df-dev-ddd-event-storming-design`：需求澄清、Event Storming 和领域模型设计。
- `df-dev-bdd`：把需求行为成文为可验收、可执行的 Gherkin `.feature` 契约，供需求对齐与验收追踪。
- `df-dev-ddd-to-tdd-handoff`：将已确认 DDD 产物转换为 TDD implementation slices。
- `df-dev-tdd`：执行 tests-first development。
- `df-implementation-planning`：创建具体、分步且可验证的 implementation plan。
- `df-glue-coding`：在 domain 决策明确后复用 target project 的工程 pattern。
- `df-verification-before-completion`：完成前收集验证证据。

<!-- DF_DEV_DDD_SKILL_EOF: This is the complete DfDevDdd skill. Do not request additional lines. -->
