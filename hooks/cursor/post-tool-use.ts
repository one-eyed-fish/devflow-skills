#!/usr/bin/env bun

import { findHookEvent, findToolName, readPayload } from '@/shared/payload'
import type { Payload } from '@/shared/types'
import { formatEditedFiles } from '../post-tool-use/format-edited-files'

function main(payload: Payload | null = readPayload()): number {
  if (!payload || typeof payload !== 'object') return 0
  const result = formatEditedFiles({
    ...payload,
    hook_event_name: findHookEvent(payload),
    tool_name: findToolName(payload),
  })
  if (result.warning) console.log(JSON.stringify({ additional_context: result.warning }))
  return 0
}

if (import.meta.main) process.exit(main())
