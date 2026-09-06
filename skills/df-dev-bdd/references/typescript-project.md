# TypeScript Project Structures

本文列出 TypeScript 项目中可以承载 BDD 行为契约的几种文件组织方式，不把其中任何一种声明为普适的最佳实践。实际选择应先服从目标项目已有的模块边界、测试发现规则和构建命令。

## Structure A: Module-Colocated Files

一个行为模块可以将实现、单元测试和行为契约放在同一目录：

```text
order.ts
order.test.ts
order.feature
order.steps.ts
order.feature.test.ts
```

各文件可以承担以下职责：

- `order.ts`：生产实现和公共函数，不依赖测试运行器或 Cucumber。
- `order.test.ts`：模块级单元测试，可以使用 Bun Test 或 Vitest。
- `order.feature`：使用 Gherkin 表达 participant、前置事实、动作和可观察结果。
- `order.steps.ts`：Cucumber step definitions，负责连接 Gherkin 与测试上下文或公共 API。
- `order.feature.test.ts`：加载 `.feature` 和 steps 的测试入口。

这种布局便于从一个行为模块直接找到对应测试和契约，但是否采用取决于项目的文件发现规则。

## Structure B: Separated Test And Feature Directories

项目也可以将生产实现、单元测试和 Gherkin 文件分开：

```text
src/order.ts
src/order.test.ts
features/order.feature
features/order.steps.ts
test/order.feature.test.ts
```

这种布局适用于项目已经约定使用 `features/`、`test/` 或其他测试目录，或者需要把业务契约与 TypeScript 源码分开管理的情况。基础名称仍可以保持一致，但不是强制要求。

## Test Runner Variants

`<name>.test.ts` 可以由不同的 TypeScript 测试运行器执行：

- Bun Test 项目通常通过 `bun test` 或已有的项目 script 收集测试。
- Vitest 项目通常通过 `vitest` 或 `vitest run` 收集测试。
- Cucumber 执行入口可以由 Bun Test、Vitest 或项目已有的 Cucumber 启动方式承载。

如果 Vitest 的默认规则会收集 `*.feature.test.ts`，项目需要根据实际入口选择排除该文件，或者让它使用项目已有的 Vitest wrapper。这里是配置选项，不是对所有项目的固定要求。

## Structure C: Single Runner Orchestration

项目也可以只保留一套测试入口，由该入口同时编排单元测试和 feature test：

```text
src/order.ts
src/order.test.ts
features/order.feature
features/order.steps.ts
test/order.acceptance.test.ts
```

此时执行入口的名称可以遵循项目已有约定，不必强行使用 `<name>.feature.test.ts`。需要在项目文档或测试配置中记录 feature 文件、steps 和执行入口之间的对应关系。

## Selection Notes

- 先检查 `package.json`、`vitest.config.*`、Bun 配置、Cucumber 配置和 CI 命令，再选择文件布局。
- 不要因为项目使用 TypeScript 就移动已有测试或强制创建全部五类文件。
- 没有 Gherkin 契约时，只有实现文件和单元测试文件也可以满足模块测试需求。
- 有 Gherkin 契约时，重点是保持契约、steps、执行入口和需求标签之间可追踪，而不是文件路径本身。
- 如果项目同时支持 Bun Test 和 Vitest，应明确每个文件由哪个 runner 收集，避免重复执行。
