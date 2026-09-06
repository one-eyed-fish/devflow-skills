# Feature-Driven TDD

当 target project 存在 `df-dev-bdd` 产出的 Gherkin `.feature` 时, `.feature` 是行为与验收的契约基准, TDD 的场景切片应与其对齐, 而不是各自发明一套测试结构. 这保证每个需求场景都成为可执行测试与实现切片的可追踪锚点.

## Scenario To Slice Mapping

- 一个 `Scenario` 对应一个可观察行为切片; 一个 `Feature` 通常拆成多个 TDD RED-GREEN 切片.
- Given -> 测试前置/fixture 与 arrange; When -> 在稳定边界上执行的动作(act); Then -> 可直接断言的 observable result.
- `@req-<id>` 标签与需求 ID 保持可追踪, 贯穿切片, todo list 与最终验证.

## Delivery Options

1. **原生 step definitions**(Cucumber / SpecFlow / pytest-bdd / behave 等): `.feature` 直接可执行, step 定义即测试; 先让 step 因未实现或行为缺失而 RED, 再最小实现到 GREEN.
2. **场景驱动单元/组件测试**: 用场景的业务语义命名测试(例如 `user can submit a valid order`), 在测试体内还原 Given / When / Then, 适用于更窄的核心与编排边界.
3. **契约 / E2E 层**(如 Playwright + Cucumber): 用 `.feature` 作为公共验收层保护跨层风险, 内层仍用场景驱动的窄层测试.

## Integration With TDD Loop

- 首个被选定场景对应 `scope_defined`, 其测试对应 `test_written`.
- 未实现的 step definition 或「行为尚不存在导致断言失败」是有效 RED; 语法错误, fixture 错误或环境缺失不算行为 RED.
- Boundary Discovery Burst 的 counterexample 应与 `.feature` 中的例外, 拒绝, 冲突, 幂等, 过期等场景一致, 避免边界扫描脱离契约.
- 达到 GREEN 后再 refactor; refactor 不得改变 `.feature` 中已冻结的行为契约.
- `.feature` 变更即需求变更: 更新场景后, 让受影响测试重新经历 RED(必要时先调整断言), 再补最小实现.

## Completion Checks

- 每个已实现 `Scenario` 都有 RED-to-GREEN 证据.
- `@req-<id>` 场景均能找到对应测试层与实现切片, 无静默缺漏.
- 未覆盖或未实现的行为在 `tdd_boundary_scan` 中标注为 `next_slice` 或 `deferred` 并保留理由.
- 最终报告中列出 `.feature` 场景与测试/实现的可追踪关系.