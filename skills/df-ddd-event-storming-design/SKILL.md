---
name: df-ddd-event-storming-design
description: 使用 Event Storming, CQRS and 需求追踪进行通用 DDD domain 建模. 当 Codex 需要澄清原始业务需求, 将干系人诉求拆分为需求条目, 持续演进 domain 模型, 识别 participant and 多角色协作, Domain Event, Command, Policy, Aggregate, Domain Service and Read Model, generate 结构化 Markdown or 可选的 Mermaid/PlantUML 图表, 以及审查由 CRUD, 数据库, package 结构 or DDD 术语 driven 而非由问题域 driven 的设计时, 使用此 skill. 尤其适用于公司, 部门, 岗位, 员工, 账号, 角色 or 权限管理等看似 CRUD 的后台需求, 此类需求应采用行为优先建模, 而不是建立扁平的名词 Aggregate.
version: "0.2.32"
license: "GPL-3.0-only"
metadata:
  version: "0.2.32"
---

# DDD Event Storming Design

## Core Rule

将 Event Storming 作为 DDD 建模的核心入口. 当 user input 仍需在需求层面梳理时, 可以先进行需求收集.

当 input 是原始需求, 会议记录, feature 列表, User Story 集合, or 混合了 CRUD, 页面 and API 的 description 时, 应先进行轻量级需求收集, 再开展 domain 建模. 需求收集属于建模前探索: 识别干系人, 需求条目, 业务主体, 触发条件, 约束, input/output, 假设 and 缺口. 不得直接把收集 result 转换成 Aggregate, Command, Domain Event, API, package or code.

把 Event Storming 视为先协作发散, 再有纪律收敛的过程. 首先从业务 language, participant target, 生命周期变化, 失败, 外部事实 and 查询需求中建立广泛的候选 event 池. 只有当候选 event 具有业务含义, 存在生产路径, 并且至少有 1 个业务消费者会据此 change participant 选项, Command 侧 rule, Policy/流程, Aggregate or 下游业务能力时, 才将其接纳为 Domain Event. 仅凭 Read Model 投影, 页面展示, 缓存刷新 or 查询完整性, 不足以接纳 Domain Event.

不得把首次头脑风暴得到的 event 列表当作最终模型. 候选 event 是 work 材料, 已接纳的 Domain Event 才是设计结论.

从当前问题域, 业务事实, Domain Event, Command, rule, 状态变化 and Read Model 开始, 之后再推导 Aggregate.

不得从数据库表, CRUD 页面, HTTP API, package 结构, Entity, Aggregate Root, Repository or 战术 DDD 术语开始.

假定很多 user 不熟悉 DDD. 他们可能用表, 字段, CRUD 页面, module, Controller, DTO, or"管理公司/部门/岗位/员工"来 description 问题. 应把这些 language 视为原始探索 input, 而不是建模 framework.

始终将数据 driven or CRUD driven 的请求转换为业务 event 探索:

- 表名 or Entity 名 -> 可能受影响的业务主体, 参考数据, Read Model or 生命周期候选项
- 字段 -> 可能的业务事实, 决策, Invariant or 投影需求
- create/update/delete 操作 -> 解释 change 为何重要的业务 Command
- 状态字段 -> 生命周期 event and rule 转换
- 外键 -> 业务关系, 所有权, 依赖 or consistency 问题
- sync/upsert 表述 -> 外部事实, 接纳/拒绝/冲突/延期 event, 以及权威来源问题
- 后台页面 -> participant target, 职责, 审批, 所有权变化 and 审计关注点

不得将 user 的数据模型原样复述成 DDD 模型. if user 使用 CRUD 术语提出请求, 应先简要说明转换边界, 再使用业务 language 依次完成各确认门.

在最终确定 Command and Domain Event 之前, 始终识别业务 participant, 外部 system, 定时器 and 受影响主体. Command 由 participant 发起; 已接纳的 Domain Event 会 change 1 个 or 多个 participant or 业务能力所关心的事项. 应把 Read Model 视为投影消费者 and 探索线索, 而不是 Domain Event 存在的独立证据.

除非 user 明确要求 implementation, 否则只 generate domain 设计产物. 不得 generate code, tests, framework 结构, 持久化 mapping or TDD 计划.

## Operating Mode

当 user 持续演进相同业务 domain 时, 优先采用持久化 domain 建模.

使用混合 workflow: via 协作式头脑风暴进行探索, via 产物引导进行持久化收敛.

- 头脑风暴用于发散探索: via 短小章节 and 聚焦的确认问题, 澄清业务边界, participant, 权威来源, 候选 event, 备选方案 and 未解决 rule.
- 产物引导用于收敛: 某章节稳定 or 得到明确确认后, 将其记录到对应模型产物中, 并让后续章节依赖它.
- 对新的 DDD 需求, 不得采用 OpenSpec 风格的"once generate 所有产物"流程. 不能因为已知完整 repository 结构, 就让 Event Storming 跳过上游确认门.
- 即使 user 希望快速获得草稿, 也必须停在首个尚未确认且可能 change 下游 Domain Event, Command, Aggregate or Read Model 的确认门.
- 当 user 需要 file 时, 应将每个 `event-storming/` file 视为阶段产物. 只 create or update 结论已确认的阶段, 不得用推测内容填充下游 file.

需求 driven 建模采用3个阶段:

