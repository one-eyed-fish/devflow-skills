# Release v0.2.36 Checkpoint

## Task

- 名称：发布 DevopsFlow 0.2.36
- 目标：同步 package、Codex 插件、Cursor 插件、agent markers 与 managed asset hashes，准备版本标签发布。
- 状态：active
- Owner：Codex `/release-v0.2.36`
- 创建时间：2026-09-01 Asia/Shanghai

## Workflow Chain

```text
df-release-goal-governance -> df-finishing-development-branch -> df-verification-before-completion
```

## Checklist

- [x] R1 - 将 package、Codex plugin、Cursor plugin 和 agent markers 同步到 `0.2.36`。
- [x] R2 - 重新计算 managed Codex asset 与 subagent hashes。
- [x] R3 - 运行本地 release gate。
- [ ] R4 - 提交并推送 `codex/release-v0.2.36`，通过 PR 合入 `main`。
- [ ] R5 - 创建 `v0.2.36` tag，验证 tag-specific Version Check 后创建 GitHub Release。

## Evidence

| 命令 | 状态 | 结果 |
| --- | --- | --- |
| `bun skills/df-codex-assets/scripts/df-codex-assets.ts sync-staged` | 0 | 生成 managed asset hash `804cfaa9d9d5fd78e02a030bee627bde0f2651e718c437f17e79b786d92aaad0` 与 subagent hash `87f51a4e05fd77930be851008d8894a8e3400a9f805e8cf9673692d4e3a943e4` |
| `bun skills/df-codex-assets/scripts/df-codex-assets.ts check` | 0 | managed hashes aligned |
| `bun run check:skill-metadata` | 0 | skill metadata check passed |
| `bun run check:skill-versions` | 0 | staged skill versions checked: 1 |
| `bun run check:skill-eof` | 0 | 24 SKILL.md files checked |
| `bun test` | 0 | 263 tests passed, 0 failed |
| `bun run typecheck` | 0 | TypeScript check passed |
| `bun run lint` | 0 | Biome check passed |
| `bun run format:check` | 0 | Biome format passed |

## Progress Log

```text
2026-09-01
从 dev HEAD c76c358 创建 codex/release-v0.2.36，完成版本面和 managed asset hash 同步。
本地 release gate 全部通过，待用户提交、推送、创建 PR 并完成 tag/release。
```
