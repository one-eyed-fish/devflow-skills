# Configure Mutation Testing And Coverage Checkpoint

## Task

- 名称：Configure Mutation Testing And Coverage
- 目标：为 repository-owned TypeScript scripts 配置 Bun coverage 与 StrykerJS mutation testing，并确保生成报告不被 Git 跟踪。
- 状态：completed
- Owner：Cursor agent
- 创建时间：2026-09-04T12:20:00+08:00
- 更新时间：2026-09-04T12:36:00+08:00

## Resume Cursor

- 当前阶段：completed with pre-existing baseline failures recorded
- 下一步操作：先解决现有完整 tests baseline 的两个失败，再重新运行 `bun run test:mutation` 取得 mutation categories。
- 从此处继续：本 checkpoint 的 Risks And Blockers。
- 不要重做：coverage、Stryker configuration、dependency installation、focused tests 与 static checks 已完成。

## Workflow Chain

```text
df-dev-engineering-workflow-route
  -> df-resumable-workflow-guard
  -> df-glue-coding
  -> df-implementation-planning
  -> df-executing-implementation-plan
  -> df-dev-tdd
  -> df-verification-before-completion
```

## Scope

- 范围内：`bunfig.toml`、`.gitignore`、`package.json`、`bun.lock`、`stryker.config.ts`、配置契约测试、mutation skill 文档。
- 范围外：生产 script 行为、生成的 coverage/mutation reports、无关 release 变更。
- 用户所有的变更：任务开始时 Git status 中已有的全部修改，尤其是 `package.json` 与新增 mutation skill 文件；仅在请求范围内增量编辑，未回退其他内容。

## Checklist

- [x] R1 - Bun coverage 配置与 ignored report paths
- [x] R2 - Stryker mutation scope、reporters、timeout/concurrency 与 survivor gate
- [x] R3 - Repository-specific skill commands 与 patch version
- [x] R4 - Focused、coverage、mutation、metadata、static、format 与 regression evidence 已执行并记录

## Touched Files

| 文件 | Owner | 原因 | 状态 |
| --- | --- | --- | --- |
| `package.json` | shared/user + agent | 添加 coverage/mutation commands 与 Stryker dependencies | complete |
| `bun.lock` | agent | 锁定 Stryker dependencies | complete |
| `bunfig.toml` | agent | 配置 coverage output 与 exclusions | complete |
| `.gitignore` | agent | 忽略 generated reports 与 sandbox | complete |
| `stryker.config.ts` | agent | mutation targets、runner、reporters 与 gate | complete |
| `scripts/testing-config.test.ts` | agent | configuration contract regression tests | complete |
| `skills/df-dev-tdd-mutation-testing/SKILL.md` | shared/user + agent | repository-specific commands；版本 0.2.38 | complete |
| `.devopsflow/checkpoints/configure-mutation-testing-and-coverage.md` | agent | resumable evidence | complete |

## Decisions And Assumptions

- 使用 `@stryker-mutator/core` 内置 command runner；不存在独立的 command-runner package。`@stryker-mutator/api` 作为配置直接 import 的 type dependency 明确声明。
- `break: 100` 表达“任何计入 mutation score 的 survivor 都使命令失败”，不是行业分数猜测。
- command runner 的 `coverageAnalysis` 为 `off`，每个 mutant 运行完整 Bun test command。
- Stryker 10 默认尝试使用 TypeScript compiler API 重写 `tsconfig.json`，但 repository 的 TypeScript 7 package 不提供该 API。配置将 `tsconfigFile` 指向不存在的 compatibility sentinel；Bun 仍在 sandbox 中原生读取未修改的 `tsconfig.json`。
- exit code 1 且没有 mutation summary、JSON 或 HTML report 是 setup/test-baseline failure，不是 survivor result。

## Verification Evidence

| 命令 | 退出码 | 范围 | 结果 |
| --- | --- | --- | --- |
| `bun add --dev @stryker-mutator/command-runner` | 1 | dependency selection | registry 404；package 不存在，未加入 dependency |
| `bun add --dev @stryker-mutator/core` | 0 | dependency installation | 安装 10.0.0 |
| `bun add --dev @stryker-mutator/api` | 0 | direct type dependency | 安装 10.0.0 |
| `bun test scripts/testing-config.test.ts`（RED） | 1 | configuration contract | 4 tests 均因配置尚未实现而失败 |
| `bun test scripts/testing-config.test.ts`（GREEN） | 0 | configuration contract | 4 passed，28 assertions |
| `bun run test:coverage` | 1 | full tests + coverage | 269 passed、2 pre-existing failures；overall lines 74.37%，LCOV 写入 ignored `coverage/` |
| `bun run test:mutation` | 1 | 19 target files、3914 mutants discovered | initial Bun baseline failed；analysis 未启动，无 mutation report |
| mutation categories | N/A | full mutation | killed/survived/no-coverage/timeout/error 均为 `not produced`，因为 dry run baseline 未通过 |
| `bun run check:skill-metadata` | 0 | all skills | passed |
| `bun run check:skill-eof` | 0 | 29 skills | passed |
| `bun run typecheck` | 0 | repository | passed |
| `bun run lint` | 0 | 79 files | passed |
| `bun run format:check` | 0 | 77 files | passed |
| `bun test` | 1 | full regression | 269 passed、2 pre-existing failures |
| `git check-ignore` | 0 | generated paths | coverage, mutation HTML/JSON 与 sandbox paths 均 matched `.gitignore` |

## Risks And Blockers

- 风险：mutation score 尚不可用；不得推断任何 killed、survived、no-coverage、timeout 或 error 数量。
- 风险：当前执行环境 Bun 为 1.4.0，而 `packageManager` 声明 Bun 1.3.14；使用的 coverage options 属于文档化兼容配置。
- Blocker：完整 Bun baseline 有两个既有失败：release checkpoint 中的 direct implementation path 触发 repository boundary test，以及 upstream Codex trust fingerprint drift。Stryker 正确地在 initial test run 阶段停止。

## Progress Log

```text
2026-09-04T12:36:00+08:00
任务：配置并验证 coverage 与 mutation testing
变更：coverage config、ignored artifacts、Stryker config、package commands、contract tests、skill docs
验证：focused/static/metadata/format passed；coverage/full tests 与 mutation baseline 保留既有失败
状态：completed with mutation analysis blocked by pre-existing RED baseline
证据：19 target files、3914 mutants discovered；mutation category counts not produced
下一步：恢复 full baseline GREEN 后运行 bun run test:mutation
```

## Handoff

```text
从此处继续：.devopsflow/checkpoints/configure-mutation-testing-and-coverage.md
当前阶段：configuration complete; full mutation analysis blocked
下一步操作：解决两个既有 baseline failures 后重跑 mutation command
不要重做：dependencies, configuration, docs, focused/static verification
下次验证：bun run test:mutation
未决风险：mutation category counts and score unavailable until baseline is GREEN
```