1. 必要时进行需求收集: 把原始需求拆分为需求层面的 table, 不将 DDD 战术术语作为结论. 当 input include 多个 user 可见需求 or 之后会 implementation 时, 分配稳定的需求 ID.
2. 设计草稿: 分析请求, 读取相关现有模型 file(如有), 对候选 event and 建模备选方案进行头脑风暴, 推断后续最有 value 的设计章节, 并且只呈现当前确认门可安全验证的结论. 只有在影响完整候选模型的上游确认门已确认, or user 已明确给出答案后, 才能呈现完整候选模型.
3. 章节确认 and 持久化: 在草稿形成过程中 and user 逐节确认. 只有 user 明确确认候选模型, change 章节 or 1 组具体 change 后, 才能 create or update `event-storming/` file.

新需求 or change 需求在确认前, 不得 create or update 持久化模型 file. user 需求通常不完整, 请求者也可能不知道哪些缺失事实会影响 DDD 建模.

不要用无关的澄清问题打断初始设计草稿. 但是, 当确认门控制下游建模时, 必须先询问确认门问题, 再展开依赖章节. if 缺失信息不阻塞当前确认门, 应作出最小合理假设, 将其标记为推断结论, 并纳入确认 manifest.

例外: 当请求是类似 CRUD 的名词列表(例如"公司, 部门, 岗位, 员工"or"user, 角色, 菜单, 权限")时, 即使现有 code include 足以构建完整草稿的行为, 也不得在首次响应中臆造 or output 完整管理模型. 应先标记 CRUD 模板风险, 然后停在问题域确认门, 提出行为优先的边界建议 and 1 个聚焦确认问题. 只有该门得到确认 or 纠正后, 才能继续处理 participant, Domain Event, Command, Aggregate and Read Model.

if work 区 include `event-storming/` 模型 repository, 应先读取相关 file, 但在获得确认之前只将其作为只读 input.

if 不存在:

- user 需要 file 时, 先呈现最小 available 的候选模型 repository 内容 and 结论确认 manifest.
- user 只需要讨论时, 在对话中 output 相同结构, 不 create file.

不要求 user 预先提供完整需求. 接受小步增量, 基于已有信息进行设计, 并将假设, 备选方案 and 缺失业务事实作为待确认结论公开, 然后再持久化.

## Requirements Intake

当 input 宽泛, 杂乱, 呈现为 implementation 形式, or 之后可能转为 implementation work 时, 使用需求收集. 保持 language and framework 中立.

此阶段只 output 需求层面的事实:

- `干系人表`: 角色, target/痛点, 权限 or 限制, 备注.
- `需求条目表`: 需求 ID, 场景, 干系人/受影响主体, 业务主体, 操作 type(如 view/create/modify/close/async/timer), 前置条件, 约束, input/output, 缺口.
- `业务主体视图`: 业务主体, 覆盖的需求 ID, 职责/rule, 关键 input/output.
- `触发/后续动作表`: 触发条件, 后续动作 or 影响, 相关干系人, 受影响业务主体, 假设.
- `业务规则 and 依赖`: rule/约束, 相关主体, 依赖的外部 system or 先前事实, 备注.
- `假设 and 待确认清单`: 条目, 说明, 已知负责人, 必要时的优先级.

rule:

- 需求 ID 是追踪锚点, 不是架构 name.
- `业务主体视图` 可以提出待探索主体, 但在没有 Event-Command-Rule 证据时, 不得将其转为 Aggregate.
- create/update/delete 等操作 type 仅是收集标签. 在形成 Command 前, 必须将其转换为业务意图.
- 触发/后续动作行是 Domain Event, Policy, 流程 or Read Model update 的候选材料; 未经筛选不得接纳为 Domain Event.
- if user 只需要需求分析, 应停在此处并在建模前请求确认.

## Brainstorming Adaptation

采用协作式头脑风暴中有用的部分, 同时不削弱 DDD 纪律:

1. 先探索 context: 提出 change 前, check 现有需求, 模型 file, 文档 and 近期 domain 决策.
2. 有意识地发散: 从每个合理的 participant 视角, 下游消费者, 生命周期转换, 审批/拒绝, 同步 result, 异常 and 查询需求中收集候选 event.
3. 保持候选项低成本: 将推测项标记为候选 event, 而非最终 Domain Event.
4. 当边界 or 生命周期存在争议时, 对比 2-3 种建模方案, 例如单个 Aggregate and Process Manager, local event and 外部 system 事实, 当前域 event and 仅用于 Read Model 的投影.
5. 推荐 1 种方案, 并用 domain 术语说明取舍: consistency 边界, participant 职责, event 生产路径, 投影完整性, Policy 复杂度 and 未来歧义.
6. 呈现设计章节供确认. 在推进过远之前, 请 user 确认 or 纠正每个有意义的章节; 需要追问时, 每次只问 1 个聚焦问题.

为每个候选 event 记录足够支持收敛的信息:

- 来源: user 陈述, 现有模型, 推断的 participant target, Read Model 需求, Policy 反应 or 外部事实
- 使用已完成业务时态的可能 event name
- 已知的发起 participant or 外部 system
- 受影响主体 and 下游消费者
- Read Model 之外的业务消费者, 以及它会 change 的行为, rule, Policy, 流程 or 能力
- 是否仅因查询/展示/投影而需要该候选项, 因而应降级
- 可能的生产者: Command, Aggregate, Policy, 流程 or 外部事实
- 保留它的业务理由
- 拒绝, 拆分, 重命名, 降级为 Read Model 数据 or 标记为未解决的理由

只有已接纳 event 才能进入正式的 `Domain Event Catalog`. 被拒绝 or 未解决的候选项可以作为筛选备注 or 确认项出现在草稿中, 但除非得到确认, 否则不得作为最终 event 持久化.

## Confirmation Protocol

优先逐节增量确认, 而不是最后进行 once 大规模确认.

在设计对话期间:

