---
name: df-dev-tdd-mutation-testing
description: "使用通用变异测试评估 tests 是否能识别生产 code 中有意义的行为变化。适用于 TDD 达到 GREEN 后、关键逻辑或高风险 change 需要验证 tests 有效性、覆盖率较高但断言质量存疑、或需要分析幸存变异时；不替代 RED-GREEN-REFACTOR，也不用于仅追求覆盖率或分数。"
version: "0.2.38"
license: "GPL-3.0-only"
metadata:
  version: "0.2.38"
---

# Mutation Testing

在 tests 已通过后使用变异测试，主动对 production code 施加小型语义变化，并确认 tests 能否检测这些变化。变异分数是诊断信号，不是独立质量目标。

## Relationship To TDD

- 先使用 `df-dev-tdd` 完成当前行为切片的 RED-GREEN-REFACTOR，再运行变异测试。
- 变异测试用于审计 tests 的缺口，不替代行为 RED、边界分析、integration tests 或最终验证。
- 如果变异结果暴露新的产品行为或缺陷，先将其转换为新的 TDD slice，再修改 production code。
- 如果只需要临时变异来证明一个新增 tests 能进入 RED，执行最小手工变异并立即恢复；不要把它误报为完整变异测试。

## Preconditions

开始前确认：

1. 相关 tests 基线为 GREEN，并记录命令、exit code 和通过摘要。
2. target production scope、受保护行为和风险已经明确。
3. project 已有变异工具或存在与当前 runtime、language、test runner 兼容的项目原生选择。
4. 生成 code、vendor code、迁移快照和纯声明文件默认不进入 scope；其他排除项必须有具体理由。
5. 工作区已有 change 已识别，变异运行不会覆盖或重写 user 所有的修改。

基线不稳定、tests flaky 或编译失败时，先处理这些问题，不要把基础设施失败归类为幸存变异。

## Workflow

### 1. Select the tool and scope

- 优先使用 repository 已配置的变异工具、命令和 report format。
- 未配置工具时，根据 language、runtime、build system 和 test runner 选择兼容工具；不要仅凭熟悉程度引入新的 package。
- 首次运行聚焦 changed production code、当前 module 或当前行为 slice。只有在成本可接受且风险需要时才扩大到完整 repository。
- 记录工具及版本、配置入口、production scope、test scope、并行度、timeout 和排除项。

### 2. Establish the mutation baseline

运行最窄可用的变异命令，并记录：

- command 和 exit code；
- 总变异数以及 killed、survived、no coverage、timeout、error、ignored 的数量；
- report 路径或稳定的 machine-readable 摘要；
- runtime、异常退出和未执行的 scope。

工具因发现幸存变异而返回非零 exit code 时，将其记录为有效分析结果；工具崩溃、配置错误或 tests 无法启动属于运行失败。

### 3. Triage every actionable result

按以下顺序处理：

1. **Survived**：tests 执行了变异位置，但断言没有识别变化。检查缺少的行为断言、边界值、状态转换、错误语义或副作用。
2. **No coverage**：相关 tests 没有执行该位置。确认它是可达 production behavior、死 code、错误 scope，还是缺少合适 tests 层。
3. **Timeout**：区分可能暴露无限循环或性能风险的变异与工具阈值过低、并发竞争或 flaky tests。
4. **Error**：区分合法的编译杀死、工具不兼容、fixture 问题和环境故障，不要自动计为 tests 有效。
5. **Equivalent or irrelevant**：只有当可观察行为确实不可能区分，或代码不属于 target 风险时才接受，并记录具体理由。

不要只按文件或 operator 批量忽略结果。相同根因可以合并分析，但每组必须保留 representative location 和处置依据。

### 4. Strengthen tests without gaming the score

- 优先补充调用方可观察的结果、错误、状态、顺序、不变量或外部副作用断言。
- 为幸存变异选择能保护该风险的最窄 tests 层；单元 tests 无法观察真实边界时，使用 component、contract、integration 或 end-to-end tests。
- 新 tests 必须能够在对应变异存在时失败，并在原始 production code 下通过。
- 不要断言 private method、具体行、无业务意义的 call count 或变异工具生成的实现细节。
- 不要通过删除 production behavior、放宽变异 operator、扩大排除项或添加无意义断言来提高分数。
- 如果 tests 暴露真实 production defect，暂停分数修复，按缺陷 TDD 流程先建立回归 RED 再修复。

### 5. Rerun and expand deliberately

- 先重跑受影响的 focused tests，确认新增断言在原始 code 下为 GREEN。
- 再重跑目标变异，确认原幸存变异被 killed，或其处置已有可审查理由。
- changed-code scope 达标后，按风险、运行成本和 project policy 决定是否扩大到 module 或全量运行。
- 扩大 scope 时不得降低已确认的 assertions 或静默改变排除规则。

