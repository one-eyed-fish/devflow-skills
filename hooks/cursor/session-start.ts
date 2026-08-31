#!/usr/bin/env bun

import { findWorkdir, readPayload } from '@/shared/payload'
import type { Payload } from '@/shared/types'
import { updateProtectedBranches } from '../session-start/update-protected-branches'

function main(payload: Payload | null = readPayload()): number {
  if (!payload || typeof payload !== 'object') return 0
  try {
    const result = updateProtectedBranches(findWorkdir(payload, {}))
    if (result.updated.length > 0) {
      console.log(JSON.stringify({ additional_context: `DevopsFlow 已更新分支：${result.updated.join(', ')}` }))
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    const instruction = 'Agent 必须检查 Git 状态和分支差异，并与用户协商如何处理冲突；不得强推、重置或擅自覆盖本地提交。'
    console.error(`DevopsFlow 无法更新受保护分支：${detail}`)
    console.error(instruction)
    console.log(JSON.stringify({ additional_context: `受保护分支更新失败：${detail}\n${instruction}` }))
    return 2
  }
  return 0
}

if (import.meta.main) process.exit(main())