- 主要章节稳定后随即确认: 问题边界, participant, 候选 event 筛选, 建模备选方案, 已接纳 event, Command, Policy, Aggregate, Read Model and 持久化 change.
- 呈现章节后, if 答案可能 change 后续章节, 应询问其是否已足够正确, 可以继续.
- if user 在对话中确认, 记录 or 纠正某章节, 应将其视为已确认 or 已纠正. 结尾不得要求 user 再次确认相同结论.
- if user 拒绝 or change 某章节, 应先修订下游 Domain Event, Command, Aggregate, Read Model and 确认项, 再继续.
- 当缺失事实阻塞后续章节时, 每次只问 1 个聚焦问题.

关键业务决策需要 user 确认时:

- if 当前环境提供 `request_user_input`, 应使用它并提供 2-3 个互斥选项. 将推荐选项放在首位, 并说明每个选项的建模后果.
- if `request_user_input` unavailable, 不得将下游设计呈现为最终结论. 使用普通文本明确说明继续前必须确认该决策, 然后提出 1 个聚焦确认问题.
- 不得把多个高影响决策合并到 1 个最终答复 or 1 个批量确认 manifest 中. 应在相关确认门依次询问.

对决定下游建模的章节使用确认门. 除非 user 已明确提供答案, 否则不得越过这些确认门完整展开后续章节:

1. 需求收集门: 当 input include 很多场景 or 干系人时, 先确认需求条目, 干系人, 业务主体, 触发条件 and 主要缺口, 再将其作为建模 input.
2. 问题域门: 确认 domain name, include 职责, 排除职责, 以及请求是否存在 CRUD 模板风险. 应在最终确定 participant 角色, event 筛选, Command, Aggregate or Read Model 之前完成.
3. participant and 权威来源门: 确认 Command 发起者, 受影响主体, 外部 system, 下游 system, 以及 OA 等外部来源是否具有权威性. 应在推导已接纳 event and Policy 之前完成.
4. 关键 rule 门: 确认会塑造 Domain Event and Aggregate 边界的业务 rule, 例如 single or 多个任职, 负责人资格, 删除 or 归档, 冲突优先级, 以及自动 or 手动后续动作. 应在最终确定 Domain Event, Command, Invariant and Policy 之前完成.
5. 建模备选方案门: 当存在 2-3 种合理方案时, 应先确认推荐方案 or user 选择的备选方案, 再最终确定 Aggregate 边界 and Read Model.
6. 持久化门: write file 前, 只确认尚未确认 or 已 change 且对持久化敏感的结论.

当请求看似 CRUD or include 有争议的边界时, 优先采用分阶段响应:

1. 只呈现后续确认门章节, 并简要说明其重要性.
2. 提出 1 个聚焦确认问题.
3. 只有该门得到确认 or 纠正后, 才继续筛选候选 event.

if 早期确认门尚未确认且很可能 change 下游模型, 应避免在单次响应中 generate 完整的"边界 + participant + Domain Event + Command + Policy + Aggregate + Read Model"草稿.

将最终 `结论确认清单` 用作差异 manifest, 而不是重复审批表. 它只能 include:

- 逐节对话中尚未确认的结论
- user 上次确认后发生变化的结论
- 未解决的备选方案, 假设, 歧义术语 or 缺失业务 rule
- 对持久化敏感的 change, 例如重命名, 拆分, 合并, 删除 or 移动模型概念

if 所有 and 持久化相关的结论都已在对话中确认, 应说明没有额外确认项, 并按 user 要求 execution 持久化操作.

## Model Repository

持久化模型时使用以下结构:

```text
event-storming/
  README.md
  requirements.md
  actors.md
  domain-boundary.md
  glossary.md
  events.md
  commands.md
  policies.md
  read-models.md
  relationships.md
  completeness-check.md
  aggregates/
  <aggregate-name>.md
```

将这些 file 视为有顺序的设计产物, 而不是需要立即完成的 check manifest:

1. `requirements.md` 可选, 但对大型 or 原始 input 很有用. 它在 DDD 建模前记录需求层面事实 and 追踪锚点.
2. 在最终确定 participant, Domain Event, Command, Aggregate or Read Model 之前,`domain-boundary.md` 必须稳定.
3. 接纳 Domain Event and Command 之前,`actors.md` 必须稳定, 因为 Command 发起者 and 受影响主体决定 event 含义.
4. `events.md` 必须区分候选 event 筛选备注 and 已接纳 Domain Event. 已接纳 event 必须具有业务含义, 生产路径 and 下游后果.
5. `commands.md`,`policies.md` and `relationships.md` 依赖已接纳 event and participant 权限.
6. `aggregates/<aggregate-name>.md` 依赖 consistent 的 Command-Event-Rule 模型. 不得仅因存在名词 or 表就 create Aggregate file.
7. `read-models.md` 依赖已接纳 event, 投影需求 and 明确的非 event 查询来源. if Read Model 无法从已接纳 Domain Event 投影, 不得为了投影臆造 event; 应先 check 当前状态查询, 查询侧 Join, 技术投影 input, 已接纳 event 的丰富化 Payload, or 外部 integration 来源.
8. `completeness-check.md` 是最终确认门, 应记录仍未解决的问题, 而不是将其隐藏在下游产物中.

file 职责:

- `README.md`: 仅作为入口索引; 记录当前模型状态 and file 导航.
- `requirements.md`: 干系人表, 需求条目, 业务主体 view, 触发/后续动作表, 约束, 假设 and 需求 ID.
- `actors.md`: 业务 participant, 受影响主体, 外部 system, 定时器, 以及它们发起 or 关心的 Command/Domain Event.
- `domain-boundary.md`: 当前问题域, include 职责, 排除事实, 假设 and 演进备注.
- `glossary.md`: Ubiquitous Language and 业务术语.
- `events.md`: 全局 Domain Event 索引.
- `commands.md`: 全局 Command 索引.
- `policies.md`: Event-to-Command 自动化 rule and Process Manager 候选项.
- `read-models.md`: 查询需求, Read Model 字段 and 投影 event.
- `relationships.md`: 全局依赖 and 订阅关系.
- `completeness-check.md`: 完备性 and 设计质量 check.
- `aggregates/<aggregate-name>.md`: 单个 Aggregate 的 Command, Domain Event, 状态, rule and 局部关系.

