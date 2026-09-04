---
name: df-dev-engineering-workflow-route
description: "强制 development 工程 workflow route. 在 software development, refactor, 缺陷 fix, domain 建模, Glue Coding, API or 授权设计, code 审查, 验证, 分支收尾 or commit ready 开始时, 对 task category 并选择必需的 skills."
version: "0.2.32"
license: "GPL-3.0-only"
metadata:
  version: "0.2.32"
---

# Dev Engineering Workflow Route

在开始工程 work 前使用此 skill. 它只负责 generate workflow 决策, 不代替被选中的 skills.

## Source Of Truth

category, 风险维度, skill mapping, 选择理由, execution 顺序 and default 链全部集中 definition 在 [workflow-router.ts](scripts/workflow-router.ts). 不要在 Markdown, metadata or other script 中复制这些 definition.

## Workflow

1. 根据 user 请求选择 1 个 `TaskType`, 并识别所有适用的 `RiskDimension`.
2. call TypeScript router:

   ```bash
   bun "<SKILL_INSTALL_ROOT>/scripts/workflow-router.ts" --task-type <task-type> --risks <risk-1,risk-2>
   ```

3. 向 user 简要说明 return 的 task type, 主要风险, 必需 skills and execution 顺序.
4. 立即按 `executionOrder` 使用选中的 skills.
5. if 某个 skill unavailable, 说明缺失项并使用最接近的 available workflow.

不确定 available value 时 run:

```bash
bun "<SKILL_INSTALL_ROOT>/scripts/workflow-router.ts" --help
```

## Rules

- 除非 task 仅涉及文档, 格式 or 直接提问, 否则不要因为 task 看似很小而跳过 route.
- route 要求先建模, 规划, TDD or debugging 时, 不要提前 edit 生产 code.
- 不要让 Glue Coding 绕过 domain 歧义 check.
- 工程 change 没有经过 return result 中的完成 gate 时, 不要宣称完成.
- 尊重 worktree 中 user 所有的 change, 绝不还原无关 edit.

## References

- [workflow-map.md](references/workflow-map.md): 解释如何阅读 route result, 不 include 第2份 rule definition.

<!-- DF_DEV_ENGINEERING_WORKFLOW_ROUTE_SKILL_EOF: This is the complete DfDevEngineeringWorkflowRoute skill. Do not request additional lines. -->