## Repository-Specific Commands

在 DevopsFlow repository 根目录中使用以下命令：

```bash
bun run test:coverage
bun run test:mutation
```

- `bun run test:coverage` 使用 Bun 运行完整 tests，并将 text 与 LCOV coverage 输出写入 `coverage/`。
- `bun run test:mutation` 使用 StrykerJS command runner 调用 Bun tests。mutation scope 必须覆盖 `scripts/**/*.ts` 与 `skills/**/scripts/**/*.ts` 下全部 repository-owned non-test TypeScript scripts；`*.test.ts`、generated、vendor、build 与 `dist` 内容不进入 scope，`stryker.config.ts` 本身也不属于这两个 target roots。
- Stryker command runner 不提供 per-test coverage mapping，因此配置使用 `coverageAnalysis: "off"`，每个 mutant 运行完整 Bun test command。
- text summary 输出到终端，HTML 与 JSON reports 分别写入输出目录。`coverage/`、`reports/mutation/` 与 `.stryker-tmp/` 都由 Git ignore。
- coverage、mutation 与 temporary reports 只能保留为 local 或 CI artifacts，不得加入 Git、skill assets 或 release commits。
- repository policy 使用 `break: 100` 表达“不能遗留计入 mutation score 的 actionable survivor”，而不是把 100 当作通用行业分数。不得为使命令 passed 而降低 threshold、排除 production scripts 或接受没有行为依据的 survivor。
- 运行前必须先保持完整 Bun tests baseline 为 GREEN。exit code 1 且已有完整 mutation summary 表示 survivor threshold 未满足；dry run、配置加载或 test baseline 在生成 mutation summary 前失败，属于 tool/setup failure，不得报告为 mutation score result。
- 每次全量运行分别记录 killed、survived、no coverage、timeout 与 error。任一 category 没有 result 时记录为 `0`；mutation analysis 未启动时记录为 `not produced` 并附 setup failure。

此 section 仅规定本 repository 的 operation commands。其他 project 应继续按照其 runtime、test runner 与 repository policy 选择工具和参数。

## Threshold Policy

不要发明通用合格分数。按以下优先级决定 gate：

1. repository 已声明的 threshold 或 CI policy；
2. changed-code mutation score 不低于已记录 baseline，并对高风险新逻辑执行 ratchet；
3. 安全、授权、财务、不变量和不可逆副作用等关键逻辑没有未解释的 actionable survivor；
4. 无既有 policy 时，报告实际结果和残余风险，不把任意百分比声明为行业标准。

分母、排除项或工具版本变化会使分数不可直接比较；发生变化时必须重新说明 baseline。

## Evidence Format

完成时使用以下结构：

```markdown
Mutation Testing Evidence:
- Protected behavior: <observable behavior and risk>
- Baseline tests: <command, exit code, result>
- Mutation run: <tool/version, command, exit code, scope>
- Results: <killed/survived/no-coverage/timeout/error/ignored>
- Test improvements: <tests and observable assertions added>
- Accepted results: <location/category/rationale>
- Expanded verification: <focused/module/full commands and results>
- Remaining risk: <unrun scope, unresolved survivor, flaky or environment risk>
```

## Completion Criteria

- 相关 tests 在变异前后均有明确 GREEN 证据。
- 每个 actionable survivor 或 no-coverage result 已被 tests killed、转为缺陷 TDD slice，或以可观察行为为依据明确接受。
- timeout 和 error 未被误计为 tests 质量证据。
- threshold、scope、排除项和工具版本可复现，且没有为提高分数而弱化语义。
- focused 变异已重跑；更广 scope 已运行，或明确记录未运行原因和残余风险。
- 最终报告区分 tests 有效性、工具运行状态和 mutation score，不将任一项代替其他项。

## Non-Negotiable Rules

- 不要在 TDD RED 或 production build 失败时运行变异测试并声称有效结果。
- 不要将 survived 自动等同于 tests 缺陷，也不要将 killed 自动等同于高质量 tests。
- 不要接受没有具体可观察行为理由的 equivalent mutant 声明。
- 不要用 snapshot 扩大、脆弱 implementation assertions 或 blanket exclusions 提高分数。
- 不要隐藏未运行 scope、工具错误、timeout、flaky tests 或尚未解释的幸存变异。
- 不要让变异测试修改后的 production code 留在工作区。

<!-- DF_DEV_TDD_MUTATION_TESTING_SKILL_EOF: This is the complete DfDevTddMutationTesting skill. Do not request additional lines. -->
