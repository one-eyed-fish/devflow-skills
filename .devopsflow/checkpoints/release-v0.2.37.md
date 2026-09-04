# Release v0.2.37 Checkpoint

## Task

- 名称：发布 DevopsFlow 0.2.37
- 目标：同步 package、Codex 插件、Cursor 插件、agent markers 与 managed asset hashes，准备版本标签发布。本次发布覆盖 `v0.2.36..main` 的 8 个提交（`df-dev-bdd`、`df-dev-sdd`、`df-dev-ddd` 技能，事件识别与接纳、权威工程规范路由接入等）。
- 状态：active
- Owner：Codex `/release-v0.2.37`
- 创建时间：2026-09-04 Asia/Shanghai

## Workflow Chain

```text
df-release-goal-governance -> df-finishing-development-branch -> df-verification-before-completion
```

## Checklist

- [x] R1 - 从 `main` 创建 `codex/release-v0.2.37`，将 package、Codex plugin、Cursor plugin 和 agent markers 同步到 `0.2.37`。
- [x] R2 - 递增 `df-codex-assets` skill 版本至 `0.2.40`，并重新计算 managed Codex asset 与 subagent hashes。
- [x] R3 - 运行本地 release gate。`bun test` 中的 `Codex hook trust hash > matches upstream on main` 用例为既有上游漂移失败（在干净 `main` 亦失败），不属于本次发布回归。
- [x] R4 - 提交并推送 `codex/release-v0.2.37`，通过 PR 合入 `main`。PR: https://github.com/LiTeXz/devopsflow/pull/94
- [x] R5 - 创建 `v0.2.37` tag，验证 tag-specific Version Check 后创建 GitHub Release，并同步 `main` 到 `dev`。Release: https://github.com/LiTeXz/devopsflow/releases/tag/v0.2.37

## Releases And Tags Conventions

- 版本源：`package.json`。
- 对齐约束：`package.json`、`.codex-plugin/plugin.json`、`.cursor-plugin/plugin.json` 与全部 `agents/*.toml` 的 `# devopsflow-version` 必须一致。
- Managed asset 哈希：`skills/df-codex-assets/assets/all.lock`、`subagent.lock` 需在版本变更后重算。
- 发布标记：`v` 前缀 + package 语义版本，如 `v0.2.37`。

## Evidence

| 命令 | 状态 | 结果 |
| --- | --- | --- |
| `bun run sync:versions:staged` | 0 | staged release versions synchronized: 0.2.37 |
| `bun skills/df-codex-assets/scripts/df-codex-assets.ts sync-staged` | 0 | managed asset hash `5056f642a81ecc6d18e8857687100708f7ae059c09524637db3ec44f20a834b5` 与 subagent hash `fd887210d6d695d8040f016f5973b0965156e39254c2d92c40fb45a02db497ff` |
| `bun skills/df-codex-assets/scripts/df-codex-assets.ts check` | 0 | managed hashes aligned |
| `bun run check:skill-metadata` | 0 | skill metadata check passed for skills |
| `bun run check:skill-versions` | 0 | staged skill versions checked: 1 (df-codex-assets 0.2.39 -> 0.2.40) |
| `bun run check:skill-eof` | 0 | 28 SKILL.md files checked |
| `bun test` | 1* | 265 pass / 1 fail（`trust-codex-hooks` 上游 `discovery.rs` fingerprint 漂移，干净 main 亦失败，预存问题） |
| `bun run typecheck` | 0 | TypeScript check passed |
| `bun run lint` | 0 | Biome check passed (77 files) |
| `bun run format:check` | 0 | Biome format passed (75 files) |
| `bun test scripts/version-check-workflow.test.ts` | 0 | tag workflow contract passed (3 tests) |
| `bun scripts/format-markdown-codeblocks.ts release-v0.2.37.md` | 0 | markdown code blocks formatted |

## Risks And Blockers

- 既有风险（不阻断发布，但需周知）：`skills/df-codex-assets/scripts/trust-codex-hooks.test.ts` 的 `matches the upstream Codex hook trust implementation on main` 用例因上游 `codex-rs/hooks/src/engine/discovery.rs` 源码变更而失败；此为预存上游漂移，与本次发布无关，在干净 `main` 亦失败。Version Check engine 不含该依赖，不构成 tag 阻断；建议另开 issue 随上游同步更新 fingerprint。
- 风险：本次发布包含 `v0.2.36..main` 的 8 个提交，需完整 CI checks（Version Check + skill-metadata-check）证明可发布。
- Blocker：无（除上述非发布回归的上游漂移）。

## Progress Log

```text
2026-09-04
从 main HEAD 10355bd 创建 codex/release-v0.2.37，完成版本面与 managed asset hash 同步。
本地 release gate 已运行：skill-metadata/skill-versions/skill-eof/typecheck/lint/format 全绿；
bun test 265 pass，唯一失败为预存上游 discovery.rs fingerprint 漂移（干净 main 亦失败），非发布回归。
待用户提交、推送、创建 PR 合入 main，随后 tag v0.2.37、验证 Version Check、创建 GitHub Release 并同步 main -> dev。
```

<!-- DF_RELEASE_GOAL_GOVERNANCE_CHECKPOINT_EOF -->