## Incremental Update Rules

针对每个 user 请求:

1. 将请求 category 为新能力, 能力 change, 问题域扩展 or 设计审查.
2. 推导草稿前, 只读取相关模型 file.
3. 当缺少原始需求, 干系人列表, 触发表 or 需求 ID, 且补充它们能改善追踪时, 先 create or update 需求收集.
4. 选择最终 event 前, 先建立候选 event 池.
5. 当候选 event, participant 职责 or Aggregate 边界存在多种合理解释时, 对比建模方案.
6. 上游确认门未解决时, 只 generate 后续安全的设计产物. 只有边界, participant/权威来源, 关键 rule and 建模备选方案已确认 or 已明确提供时, 才 generate 完整候选设计.
7. 将假设, 歧义术语, 备选解释 and 缺失业务 rule 明确标为推断设计结论, 而不是建模前问题.
8. 当设计章节的结论影响后续建模选择时, 逐步确认这些章节.
9. 确认后, 只针对已确认阶段及其直接受影响的依赖项, 同时 update 受影响索引 and Aggregate file.
10. 重命名, 拆分, 合并 or 移动概念时, 保留语义演进备注.
11. if 新需求暴露旧模型不完整, 应 fix 模型, 而不是用 Policy, Service or Handler 隐藏缺口.
12. 最后简要总结 change file, change domain 概念, 新解锁的后续产物 and 剩余问题.

除非 user 要求, or 现有模型 inconsistent 到无法安全 update, 否则不得重新 generate 整个模型.

## Modeling Principles

- 建模当前问题域. 不得预先拆分 Bounded Context.
- 保护建模 framework. user 表述可以由数据 driven, 但设计响应必须由行为 and event driven.
- 为 Aggregate 命名前, 先将名词, 字段, 状态 and CRUD 操作转换为 participant target, 生命周期 event, rule and Read Model 需求.
- 将 participant 视为 first-class 建模 input. 区分 Command 发起者, 受影响主体, 审批者, 审计者, 下游消费者, 定时器 and 外部 system.
- 只有能力明确位于当前 system/问题域之外时, 才标记外部 system.
- 使用 domain 专家能够理解的业务 language.
- 先建模行为, 再建模结构.
- 对后台 system 需求, 将"管理"页面视为探索线索, 而不是 domain 模型. 把名词列表 refactor 为生命周期 event, 任职, 审批, 所有权变化, 同步事实 and 跨角色后果.
- 将 CQRS 视为 1 种建模视角: Command 经 domain 模型 change 业务状态; 查询由 Read Model 满足.
- Read Model 应记录信息来源, 但查询需求本身不得 create Domain Event. 仅供 Read Model 使用的字段可以来自当前状态查询, 查询侧 Join, 技术投影 input, 外部来源 or 已接纳 event Payload.
- 当 Command, Domain Event, Aggregate or Read Model 不能相互解释时, 继续迭代.
- 将 Command, Domain Event, Aggregate 状态, Aggregate 方法 and Read Model 字段视为需要证据的设计主张. if unique 证据只是"表/API/页面有这个字段", 应将其降级为探索材料, 直到业务 rule or 消费者证明它应当存在.

## Design Proof Gates

在最终确定 Command, Domain Event, Aggregate, Aggregate 方法 or Read Model 之前使用这些门. 审查 or 持久化模型时必须 execution.

### Event Admission Gate

对每个已接纳 Domain Event, 证明:

- 业务事实: 用过去时说明发生了什么
- 生产者: participant/外部 system -> Command/事实 input -> Aggregate/流程 -> Domain Event
- 非查询消费者: 该事实影响的 participant 选项, Command 侧 rule, Policy/流程, Aggregate 关系, 生命周期 or 下游业务能力
- Read Model 影响(如有): 哪些投影 and 字段发生变化

分析中被拒绝或降级的事实记录到非正式拒绝日志, 供未来识别重复; 不得进入正式 `Domain Event Catalog` or Aggregate event 列表. 该日志不参与正式设计完整性校验.

### Command Granularity Gate

根据 participant 意图 or 外部事实 input 边界设计 Command, 而不是根据可能 event 的排列组合设计.

- 当多个 result 属于相同 participant 意图 and consistency 边界时, 1 个 Command 可以产生多个 Domain Event.
- 不得仅因存在不同 event 组合就 create 独立 Command.
- 除非发起 participant or 外部 system 确实提交 1 个权威事实 package, 并且 Aggregate 能够 consistent 地作出决策, 否则不得 create single"全部应用/同步/update"Command.
- 当 Command 可以产生多个 Domain Event 时, 应解释这些 event 为何是 1 个业务决策的 result, 而不是独立动作.

### Aggregate State Necessity Gate

对每个 Aggregate 状态项 or 属性, 至少证明 1 种直接用途:

- Command/业务方法读取它, 以决定是否允许某动作
- Invariant or uniqueness rule 依赖它
- 它影响 event 生产, 拒绝, 拆分 or Payload 丰富化
- 它表示身份, 生命周期, 所有权, 父子关系, or execution consistency 所需的 other 状态

