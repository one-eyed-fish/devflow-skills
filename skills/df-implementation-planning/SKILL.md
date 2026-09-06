---
name: df-implementation-planning
description: "code 前 write 具体的小步实施计划. 适用于多步 feature, 缺陷 fix, refactor, DDD-to-TDD 交接, 风险行为 change, or 任何需要在 implementation 前明确 file, 命令, 预期 RED/GREEN result, 验证步骤 and 完成标准的工程 task. 存在 Gherkin .feature 行为契约时, 以其中 Scenario 作为行为切片与验收追踪锚点."
version: "0.2.30"
license: "GPL-3.0-only"
metadata:
  version: "0.2.30"
---

# Implementation Planning

使用此 skill, 将需求, 已确认的 DDD 交接, Glue Coding pattern 选择, 选定的 style pack, 缺陷调查 result or refactor target, 转化为 other execution 者可 execution 的计划.

使用此 skill 时不要 edit 生产 code.

## Planning Workflow

1. 重述 target and 范围.
2. 列出约束:
   - 不得 change 的行为
   - 公共契约
   - 若存在经 `df-dev-bdd` 确认的 `.feature`, 行为切片应与其中 Scenario 对应并保持 `@req-` 追踪, 不得凭空发明新的测试或行为结构
   - 数据, 持久化, 顺序, 分页, 安全 or 副作用风险
   - 必须保留的选定 style pack, golden example, 特定风格 anti-pattern and 审查 manifest 项
   - 选定的 Glue target pattern, local 约定, 遗留行为证据, 要移除的 anti-pattern, 以及必须保留的 project 材料
   - 必须避开的 user 所有 worktree change
3. 识别行为切片.
4. 对每项 task 说明:
   - target
   - 可能涉及的 file or module
   - tests or 验证命令
   - 预期 RED, GREEN or 不变 result
   - 完成标准
5. 每项 task 应足够小, 可独立完成并验证.
6. 标记需要 `df-dev-tdd`,`df-spring-web-boundaries` or `df-systematic-debugging` 的步骤.
7. 对 Glue 风格 work, if 存在选定的 style pack, 应 include 它, 并 write 明选定的 target pattern 及每项 task 允许 change 的精确差异.
8. 对 refactor 类 Glue work, 分开 characterization, target pattern 迁移 and 清理步骤. 除非遗留结构被明确归类为 target pattern, 否则不要计划复制它.
9. 说明 execution 前是否需要 user 确认.

## Step Size

优先采用 2 至 5 分钟的 execution 步骤. if 1 个步骤组合了以下内容, 则应拆分:

- create tests and implementation 生产 code
- 无关的行为切片
- 风险各自独立的多个 module
- refactor and 行为 change
- debugging and fix
- code change and commit/PR work

## Output Format

需要 file 产物时使用 [implementation-plan.md](templates/implementation-plan.md). 在对话中使用相同结构:

```markdown
# <Name> Implementation Plan

## Goal

## Constraints

## Behavior Slices

## Task List

1. Write Failing Test: <behavior>
   - Files:
   - Command:
   - Expected RED:
   - Completion Standard:

2. Minimal Implementation: <behavior>
   - Files:
   - Command:
   - Expected GREEN:
   - Completion Standard:

3. Refactor: <design cleanup>
   - Files:
   - Command:
   - Must Preserve:
   - Completion Standard:

## Verification Matrix

## User Confirmation Required
```

## Non-Negotiable Rules

- 此阶段不要 write 生产 code.
- 不要 generate"implementation feature"or"run tests"等模糊步骤.
- project 中能发现 tests 命令时, 不要省略命令.
- 对根因不清的缺陷, 在获得可复现失败 and 根因证据前, 不要规划 fix.
- 不要在相同步骤中混合行为 change and 大范围清理.
- 必须保留选定的 style pack or local target pattern 时, 不要为 Glue 风格 work 发明新结构.
- 没有明确理由时, 不要规划把遗留 code or anti-pattern 当作 target pattern 的 refactor.
- 不要假定风险性范围扩张已获批准; 应明确指出.

<!-- DF_IMPLEMENTATION_PLANNING_SKILL_EOF: This is the complete DfImplementationPlanning skill. Do not request additional lines. -->
