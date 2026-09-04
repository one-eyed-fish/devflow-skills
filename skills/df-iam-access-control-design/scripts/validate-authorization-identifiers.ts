#!/usr/bin/env bun

import { readFileSync } from 'node:fs'
import { runLoggedScript } from '@/shared/script-logger'

export type IdentifierKind = 'permission' | 'role'

export interface IdentifierFinding {
  line: number
  value: string
  errors: string[]
}

const LOWER_CAMEL_SEGMENT = '[a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)*'
const SERVICE_SEGMENT = '[a-z][a-z0-9]*'
const PERMISSION_PATTERN = new RegExp(`^${SERVICE_SEGMENT}\\.${LOWER_CAMEL_SEGMENT}\\.${LOWER_CAMEL_SEGMENT}$`)
const ROLE_PATTERN = new RegExp(`^roles/${SERVICE_SEGMENT}\\.${LOWER_CAMEL_SEGMENT}$`)

function commonErrors(value: string): string[] {
  const errors: string[] = []
  if (!value) errors.push('identifier must not be empty')
  if (value !== value.trim()) errors.push('identifier must not contain surrounding whitespace')
  if (value.includes(':')) {
    errors.push('legacy colon-delimited identifiers are forbidden')
  }
  if (value.includes('*')) errors.push('wildcard identifiers are forbidden')
  return errors
}

export function validatePermissionIdentifier(value: string): string[] {
  const errors = commonErrors(value)
  if (!PERMISSION_PATTERN.test(value)) {
    errors.push('permission must match service.resource.verb using lowerCamelCase')
  }
  return errors
}

export function validateRoleIdentifier(value: string): string[] {
  const errors = commonErrors(value)
  if (!ROLE_PATTERN.test(value)) {
    errors.push('role must match roles/service.role using lowerCamelCase')
  }
  return errors
}

export function validateIdentifierLines(text: string, kind: IdentifierKind): IdentifierFinding[] {
  const validate = kind === 'permission' ? validatePermissionIdentifier : validateRoleIdentifier
  const findings: IdentifierFinding[] = []

  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const value = rawLine.trim()
    if (!value || value.startsWith('#')) continue
    const errors = validate(rawLine)
    if (errors.length) findings.push({ line: index + 1, value: rawLine, errors })
  }

  return findings
}

function main(): number {
  // Stryker disable next-line MethodExpression -- CLI arguments intentionally exclude the Bun executable and script path
  const args = Bun.argv.slice(2)
  let kind: IdentifierKind | undefined
  let inputPath: string | undefined

  // Stryker disable next-line EqualityOperator -- the loop bound's extra no-op iteration is a runtime boundary detail
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--kind') {
      const candidate = args[++index]
      if (candidate === 'permission' || candidate === 'role') kind = candidate
    } else if (args[index] === '--input') {
      inputPath = args[++index]
    }
  }

  if (!kind || !inputPath) {
    console.error('Usage: validate-authorization-identifiers.ts --kind <permission|role> --input <file>')
    return 1
  }

  const findings = validateIdentifierLines(readFileSync(inputPath, 'utf-8'), kind)
  if (findings.length) {
    for (const finding of findings) {
      for (const error of finding.errors) {
        console.error(`ERROR line ${finding.line}: ${finding.value}: ${error}`)
      }
    }
    return 1
  }

  console.log(`${kind} identifiers valid`)
  return 0
}

if (import.meta.main) {
  process.exit(runLoggedScript({ scriptName: 'validate-authorization-identifiers' }, () => main()))
}