if 当前 or 已确认的未来业务方法均不使用该状态项, 应将其从 Aggregate 设计中移除, 并重新 category 为 Read Model 数据, 持久化元数据, 审计/日志材料, 同步元数据 or 未解决的探索材料.

### Identity And Uniqueness Gate

按 participant/来源建模身份 and uniqueness, 不得归并为 1 个通用的"name/code 必须 unique"rule.

对每条 uniqueness rule, 记录:

- 依赖者: 人类 participant, import 操作员, 外部主 system, 下游 system or Policy
- 身份字段 and 范围: 租户, 公司, 父级, 外部 ID, code, name, 生效日期 or other 边界
- execution 时机: Command 侧强 consistency, 外部接纳 check, 延迟对账 or 仅查询检测
- 冲突 result: 拒绝, 纠正, 合并, 覆盖, 忽略 or 仅记录日志

if 不同 participant 使用不同身份 rule, 即使 rule 涉及相同主体, 也要保持为独立 rule.

### Lifecycle Removal Gate

对 delete, unregister, close, archive, disable or decommission 行为, 证明:

- 移除的确切业务含义
- 真正阻塞移除的业务事实, 而不只是间接结构子项
- history 引用是否仍然有效
- 恢复是否是实际业务能力; if 不是, 不得添加恢复 Command or Domain Event
- 移除后哪些下游 participant, Policy, rule or Read Model 会变化

### Read Model Source Gate

对每个 Read Model 字段, 记录其来源:

- 已接纳 Domain Event 的 Payload or 投影
- 从 Command 侧持久化进行当前状态查询
- 查询侧 Join
- 技术投影 input
- 审计/日志/故障排查来源
- 外部读取来源

不得只为填充 Read Model 字段而添加 Domain Event. Read Model 缺失字段首先是来源问题, 只有存在非查询业务消费者时, 才可能是 Domain Event 缺口.

## Traceability Rules

存在 `requirements.md` or 需求 ID 时, 维护从需求到 domain 模型的轻量追踪:

- 每个已接纳 Command 应列出其满足的需求 ID or 场景.
- 每个 Read Model 应列出其 service 的查询/view 需求 ID.
- 每个已接纳 Domain Event 应列出生产它的 Command, Policy, 流程, 外部事实 or 触发行.
- 每个触发/后续动作需求应归结为已接纳 Domain Event + Policy/流程, Read Model 投影, 外部 integration 关注点, or 带理由的拒绝/降级候选项.
- if 某需求没有 Command, Domain Event, Read Model or 明确拒绝, 应在 `完备性检查` 中标记为未覆盖.
- 不得让可追踪性强行制造虚假 Domain Event or Aggregate. 可追踪性用于暴露缺口, 不能凌驾于 domain 建模纪律之上.

## Learning And Review Adaptation

当 user 正在学习 DDD, 比较方案 or 审查模型时, 添加简短教学辅助, 但不要把响应变成长篇讲授:

- 用 1 句话说明建议背后的原则.
- 使用小型对比, 例如需求标签 and Command, 触发行 and Domain Event, 业务主体 and Aggregate.
- 只为当前阶段添加紧凑 check manifest, 例如 Aggregate 边界, event 生产路径 or Read Model 投影.
- 除非 user 要求, 否则避免特定 framework or 特定 language 的建议.

## Workflow

遵循以下阶段顺序. if 某确认门问题可能 change 后续模型, 则后续阶段被阻塞.

```text
requirements intake when needed
  -> problem boundary
  -> actors and authority
  -> 逐条识别与接纳事件
  -> event screening
  -> accepted events
  -> commands and policies
  -> aggregates
  -> read models
  -> relationships and completeness check
```

### 0. Requirements Intake

只有 input 在建模前需要需求层面结构时, 才使用此阶段.

记录干系人, 需求条目, 业务主体, 触发/后续动作, 约束, input/output, 假设 and 缺口. 当需求超过 1 个 or 之后可能 implementation 时, 分配 `REQ-001` 等稳定 ID.

将此 output and DDD 结论明确分离:

- 需求条目不是 Command.
- 业务主体不会自动成为 Aggregate.
- 触发行不会自动成为 Domain Event.
- 操作 type 不是业务意图.

if 收集 result 可能 change domain 边界, participant, Domain Event, Command, Read Model or 后续 implementation 切片, 应先确认收集 result.

### 1. Define Scope

重新表述当前问题 or 增量.

记录:

- include 的业务职责
- 排除的背景事实
- participant 群体 and 受影响主体
- 假设
- 歧义术语
- 备选解释
- 阻塞性未知项

除非无法 generate 任何有用模型, 否则不要在首份草稿前提出针对性问题. 优先设计, 将不确定点标记为推断结论, 并在设计结论可见后请求确认.

### 1.5 Identify Actors And Collaboration

列出 Domain Event 前, 识别:

- Command 发起者: 可以请求状态 change 的人员, 角色, 定时器 or 外部 system
- 受影响主体: 业务状态发生变化的人员, 组织, 资产 or 记录
- 决策者: 负责批准, 拒绝, 转移 or 覆盖的角色
- 下游消费者: 依赖 result 事实 or Read Model 的角色 or system
- 边界候选项: language or 所有权不同的概念, 例如作为登录账号的 `User` and 作为花名册人员的 `Employee`

为每个主要场景 generate 紧凑链路:

```text
Actor -> Command -> Event(s) -> Affected subject/read model -> Follow-up policy or open question
```

if 不同 participant 可以发起相似 Command, 且差异会 change 必填字段, 权限假设, Domain Event, Policy or 审计含义, 则应对该差异建模.

### 1.6 Identify Business Facts One At A Time

选择正式 Domain Event 前, 先 generate 候选 event 池.

寻找:

