---
name: df-verification-before-completion
description: "工程 work 的强制完成 gate. 在宣称 development, refactor, 缺陷 fix, 建模, 审查, 文档, 配置, commit or PR task 完成前使用, 用于核验 user 需求, change file, 已 run 命令及 exit code, 跳过的 check, 手动验证, 残余风险以及无关 change."
version: "0.2.29"
license: "GPL-3.0-only"
metadata:
  version: "0.2.29"
---

# Verification Before Completion

在宣称完成前使用此 skill. 它是完成 gate, 本身不是 tests 策略.

## Verification Checklist

回答 each 项:

1. 最终 result 是否满足 user 的 each 项要求?
2. 哪些 file 发生了 change?
3. run 了哪些命令, 它们的 exit code 是什么?
4. 哪些相关 tests or check 未 run, 原因是什么?
5. 是否进行了手动验证? 具体观察到了什么?
6. 是否仍有风险, 假设 or 未完成区域?
7. worktree 中是否有无关 change or user 所有的 change?
8. if 要求 TDD, 是否有 RED/GREEN/REFACTOR 证据?
9. if 存在与 `df-dev-bdd` 确认的 Gherkin `.feature`, 是否每个冻结 Scenario 都有测试、实现切片与验收追踪，且 refactor 未改变行为契约?
10. if 要求 DDD 建模, 结论是否在持久化前得到确认?
11. if Spring Web 边界发生变化, 是否覆盖了端点契约 and service 边界扫描?
12. if 要求 Glue Coding, 使用了哪个 style pack or local target 模式, implementation 了哪些差异; 是否应持久化任何新 rule, 知识, 模式, style pack 材料 or track? 对于 refactor, 避开了哪些遗留模式 or anti-pattern, 又有哪些 characterization 证据保护行为?

## Evidence Standard

使用具体证据:

- 命令行及 exit code
- tests name or tests 套件 name
- file 路径
- 观察到的行为
- 跳过的命令及原因

不要只 write"tests passed"之类的模糊表述, 而不提供命令 and 范围.

## Output Format

内部笔记 or 交接 file 使用 [verification-report.md](templates/verification-report.md). 在最终回复中, 简要汇总相同的证据:

```markdown
Completion Status:
- Satisfied:
- Changed Files:
- Verification:
- Not Run:
- Remaining Risks:
```

## Non-Negotiable Rules

- 在满足此 manifest 前, 不要宣称"已完成"or 使用同等表述.
- 不要隐瞒跳过的 tests.
- 不要暗示验证范围比实际 run 的更广.
- 不要忽略 dirty worktree 中的 change. 应将自己的 edit and 无关 change 分开.
- if 缺少必要证据, 不要提交, 除非 user 明确接受该风险.

<!-- DF_VERIFICATION_BEFORE_COMPLETION_SKILL_EOF: This is the complete DfVerificationBeforeCompletion skill. Do not request additional lines. -->
