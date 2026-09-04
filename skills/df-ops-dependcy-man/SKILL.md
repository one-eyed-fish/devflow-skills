---
name: df-ops-dependcy-man
description: "审计并安全清理 JavaScript, Gradle, Maven and GitHub 依赖, 识别无效, 传递, 重复, 作用域错误, 漂移 or 滥用的声明, 并审查 Dependabot rule."
version: "0.2.31"
license: "GPL-3.0-only"
metadata:
  version: "0.2.31"
---

# Ops Dependcy Man

当 repository 新增, 删除, 升级, 审计 or 整合依赖, or agent 必须审查依赖卫生时使用此 skill. 它组合 Knip, Gradle/Maven 依赖分析, GitHub 配置 check and 有证据支持的清理流程, 不猜测架构意图.

## Workflow

1. change 前 check repository 边界: package manager and lockfile, Gradle/Maven modules, source sets, generate code, CI file and 现有依赖政策.
2. 将每项发现 category 为直接 or 传递, runtime or development, production or test, optional/peer/workspace, or platform 专用. 仅仅凭未声明的传递路径使用依赖属于边界违规, 不能作为新增便利依赖的理由.
3. 以 scan 模式 run `scripts/` 中匹配的 script. 优先使用 repository wrapper(`pnpm`,`bun`,`gradlew.bat`,`mvnw.cmd`)and 既有验证 task.
4. 区分确定发现 and 建议. 当 generate code, 反射, plugins, annotation processing, service loading, framework conventions or platform packaging 可能在没有文本 import 的情况下使用依赖时, 不要删除该依赖.
5. 只有得到 user 明确授权时才使用 `--fix`. pre edit 记录 diff 并 create 临时备份; edit 后 run 最小且有意义的 build/test/lockfile 验证. verification error 时恢复备份.
6. 记录新依赖的理由: 用途, call 位置, 拒绝的替代方案, scope, license/security 影响 and 移除证据. 行为 change 搭配 `df-dev-tdd`; 使用 `df-glue-coding` 复用 local 约定; 最后使用 `df-verification-before-completion`.

## Script Contract

每个 checker 接受 `--path`,`--fix`,`--dry-run` and `--format text|json`. JSON findings include `ecosystem`,`file`,`dependency`,`type`,`evidence`,`risk`,`action` and `autoFixable`. exit code `0` 表示没有阻断发现,`1` 表示存在阻断发现,`2` 表示所需工具 or build 入口 unavailable,`3` 表示 fix or verification error.

### JavaScript

run `bun scripts/check-js-dependencies.ts --path .`. 根据 lockfiles 检测 npm/pnpm/Bun, 并在已 install or 可由 package manager 使用时 call Knip.`--fix` 仅限 Knip 确认的直接 unused/unlisted dependencies, 并保留 peer, optional, workspace and runtime entry 声明.

### Gradle and Maven

在 repository 根 directory run 匹配的 checker. check dependency trees,`dependencyInsight` or `dependency:analyze`, 直接声明, source sets, profiles and multi-module boundaries. 只有候选项明确, 存在 local 声明且 edit 后验证成功时才允许 JVM `--fix`; 否则 output patch 建议.

### GitHub

run `bun scripts/check-github-dependencies.ts --path .` check Dependabot, Actions, container images and 固定的工具版本. default 政策为每周 update, 区分 production/development groups, 设置 `open-pull-requests-limit: 5` 并保留 security updates. 不要虚构 labels, assignees or ignore rules.

## References and Assets

选择 ecosystem 工具时加载 [dependency-tool-matrix.md](references/dependency-tool-matrix.md), 审查架构 or 新依赖时加载 [dependency-policy.md](references/dependency-policy.md), generate GitHub update 配置时加载 [dependabot-policy.md](references/dependabot-policy.md). 只有调整命令 and available ecosystems 后, 才能将 [dependency-governance.yml](assets/dependency-governance.yml) 复制到宿主 repository.

<!-- DF_OPS_DEPENDCY_MAN_SKILL_EOF: This is the complete DfOpsDependcyMan skill. Do not request additional lines. -->
