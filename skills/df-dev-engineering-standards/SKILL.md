---
name: df-dev-engineering-standards
description: "按权威工程规范处理架构、API、安全、输入边界、Java 代码规范和代码评审任务"
version: "0.2.36"
license: "GPL-3.0-only"
metadata:
  version: "0.2.36"
---

# Dev Engineering Standards

## Purpose

为规范敏感的工程任务选择适用的权威标准，并将其转换为当前项目可执行、可验证的决策。仅在任务涉及架构边界、API/契约、安全、输入边界或 Code Review 时使用；普通格式化、局部实现和不涉及规范判断的测试修复不触发本 Skill。

## Authority Order

按以下优先级裁决规范冲突：

1. 目标项目根目录及受影响文件最近的 `AGENTS.md`。
2. 目标项目的模块、框架和团队规范。
3. 用户在当前任务中明确给出的约束。
4. 适用的外部权威规范，见 [standards.md](references/standards.md)。
5. DevopsFlow 的默认工程原则。

项目规则覆盖外部默认建议时，保留项目规则并记录偏离原因。不得用外部规范覆盖项目明确的边界、契约或安全策略。

## Workflow

1. 识别规范敏感面：架构职责、API/契约、安全、输入边界、Java 风格或代码评审；一个任务可以有多个面。
2. 从目标项目根目录向受影响文件所在目录查找并完整阅读适用的 `AGENTS.md`、贡献指南和技术规范。不存在时明确记录“未找到”。
3. 根据敏感面选择最小的外部来源：工程流程/评审使用 Google Engineering Practices，安全和输入验证使用 OWASP ASVS，API/HTTP/契约使用 Google AIP，Java 风格使用 Google Java Style Guide。依赖具体条款时读取官方当前页面，不凭记忆补写规则。
4. 将规范解释为当前任务的责任、前置条件、失败行为和验证方式。区分“规范原文要求”“项目规则要求”和“本次设计判断”。
5. 检查实现、测试和文档是否共同遵守裁决结果；对未适用或无法验证的规则说明范围和原因。
6. 在交付或评审结果中记录实际使用的来源、项目覆盖关系、运行的验证命令和剩余风险。

## Boundary Responsibility

区分三种行为，不要把它们混成“防御性处理”：

- **规范化**：将公开契约明确允许的别名转换为唯一有效表示，由拥有该输入契约的边界执行且只执行一次。
- **校验**：每个被调用边界仍验证自己拥有的不变量；收到未规范化或非法值时按项目契约拒绝，不以重复修复代替校验。
- **业务决策**：需要业务信息和一致性判断的规则归属于拥有该业务责任的应用或领域边界，不因输入来自 Controller 就放入 Controller。

例如，公开 HTTP 请求允许名称前后空白被忽略时，HTTP 输入边界可以执行一次 `trim`，下游消费规范化后的值；下游不得再次 `trim`，但必须拒绝空名称或违反名称唯一性的不变量。若项目契约不允许空白别名，则输入边界应拒绝，而不是擅自修复。

## Decision Record

规范敏感任务至少输出以下信息，格式可按任务调整：

```text
规范面：<architecture | api | security | input-boundary | code-review | language-style>
项目来源：<AGENTS.md / module rule / not found>
外部来源：<official standard and URL>
裁决：<the rule applied to this task>
责任边界：<owner, caller, callee, or module>
验证：<test, linter, static check, review evidence>
未覆盖或偏离：<none or concrete reason>
```

## Guardrails

- 不复制外部标准全文；只读取与当前敏感面相关的官方条款。
- 不把一次性库用法、团队偏好或局部经验提升为跨项目原则。
- 不用代码风格规范裁决领域模型，不用安全规范替代授权设计，也不用品质检查掩盖未解决的契约歧义。
- 没有可验证的项目规则或官方条款时，标记为设计判断或未决问题，不伪造权威依据。
- 发现项目规则与外部标准冲突时，保留项目规则，说明适用范围和风险，不静默改写。

## References

只在任务需要时读取 [standards.md](references/standards.md)，获取官方入口、适用范围和不应过度推断的边界。

<!-- DF_DEV_ENGINEERING_STANDARDS_SKILL_EOF: This is the complete DfDevEngineeringStandards skill. Do not request additional lines. -->
