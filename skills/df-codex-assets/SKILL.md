---
name: df-codex-assets
description: "在 other hook run 前, 将 DevopsFlow Codex hook runtime 资产引导至已 install 的 plugin 镜像."
version: "0.2.38"
license: "GPL-3.0-only"
metadata:
  version: "0.2.38"
---

# DevopsFlow Codex Asset Bootstrap

此内部 skill 携带 DevopsFlow 托管的 Codex runtime 资产引导 script 及预期哈希 value.

SessionStart hook 会在 runtime hook script 之前 run `scripts/df-codex-assets.ts hydrate`. 该 script 会 verify 托管资产的哈希 value; 当已 install 的 plugin 镜像缺少这些资产时, 会从匹配的 GitHub tag 下载对应版本的 file.

another SessionStart hook 会 run `scripts/df-codex-assets.ts sync-project-gitignore`, 将 `assets/.gitignore` 的 DevopsFlow 托管区块同步到 payload `cwd` 下的 `.devopsflow/.gitignore`. 该命令保留区块外的 project custom rule, 内容 consistent 时不 write file; 标记缺失, 逆序 or 重复时保持 fail-open, 仅 output 警告且不修改 target file.

## Explicit Hook Trust

仅当 user 明确要求信任 DevopsFlow hooks 时, run:

```bash
bun "<PLUGIN_ROOT>/skills/df-codex-assets/scripts/trust-codex-hooks.ts"
```

将 `<PLUGIN_ROOT>` 替换为当前 skill 所属的已 install plugin 根 directory.

该命令读取 plugin manifest 中声明的 hook file, 复算所有受支持 command hooks 的 Codex 信任指纹, 并将缺失 or 过期的 `trusted_hash` 原子 write `~/.codex/config.toml`. 已经匹配的 hook 保持不变; 全部匹配时不 write 配置 file.

不要从 `SessionStart` hydration or other 隐式路径 run 此命令. user 主动 call 是允许 script 跳过 Codex 交互式 hook 审核的授权边界.

<!-- DF_CODEX_ASSETS_SKILL_EOF: This is the complete DfCodexAssets skill. Do not request additional lines. -->
