# BDD Feature Landing Experience

本文档沉淀 `df-dev-bdd` 在真实项目中的落地经验，聚焦如何让产品经理、项目经理与开发者基于同一个 Gherkin `.feature` 契约对齐，并让同一份 `.feature` 既能被非技术角色评审、又能被测试框架直接执行。

## When To Write

- 新需求一进来，最先做的是把需求梳理成 `.feature` 草案，而不是先画页面、建表或写实现。
- 在需求评审、迭代规划、技术设计、TDD 起始之前，都以冻结后的 `.feature` 为对齐基准。
- 一次只让一个 `Feature` 进入落地，避免把多个独立业务能力塞进同一份契约。

## Three-Party Alignment

一段 `.feature` 文案本身就是在对齐三方：

- 产品经理（定义「做什么」）：负责 `Feature` 标题、`As a / I want / So that`、业务规则与例外，以及每个 `Scenario` 是否满足验收期望。它决定「做完」的标准。
- 项目经理（管理「做多少」）：通过场景与 `@req-`、`@priority`、`@scope` 标签评估工作量、拆分迭代、决定哪些场景进本期、哪些延后。
- 开发者（明确「怎么验收」）：把 `Given / When / Then` 翻译成稳定的测试与实现切片边界，判断每个场景能否被自动化、能否追踪到实现。

三方对照 `.feature` 逐场景确认通过后，需求才冻结进入实现。任何一个角色对场景含义有分歧，都先澄清，而不是各自在心里补一个版本。

## Writing Rules

- 一个场景表达一个独立业务行为和一个主要可观察结果。
- Given 是已成立的业务前置事实，When 是一个业务动作，Then 是可观察结果；不用 method call、数据库表、DTO 或调用顺序充当契约。
- 同一规则要同时覆盖成功与拒绝/例外：冲突、重复请求、取消、过期、外部失败、权限拒绝等都必须有场景。
- 使用业务语言与统一术语；术语歧义先澄清，不拿技术名词掩盖决策。
- 分段成文优于一次性大文档：先草拟核心 happy path，再逐轮补齐边界与失败路径。

## From Feature File To Executable

同一份 `.feature` 是纯文本，也可被测试框架直接执行：

- Cucumber 家族（JVM / Ruby / JS）、SpecFlow（.NET）、pytest-bdd / behave（Python）、Jest-Cucumber、gherkin-rs（Rust）等均可加载 `.feature` 并通过 step definitions 指出匹配步骤。
- 未实现的 step definition 会产生明确的失败——这正是目标行为的 RED 证据，可交给 `df-dev-tdd` 继续。
- 用 tag（`@req-<id>`、`@priority`、`@smoke`、`@e2e`）区分场景用途，让同一契约在不同测试层复用。

## Common Pitfalls

- 把 `.feature` 写成第二份产品说明书，堆大量细节却不可执行。
- 场景一次性覆盖多条独立规则，失败时无法定位是哪个行为出问题。
- 先写完生产代码再补 `.feature`，导致契约追着实现跑。
- 产品、项目、研发各自维护一份需求描述，缺乏唯一权威来源。
- 场景只写 happy path，例外与拒绝规则缺失，实现后才发现行为未对齐。