- participant 可感知的 result
- 生命周期转换
- 批准, 拒绝, 转移, 覆盖, 取消 and 过期
- 已接收, 接纳, 拒绝, 延期, 冲突 or 失败的外部事实
- Policy 触发点
- Read Model 投影需求
- 具有业务含义的异常
- 可能隐藏具体业务事实的模糊数据 change 词语

不得仅因不确定就过早丢弃候选项. 保留为候选项并附上不确定性, 之后 via 筛选 and 确认收敛.

使用以下问题筛选每个候选项:

- 业务是否关心该事实已经发生?
- participant, 定时器, Policy, Process Manager, Aggregate or 外部 system 能否生产它?
- 它是否会 change participant 选项, 受影响主体的生命周期, Command 侧 rule 决策, Policy 反应, 流程, other Aggregate or 下游业务能力?
- unique 消费者是否为 Read Model, 页面, 报表, 缓存 or 投影? if 是, 应拒绝其作为 Domain Event, 并将需求记录为查询侧数据, 技术投影, 当前状态查询 or 审计/日志材料.
- 它是否足够具体, 还是应拆分 or 重命名?
- 它是否位于当前问题域内, 还是仅为 integration/技术细节?
- 保留它是否改善 Event-Command-Read Model 的解释, 还是只 mapping CRUD 数据 change?

### 2. Identify And Accept Domain Events

从业务分析中逐条识别业务事实. 事件优先于命令被发现, 但必须随后反推出至少一个命令解释并验证业务消费关系; 未完成时只能作为临时分析事实.

只保留当前问题域为业务 rule, 状态决策, workflow 推进, Policy/流程反应, Aggregate 协作 or 下游业务能力所需的事实. 不得仅因 Read Model 需要刷新 or 展示字段, 就将某事实保留为 Domain Event.

rule:

- 使用已完成的业务时态命名 event, 例如 `订单已提交`,`书已归还`,`月度考勤已结算`.
- 优先使用具体业务事实, 而不是通用数据 change 事实. 避免使用 `信息已变更`,`资料已更新`,`状态已修改` or `记录已删除` 等模糊 event, 除非被 change 的具体属性没有业务特定含义; 使用通用 event 时, 应解释其可接受的原因.
- if 不同 Policy, Read Model or participant 后果可能适用, 应将 `已停用 or 解散` 等组合事实拆分为独立 event.
- 除非业务明确关心, 否则排除日志, 消息, 缓存刷新, 接口 call and 通知等技术事实.
- 排除当前问题域之外的事实.
- 只有失败本身具有业务含义时, 才对失败 event 建模.
- 每个当前域 event 都必须有生产路径: participant, Command, Aggregate/流程, 以及有意义的 result.

### 3. Derive Commands From Events

为每个已识别事件反推出一个或多个业务 Command. 事件是中心节点, 命令来源不唯一; 每个来源分别记录发起者, 业务意图, 前置条件和生产场景, 只有完全等价时才合并.

Command 是发送给 domain 模型, 用于完成有 value 业务动作的指令.

rule:

- 将 Command 命名为业务动作, 例如 `提交订单`,`签到`,`结算月度考勤`,`归还图书`.
- 为每个 Command include 发起 participant. if 相同业务动作可由不同 participant or system 发起, 应解释它是带 participant 特定 rule 的 single Command, 还是多个独立 Command.
- 当存在更精确的业务意图时, 避免使用 `新增`,`修改`,`删除`,`维护`,`管理`,`变更信息` or `同步数据` 等 CRUD 模板 name. 使用能揭示 change 为何重要的 name, 例如 `任命部门负责人`,`登记员工入职`,`确认OA员工同步结果` or `撤销岗位任职`.
- Command 不是 HTTP API, UI 动作, Controller 方法 or Use Case.
- 1 个 Command 可以产生多个 Domain Event.
- 定时器触发的行为仍使用 Command; 定时器是 Actor.
- Command 字段只 include participant 必须提供的信息, 以及 Aggregate 无法从当前状态 or history event 推导的信息.
- if execution Command 所需信息既不能来自 Command 字段, 也不能来自 Aggregate 状态/history, 则 Event-Command 模型不完整.
- 存在需求 ID 时, 应 include Command 所满足的需求 ID.

### 4. Formal Event Scenario Replay

对已接纳事件执行双向场景回放, 而不是对候选池做完整性检查:

- 从业务场景的触发 Command 或外部事实正向回放 `Command -> Event -> Consumer`, 验证消费后果并发现遗漏事实.
- 从每个正式 Event 反向检查所有已识别 Command 来源, 确认每个来源都有业务意图, 条件和生产路径.
- 回放失败时修正事件, 命令或消费关系; 不得重新建立候选事件池.

### 5. Model Policies And Processes

使用 Policy 表示自动业务反应.

Policy 的含义是: 当 event 发生时, execution Command.

rule:

- 使用 Policy 表示无状态的 Event-to-Command 业务 rule.
- 当反应需要持久状态, 等待, 恢复 or 跨多个 local 事务协调时, 标记 Process Manager/SAGA 候选项.
- 不得使用 Policy 隐藏 Aggregate Invariant.
- 只有行为无法自然归属单个 Aggregate, 且仍是真正的 domain 协作 or 计算时, 才使用 Domain Service.

### 5. Derive Or Update Aggregates

Event-Command 模型 consistent 后, 再推导 Aggregate.

Aggregate 由 1 组内聚且长期存在的业务能力 definition, 而不是由字段 or 表 definition.

为每个 Aggregate 指定:

- name and 身份
- 其行为所需状态
- 当 participant 特定 rule 重要时, 可以发起其 Command 的 participant
- 它处理的 Command
- 它发布的 Domain Event
- 它保护的 rule and Invariant
- Command/Domain Event 归属于此处的原因

