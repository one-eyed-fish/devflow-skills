# TypeScript Project Organization

本文档定义 TypeScript 项目中行为模块的推荐文件组织方式。它适用于使用 Bun、Vitest 或其他 TypeScript 测试运行器的项目；Bun 不是这套结构的前提。

## Recommended Layout

对于一个名为 `order` 的行为模块，优先将相关文件放在同一目录：

```mermaid
treeView-beta
folder/
  order.ts
  order.test.ts
  order.feature
  order.steps.ts
  order.feature.test.ts
```

这些文件的职责保持稳定：

- `order.ts`：生产实现和可被测试调用的公共函数。生产实现不依赖 Cucumber 或测试运行器。
- `order.test.ts`：模块级单元测试。可以使用 Bun Test，也可以使用 Vitest；测试应直接验证纯逻辑、边界和错误语义。
- `order.feature`：业务行为契约。使用 Gherkin 描述 participant、前置事实、动作和可观察结果，不写数据库表、类名或 mock 等实现细节。
- `order.steps.ts`：Cucumber step definitions。它只负责把 Gherkin 步骤连接到测试上下文或公共 API，不承载生产业务规则。
- `order.feature.test.ts`：Cucumber 执行入口。它负责加载 `.feature` 和 step definitions，并将行为契约纳入项目测试命令。

项目不需要行为契约时，只保留 `<name>.ts` 和 `<name>.test.ts`。存在可执行 Gherkin 契约时，再补齐后三个文件。

## Test Runner Choices

`<name>.test.ts` 不是 Bun 专属命名：

- 使用 Bun Test 时，通过 `bun test` 执行单元测试。
- 使用 Vitest 时，通过 `vitest` 或项目已有的 `vitest run` script 执行单元测试。
- 两者都应保持测试与被测实现按模块共置，避免为了测试运行器把所有测试集中到一个无关的全局目录。

Cucumber 的 feature test 可以由 Bun Test、Vitest 或项目现有的 Cucumber 启动方式承载。若 `*.feature.test.ts` 会被 Vitest 自动发现，应在 Vitest 配置中明确排除它，或让该文件使用项目约定的 Vitest wrapper，避免同一个 Cucumber 场景被两个测试入口重复执行。

## Organization Rules

- 五类文件使用同一个基础名称，便于从行为契约定位实现和测试。
- 单元测试只覆盖模块边界内的快速反馈；跨模块或真实外部边界放入适合的 integration 或 end-to-end 层。
- `.feature` 以业务语言表达一个主要行为；step definitions 可以复用 fixture，但不能把技术 setup 反向写回业务契约。
- `*.feature.test.ts` 只负责测试框架编排；验证逻辑放在 steps 或公共测试辅助模块，生产行为仍放在 `.ts` 实现文件中。
- 同一项目可以只使用 Bun Test 或只使用 Vitest，不要求为采用此结构同时引入两个单元测试运行器。

## Adoption Checklist

1. 先创建或确认 `<name>.feature`，并为需求添加 `@req-<id>` 追踪标签。
2. 创建 `<name>.test.ts`，选择项目已有的 Bun Test 或 Vitest。
3. 创建 `<name>.ts`，只实现当前场景所需的最小行为。
4. 需要自动化验收时，添加 `<name>.steps.ts` 和 `<name>.feature.test.ts`。
5. 在项目测试配置中确认单元测试与 Cucumber feature test 不会重复收集或互相覆盖。
