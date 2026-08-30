#!/usr/bin/env bun

import { findCommand, findToolInput, findToolName, findWorkdir, readPayload, SHELL_TOOL_NAMES } from '@/shared/payload'
import type { Payload } from '@/shared/types'
import { shouldBlockGitMutation } from '../pre-tool-use/prevent-git-push-protected-commit'

function main(payload: Payload | null = readPayload()): number {
  if (!payload || typeof payload !== 'object') return 0
  const toolName = findToolName(payload)
  if (toolName && !SHELL_TOOL_NAMES.has(toolName)) return 0
  const input = findToolInput(payload) ?? {}
  const command = findCommand(input)
  if (!command) return 0
  const decision = shouldBlockGitMutation(command, findWorkdir(payload, input))
  if (!decision) return 0

  const message =
    decision.kind === 'push'
      ? 'DevopsFlow 已阻止 Agent 执行 git push；任何分支都必须由用户手动推送。'
      : decision.kind === 'hook-bypass'
        ? 'DevopsFlow 已阻止跳过本地 Git hooks 的命令。'
        : 'DevopsFlow 已阻止 Agent 执行 git commit；请由用户手动提交。'
  console.error(`${message} 请先审查代码并完成必要的本地 hooks 检查。`)
  return 2
}

if (import.meta.main) process.exit(main())
