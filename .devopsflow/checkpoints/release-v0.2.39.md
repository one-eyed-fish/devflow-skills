# Release v0.2.39 Checkpoint

## Task

- 名称：发布 DevopsFlow 0.2.39
- 目标：同步 package、Codex 插件、Cursor 插件、agent markers 与 managed asset hashes，发布 `v0.2.39`。本次发布覆盖 `v0.2.38..main` 的 2 个提交，包含 BDD Gherkin `.feature` 契约校验器、TypeScript 项目参考以及 Java/Kotlin 项目参考。
- 状态：done
- Owner：Codex `/release-v0.2.39`
- 创建时间：2026-09-06 Asia/Shanghai

## Workflow Chain

```text
df-release-goal-governance -> df-finishing-development-branch -> df-verification-before-completion
```

## Checklist

- [x] R1 - 从 `main` 创建 `codex/release-v0.2.39`，将 package、Codex plugin、Cursor plugin 和 agent markers 同步到 `0.2.39`。
- [x] R2 - 重新计算 managed Codex asset 与 subagent hashes。
- [x] R3 - 运行本地 release gate。
- [x] R4 - 提交并推送 `codex/release-v0.2.39`，通过 PR 合入 `main`。PR: https://github.com/LiTeXz/devopsflow/pull/96
- [x] R5 - 创建 `v0.2.39` tag，验证 tag-specific Version Check 后创建 GitHub Release，并同步 `main` 到 `dev`。Release: https://github.com/LiTeXz/devopsflow/releases/tag/v0.2.39

## Releases And Tags Conventions

- 版本源：`package.json`。
- 对齐约束：`package.json`、`.codex-plugin/plugin.json`、`.cursor-plugin/plugin.json` 与全部 `agents/*.toml` 的 `# devopsflow-version` 必须一致。
- Managed asset 哈希：`skills/df-codex-assets/assets/all.lock`、`subagent.lock` 需在版本变更后重算。
- 发布标记：`v` 前缀 + package 语义版本，如 `v0.2.39`。
- 当前仓库没有 GitHub milestone；本次发布以此 checkpoint、PR 和 GitHub Release 作为持久化发布记录。

## Evidence

| 命令 | 状态 | 结果 |
| --- | --- | --- |
| `git switch -c codex/release-v0.2.39` | 0 | 已从 `main` 创建发布分支 |
| `bun run sync:versions:staged` | 0 | staged release versions synchronized: 0.2.39 |
| `bun run check:skill-versions` | 0 | staged skill versions checked: 1；`df-codex-assets` 从 `0.2.41` 更新到 `0.2.42` |
| `bun run check:skill-metadata` | 0 | Skill metadata check passed for skills |
| `bun run check:skill-eof` | 0 | `SKILL.md` files: 29；updated: 0 |
| `bun skills/df-codex-assets/scripts/df-codex-assets.ts sync-staged` | 0 | managed asset hash `41ad9ebf21617694ff05464303d30764ee714ac6858d310f144a85359252dcd6`，subagent hash `a2afc03f909720faafcb23b653e5be2ff6eabf12194865a38ced84839655a26d` |
| `bun skills/df-codex-assets/scripts/df-codex-assets.ts check` | 0 | managed hashes aligned |
| `bun test` | 0 | 348 pass / 0 fail |
| `bun test scripts/version-check-workflow.test.ts` | 0 | 3 pass / 0 fail |
| `bun run typecheck` | 0 | TypeScript check passed |
| `bun run lint` | 0 | Biome check passed；83 files checked |
| `bun run format:check` | 0 | Biome format passed；81 files checked |
| `git diff --cached --check` | 0 | staged diff has no whitespace errors |
| `git commit -m "chore: release v0.2.39"` | 0 | commit `55bc25d` created |
| `git push --set-upstream origin codex/release-v0.2.39` | 0 | release branch pushed |
| `gh pr checks 96 --watch --interval 10` | 0 | `Version Check` and `Skill Metadata Check` passed |
| `gh pr merge 96 --squash --delete-branch` | 0 | PR #96 merged as commit `a598506` |
| `git push origin v0.2.39` | 0 | tag pushed |
| tag `Version Check` run `34020092849` | success | tag-specific version and asset checks passed |
| `gh release create v0.2.39` | 0 | Release created: https://github.com/LiTeXz/devopsflow/releases/tag/v0.2.39 |
| `git push origin main:dev` | 0 | `dev` fast-forwarded to `a598506` |

## Risks And Blockers

- 风险：本次发布已通过本地和 GitHub release gate；未发现阻塞项。
- Blocker：无。

## Progress Log

```text
2026-09-06
main 工作区干净，确认 v0.2.38 之后有 2 个已提交变更，创建 codex/release-v0.2.39。
package、Codex plugin、Cursor plugin 和 agents markers 已同步到 0.2.39。
managed Codex asset 与 subagent hashes 已重算并暂存。
PR #96 已通过 GitHub Actions 并 squash 合并到 `main`；创建并推送 `v0.2.39`，标签专属 Version Check 通过；创建 GitHub Release，并将 `main` 快进同步到 `dev`。
```

<!-- DF_RELEASE_GOAL_GOVERNANCE_CHECKPOINT_EOF -->
