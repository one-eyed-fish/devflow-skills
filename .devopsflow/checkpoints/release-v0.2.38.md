# Release v0.2.38 Checkpoint

## Task

- 名称：发布 DevopsFlow 0.2.38
- 目标：同步 package、Codex 插件、Cursor 插件、agent markers 与 managed asset hashes，准备版本标签发布。本次发布覆盖 `v0.2.37..codex/release-v0.2.38`，核心为 BDD 使用 Gherkin `.feature` 契约并将 TDD 纳入测试范围。
- 状态：active
- Owner：Codex `/release-v0.2.38`
- 创建时间：2026-09-06 Asia/Shanghai

## Workflow Chain

```text
df-release-goal-governance -> df-finishing-development-branch -> df-verification-before-completion
```

## Checklist

- [ ] R1 - 从 `main` 创建 `codex/release-v0.2.38`，将 package、Codex plugin、Cursor plugin 和 agent markers 同步到 `0.2.38`。
- [ ] R2 - 重新计算 managed Codex asset 与 subagent hashes。
- [ ] R3 - 运行本地 release gate。
- [ ] R4 - 提交并推送 `codex/release-v0.2.38`，通过 PR 合入 `main`。
- [ ] R5 - 创建 `v0.2.38` tag，验证 tag-specific Version Check 后创建 GitHub Release，并同步 `main` 到 `dev`。

## Releases And Tags Conventions

- 版本源：`package.json`。
- 对齐约束：`package.json`、`.codex-plugin/plugin.json`、`.cursor-plugin/plugin.json` 与全部 `agents/*.toml` 的 `# devopsflow-version` 必须一致。
- Managed asset 哈希：`skills/df-codex-assets/assets/all.lock`、`subagent.lock` 需在版本变更后重算。
- 发布标记：`v` 前缀 + package 语义版本，如 `v0.2.38`。

## Evidence

| 命令 | 状态 | 结果 |
| --- | --- | --- |
| `bun run sync:versions:staged` | 0 | staged release versions synchronized: 0.2.38 |
| `bun skills/df-codex-assets/scripts/df-codex-assets.ts sync-staged` | 0 | managed asset hash `725e44043b56def86d80dd9b0519a1f6e8a2b8ba59955b31c3518d02cb7e2f08` 与 subagent hash `2570a947331023d562b01c12e78ddf563bf0fec8e42def1caf9f3c50a56f7558` |
| `bun skills/df-codex-assets/scripts/df-codex-assets.ts check` | 0 | managed hashes aligned |
| `bun run check:skill-metadata` | 0 | skill metadata check passed for skills |
| `bun run check:skill-versions` | 0 | staged skill versions checked |
| `bun run check:skill-eof` | 0 | SKILL.md files checked |
| `bun test` | 0 | 338 pass / 0 fail |
| `bun run typecheck` | 0 | TypeScript check passed |
| `bun run lint` | 0 | Biome check passed |
| `bun run format:check` | 0 | Biome format passed |

## Risks And Blockers

- 风险：本次发布包含 `v0.2.37..codex/release-v0.2.38` 的功能改动，需完整 CI checks（Version Check + skill-metadata-check）证明可发布。
- Blocker：待完整本地 release gate 运行结果。

## Progress Log

```text
2026-09-06
从 main HEAD 31807ad 创建 codex/release-v0.2.38。
提交功能改动 feat: BDD 使用 Gherkin .feature 契约并将 TDD 纳入测试范围（5a8d927）。
package/plugins/agents -> 0.2.38，重算 managed asset 与 subagent hashes。
待运行完整本地 release gate，提交、推送、PR 合入 main，随后 tag v0.2.38、创建 GitHub Release 并同步 main -> dev。
```

<!-- DF_RELEASE_GOAL_GOVERNANCE_CHECKPOINT_EOF -->