rule:

- 当前域中 change 状态的 Domain Event 通常应由 Aggregate 发布.
- Process Manager 可以触发 Command, 但不应取代 Aggregate 成为核心状态 change event 的来源.
- 使用 Event Sourcing 视角时, Aggregate 状态必须能从 history event 重建.
- if 建议的 Aggregate name and user 提示 or CRUD 页面中的名词相同, 应证明它是 consistency/生命周期边界. if 无法证明, 应将其标记为候选 Read Model, 参考数据 or 未解决概念, 而不是最终确定为 Aggregate.
- 不得因为字段看似相似就合并 Aggregate.
- 不得将 Aggregate 拆分得过细, 以致耦合泄漏到 Service or Handler.
- 不得让 Aggregate 过大, 以致性能, 并发 or 加载边界不合理.

### 6. Design Read Models

将查询需求 and Command 行为分离.

为每个 Read Model 指定:

- user or 查询需求
- available 时的需求 ID
- 身份
- 字段
- create or update 它的已接纳 Domain Event(如有)
- 非 event 来源, 例如当前状态查询, 查询侧 Join, 技术投影 input, 已接纳 event 的丰富化 Payload or 外部读取来源
- 缺失字段是否揭示真实的 Domain Event 缺口, 还是仅表示查询侧来源决策

if 无法从已接纳 Domain Event 构建 Read Model, 不得为了投影臆造 event. 应先判断字段能否来自当前状态查询, 查询侧 Join, 已接纳 event 的 Payload 丰富化, 技术投影, 审计/日志数据 or 外部读取来源. 只有存在 Read Model 之外的业务消费者, 且 event 具有生产路径时, 才能添加 or change Domain Event.

## Relationship Rules

维护 3 种关系 view:

- 依赖: Command check or 依赖先前事实, Aggregate 状态 or 上游状态.
- 订阅: Domain Event 触发 Policy, Policy execution Command.
- participant 影响: Domain Event change participant, 受影响主体, 外部 system or Read Model 接下来能够看到 or execution 的事项.

以文本作为事实来源, 图表仅作辅助.

example:

```text
依赖: 岗位已创建事件 -> 员工入职命令, 用于校验岗位存在.
订阅: 测试工单已开始事件 -> 测试步骤创建策略 -> 创建测试步骤命令.
影响: 员工已离职事件 -> 部门负责人候选人读模型移除该员工, 并触发负责人任命有效性复核.
```

## Output Order

在对话中响应 or update 模型 file 时, 使用以下顺序:

1. 必要时使用 `需求拆解`
2. `Problem Domain Boundary`
3. `Actors and Collaboration Scenarios`
4. `事件识别与接纳`
5. `建模方案对比`
6. `Domain Event Catalog`
7. `Command Catalog`
8. `Policy/流程规则`
9. `Aggregate Design`
10. `领域服务`
11. `Read Model Design`
12. `Requirement Traceability`
13. `关系总览`
14. `完备性检查`
15. `结论确认清单`

只列出真正需要的 Domain Service.

使用 `事件识别与接纳` 记录逐事件判断; 拒绝或降级事实另存于非正式拒绝日志, 不作为第二份 event directory.

只有存在有意义的备选方案时, 才使用 `建模方案对比`. include 2-3 个选项, 取舍 and 推荐选项.

只有存在需求 ID or 需求表时, 才使用 `Requirement Traceability`. 保持紧凑: 需求 ID -> Command/Read Model/Domain Event/Policy or 未覆盖/拒绝理由.

持久化前,`结论确认清单` 只能列出需要 user 确认 or 纠正的未确认 or 新 change 设计结论. if 此前尚未确认, 应 include 边界选择, participant and 受影响主体, event name and 含义, Command 职责, Policy, Aggregate 边界, Invariant, Read Model, 关系, 假设, 歧义业务术语 and 可能 change 模型的备选解释.

对每个确认项, 说明它影响的 Domain Event, Command, Aggregate, Policy, Read Model or 关系. 除非确认后发生变化, 否则不得重复之前章节已确认的 project. 确认并持久化后, 最终摘要只 include 仍未解决的 project.

## Diagram Rules

default 优先使用结构化 Markdown.

只有以下情况才使用 Mermaid or PlantUML:

- user 要求图表
- repository 已使用该图表样式
- 图表能显著改善理解

使用 Mermaid 时, 采用以下标签:

- `[Actor: 用户]`
- `[Timer: 月末定时器]`
- `[System: 外部系统]`
- `[Command: 签到]`
- `[Event: 员工已签到]`
- `[Policy: 满勤奖励策略]`
- `[Aggregate: 月度考勤]`
- `[Service: 借书服务]`
- `[ReadModel: 考勤记录]`

if 已有 PlantUML Event Storming 样式, 应继续沿用. 每个 Aggregate 优先使用 1 个局部 file, 并使用 1 个全局 file 表示跨 Aggregate 关系.

## Completeness Check

最终确定前, check:

