import { appendFileSync, mkdirSync, readdirSync, readSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { format } from 'node:util'

export type ScriptLogLevel = 'debug' | 'info' | 'warn' | 'error'
export type ScriptLogValue = string | number | boolean | null | undefined

export interface ScriptLoggingContext {
  readonly scriptName: string
  readonly pluginRoot?: string
  readonly sessionId?: string
  readonly payload?: unknown
  readonly now?: Date | (() => Date)
  readonly details?: Readonly<Record<string, ScriptLogValue>>
}

export interface ScriptLogger {
  readonly filePath?: string
  readonly sessionId: string
  log(level: ScriptLogLevel, event: string, details?: Readonly<Record<string, ScriptLogValue>>): void
}

const SESSION_ENV_NAMES = ['CODEX_THREAD_ID', 'CODEX_SESSION_ID', 'CLAUDE_SESSION_ID', 'OPENCODE_SESSION_ID'] as const

const CONSOLE_LEVELS = {
  debug: 'debug',
  error: 'error',
  info: 'info',
  log: 'info',
  warn: 'warn',
} as const satisfies Record<keyof Pick<Console, 'debug' | 'error' | 'info' | 'log' | 'warn'>, ScriptLogLevel>

export function readScriptPayload(): Record<string, unknown> | null {
  try {
    const chunks: Buffer[] = []
    const buffer = Buffer.alloc(65536)
    let bytesRead = readSync(0, buffer, 0, buffer.length, null)
    while (bytesRead > 0) {
      chunks.push(Buffer.from(buffer.subarray(0, bytesRead)))
      bytesRead = readSync(0, buffer, 0, buffer.length, null)
    }
    const raw = Buffer.concat(chunks).toString('utf-8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export function runLoggedScript(context: ScriptLoggingContext, action: (logger: ScriptLogger) => number): number {
  const logger = createScriptLogger(context)
  logger.log('info', 'script.start', scriptContextDetails(context.payload, context.details))
  const restoreConsole = captureConsole(logger)
  try {
    const exitCode = action(logger)
    logger.log('info', 'script.finish', { exitCode })
    return exitCode
  } catch (error) {
    logger.log('error', 'script.error', errorDetails(error))
    throw error
  } finally {
    restoreConsole()
  }
}

export async function runLoggedScriptAsync(context: ScriptLoggingContext, action: (logger: ScriptLogger) => Promise<number>): Promise<number> {
  const logger = createScriptLogger(context)
  logger.log('info', 'script.start', scriptContextDetails(context.payload, context.details))
  const restoreConsole = captureConsole(logger)
  try {
    const exitCode = await action(logger)
    logger.log('info', 'script.finish', { exitCode })
    return exitCode
  } catch (error) {
    logger.log('error', 'script.error', errorDetails(error))
    throw error
  } finally {
    restoreConsole()
  }
}

export function createScriptLogger(context: ScriptLoggingContext): ScriptLogger {
  const sessionId = resolveSessionId(context)
  const now = nowProvider(context.now)
  let filePath: string | undefined
  try {
    filePath = resolveLogFile(resolvePluginRoot(context.pluginRoot), sessionId, now())
  } catch {}

  return {
    filePath,
    sessionId,
    log(level, event, details = {}) {
      try {
        const entry = {
          timestamp: now().toISOString(),
          level,
          event,
          script: context.scriptName,
          sessionId,
          ...safeDetails(details),
        }
        // Stryker disable next-line StringLiteral -- the empty fallback is only used after log-file resolution fails
        appendFileSync(filePath ?? '', `${JSON.stringify(entry)}\n`)
      } catch {}
    },
  }
}

function resolveLogFile(pluginRoot: string, sessionId: string, now: Date): string {
  const logDir = join(pluginRoot, '.logs')
  mkdirSync(logDir, { recursive: true })
  const safeSessionId = sanitizeSessionId(sessionId)
  const existing = readdirSync(logDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => sessionIdFromFileName(fileName) === safeSessionId)
    .sort((left, right) => left.localeCompare(right))[0]
  return join(logDir, existing ?? `${formatMinute(now)}-${safeSessionId}.log`)
}

export function resolvePluginRoot(configuredRoot?: string): string {
  return resolve(configuredRoot ?? process.env.DEVOPSFLOW_PLUGIN_ROOT ?? process.env.PLUGIN_ROOT ?? resolve(import.meta.dir, '../../..'))
}

function resolveSessionId(context: ScriptLoggingContext): string {
  const explicit = nonEmptyString(context.sessionId)
  if (explicit) return explicit
  const payloadSessionId = sessionIdFromPayload(context.payload)
  if (payloadSessionId) return payloadSessionId
  for (const name of SESSION_ENV_NAMES) {
    const value = nonEmptyString(process.env[name])
    if (value) return value
  }
  return `standalone-${process.pid}`
}

function sessionIdFromPayload(payload: unknown): string | undefined {
  if (!payload || Array.isArray(payload)) {
    return undefined
  }
  const record = payload as Record<string, unknown>
  return nonEmptyString(record.session_id) ?? nonEmptyString(record.sessionId)
}

function sessionIdFromFileName(fileName: string): string | undefined {
  const match = /^(?:\d{12})-(.+)\.log$/.exec(fileName)
  return match?.[1]
}

function sanitizeSessionId(sessionId: string): string {
  try {
    return encodeURIComponent(sessionId)
  } catch {
    return `encoded-${Buffer.from(sessionId).toString('base64url')}`
  }
}

function formatMinute(value: Date): string {
  return [
    value.getFullYear().toString().padStart(4, '0'),
    (value.getMonth() + 1).toString().padStart(2, '0'),
    value.getDate().toString().padStart(2, '0'),
    value.getHours().toString().padStart(2, '0'),
    value.getMinutes().toString().padStart(2, '0'),
  ].join('')
}

function nowProvider(configured?: Date | (() => Date)): () => Date {
  if (configured instanceof Date) return () => configured
  return configured ?? (() => new Date())
}

function scriptContextDetails(payload: unknown, details: Readonly<Record<string, ScriptLogValue>> | undefined): Readonly<Record<string, ScriptLogValue>> {
  if (!payload || Array.isArray(payload)) {
    return details ?? {}
  }
  const record = payload as Record<string, unknown>
  return {
    ...details,
    hookEvent: nonEmptyString(record.hook_event_name) ?? nonEmptyString(record.hookEventName) ?? nonEmptyString(record.event),
    toolName: nonEmptyString(record.tool_name) ?? nonEmptyString(record.toolName) ?? nonEmptyString(record.tool),
    cwd: nonEmptyString(record.cwd),
  }
}

function errorDetails(error: unknown): Readonly<Record<string, ScriptLogValue>> {
  if (error instanceof Error) {
    return {
      message: error.message,
      errorName: error.name,
      stack: error.stack,
    }
  }
  return { message: String(error) }
}

function safeDetails(details: Readonly<Record<string, ScriptLogValue>>): Record<string, ScriptLogValue> {
  const result: Record<string, ScriptLogValue> = {}
  for (const [key, value] of Object.entries(details)) {
    if (['timestamp', 'level', 'event', 'script', 'sessionId'].includes(key)) {
      continue
    }
    result[key] = value
  }
  return result
}

function captureConsole(logger: ScriptLogger): () => void {
  const methods = Object.keys(CONSOLE_LEVELS) as (keyof typeof CONSOLE_LEVELS)[]
  const originals = new Map<keyof typeof CONSOLE_LEVELS, (...args: unknown[]) => void>()
  for (const method of methods) {
    const original = console[method].bind(console) as (...args: unknown[]) => void
    originals.set(method, original)
    console[method] = ((...args: unknown[]) => {
      original(...args)
      logger.log(CONSOLE_LEVELS[method], 'script.output', {
        stream: method === 'error' || method === 'warn' ? 'stderr' : 'stdout',
        message: format(...args),
      })
    }) as Console[typeof method]
  }

  return () => {
    for (const method of methods) {
      console[method] = originals.get(method) as Console[typeof method]
    }
  }
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized || undefined
}