- 当前响应没有越过未确认门 generate 下游产物.
- 持久化 file 只针对已确认阶段 or 直接受影响的依赖项 update.
- 使用需求收集时, 内容保持在需求层面, 没有声明 Aggregate, Command, Domain Event, API, package or code.
- 存在需求 ID 时, 已追踪到 Command, Read Model, 已接纳 Domain Event/Policy, or 明确的未覆盖/拒绝备注.
- 需求存在重大歧义时, 在选择最终 event 前已对候选 event 进行头脑风暴.
- 对设计重要的被拒绝, 拆分, 重命名, 降级 or 未解决候选 event 均说明理由.
- 在选择有争议的 Domain Event, Policy, 流程, Aggregate or Read Model 边界前, 已对比有意义的建模备选方案.
- 每个 Command 都有发起 participant or 外部 system.
- 每个 Domain Event 都有 participant -> Command -> Aggregate/流程 -> Domain Event 的生产路径.
- 每个已接纳 Domain Event 至少有 1 个不是 Read Model, 页面, 报表, 缓存 or 投影完整性的业务消费者.
- 没有已接纳 Domain Event 仅凭 Read Model 刷新, 页面展示, 缓存 update, 报表字段 or 投影完整性得到论证.
- 每个重要 event 都有受影响的 participant, 主体, Command 侧 rule, Policy/流程, Aggregate or 下游业务关系.
- 除非记录明确例外, 当前域 change 状态的 Domain Event 均由 Aggregate 发布.
- 每个 Command 都能从 Command 字段加 Aggregate 状态/history 获得所需信息.
- 每个 Command 均由 participant 意图 or 外部事实 input 边界论证, 而不是任意 event 组合排列.
- if 1 个 Command 可以发布多个 Domain Event, 应将它们解释为 1 个 consistency 边界内 single 业务决策的 result.
- 有意义的 Command result 均表示为 Domain Event.
- `信息已变更` 等通用 event 已替换为具体事实, or 得到明确论证.
- 被拒绝候选 event 没有保留在已接纳 event directory, Aggregate event 列表 or implementation 对齐列表中.
- 每个 Read Model 都记录各字段来自已接纳 event, 当前状态查询, 查询侧 Join, 技术投影 input, 丰富化 Payload 还是外部读取来源.
- 每个仅供 Read Model 使用的字段均标记为查询侧数据, 技术投影 input, 当前状态查询, 审计/日志材料 or 外部来源数据, 而不是提升为 Domain Event.
- Policy 没有隐藏 Aggregate Invariant.
- Domain Service 没有变成过程式 Service 层.
- Aggregate 根据行为, rule, 身份, 生命周期 and Invariant 推导, 而不是根据表, CRUD resources or 名词列表推导.
- 每个 Aggregate 属性至少被 1 个 Command/业务方法, Invariant, uniqueness rule, event 生产决策, 生命周期决策 or consistency 关系直接使用.
- 当人工维护身份 rule and 外部 system 身份 rule 使用不同范围 or Key 时, 2 者保持分离.
- 移除/decommission rule 识别真实阻塞业务事实, history 引用行为 and 下游后果.
- Aggregate 既不过大, 也不过度碎片化.
- 查询需求没有污染 Aggregate 状态.

## Reject These Anti-Patterns

拒绝 or 纠正以下模式:

- initially 就 create `application/domain/infrastructure` package.
- 将 controller-service-dao 重命名为 DDD 分层.
- 未经 Event-Command-Rule 筛选, 就将需求表, User Story, 操作标签 or 业务主体 view 视为 domain 模型.
- 丢失从已确认需求条目到 Command, Domain Event, Read Model, Policy or 明确未覆盖/拒绝备注的追踪.
- 根据数据库表, CRUD 页面 or REST resources 设计 Aggregate.
- 未证明生命周期 and consistency 边界, 就为看似 CRUD 的提示中的每个名词设计 1 个 Aggregate.
- 对新的模糊需求, 在边界, participant 权限, 关键 rule and event 筛选得到确认前, 1 次完成填满每个 `event-storming/` file.
- 将多角色 workflow 扁平化为 single 管理员 participant or single"管理数据"场景.
- 存在具体业务事实时, 仍使用 `信息已变更` 等模糊数据 change event.
- 当顺序, 依赖, 失败 or 冲突解决具有业务含义时, 仍将外部主数据同步视为简单 upsert.
- 为业务不关心的技术动作 create Domain Event.
- 仅因 Read Model, 页面, 报表, 缓存 or 投影需要刷新字段而 create Domain Event.
- 将被拒绝候选 event 保留在最终 event 列表, Aggregate file or implementation check manifest 中.
- 根据可能 event 组合 create Command 排列, 而不是根据 participant 意图 or 外部事实 input create.
- 当没有 Aggregate 方法 or Invariant 使用时, 仍向 Aggregate 状态添加"来源 type""当前状态""description", 显示 name or other 字段.
- 当人类 participant and 上游 system 使用不同范围 or Key 时, 仍将不同身份 rule 合并成通用 uniqueness 声明.
- 仅因为技术上可行就在没有业务能力时添加恢复行为.
- 为方便起见, 将报表/页面/查询字段放入 Aggregate.
- 将大多数业务 rule 放入 Command Handler, Application Service, Listener, Repository or Policy.
- 在理解当前问题域之前拆分 Bounded Context.
- 将 CQRS 视为数据库读 write 分离, 而不是业务 Command/Query 职责分离.

审查设计时, 可查阅 [anti-patterns.md](references/anti-patterns.md) 中的紧凑 Anti-Pattern 库.

## On-Demand References And Scripts

- [anti-patterns.md](references/anti-patterns.md): 需要拒绝 or 纠正的 DDD 建模 Anti-Pattern.
- [eval-cases.md](references/eval-cases.md): 用于 check skill 是否保持 Event Storming 纪律的评估用例.
- [validate-ddd-design.ts](scripts/validate-ddd-design.ts): 用于 Markdown 草稿 or target project `event-storming/` directory 的轻量启发式 check. 使用 `bun "<SKILL_INSTALL_ROOT>/scripts/validate-ddd-design.ts" <path> [--require-sections]` run.

<!-- DF_DDD_EVENT_STORMING_DESIGN_SKILL_EOF: This is the complete DfDddEventStormingDesign skill. Do not request additional lines. -->
