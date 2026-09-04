#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import { runLoggedScript } from '@/shared/script-logger'

export interface SkillMetadataViolation {
  path: string
  message: string
}

interface SkillFrontMatter {
  name?: string
  description?: string
}

interface OpenAiAgentInterface {
  displayName?: string
  shortDescription?: string
}

function unquote(value: string): string {
  return value.trim().replace(/^["']|["']$/g, '')
}

function parseSkillFrontMatter(content: string): SkillFrontMatter {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) return {}

  const frontMatter: SkillFrontMatter = {}
  for (const line of match[1].split(/\r?\n/)) {
    const fieldMatch = line.match(/^(name|description):\s*(.+?)\s*$/)
    if (!fieldMatch) continue
    frontMatter[fieldMatch[1] as keyof SkillFrontMatter] = unquote(fieldMatch[2])
  }

  return frontMatter
}

function parseOpenAiAgentInterface(content: string): OpenAiAgentInterface {
  const result: OpenAiAgentInterface = {}
  for (const line of content.split(/\r?\n/)) {
    const displayNameMatch = line.match(/^\s{2}display_name:\s*(.+?)\s*$/)
    if (displayNameMatch) {
      result.displayName = unquote(displayNameMatch[1])
      continue
    }
    const shortDescriptionMatch = line.match(/^\s{2}short_description:\s*(.+?)\s*$/)
    if (shortDescriptionMatch) {
      result.shortDescription = unquote(shortDescriptionMatch[1])
    }
  }
  return result
}

function expectedDisplayName(folderName: string): string {
  return folderName
    .replace(/^df-/, '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function validateSkillMetadata(skillsRoot = join(import.meta.dir, '..', 'skills')): SkillMetadataViolation[] {
  const violations: SkillMetadataViolation[] = []
  if (!existsSync(skillsRoot)) {
    return [
      {
        path: skillsRoot,
        message: 'skills root does not exist',
      },
    ]
  }

  for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue

    const skillDir = join(skillsRoot, entry.name)
    const skillPath = join(skillDir, 'SKILL.md')
    if (!existsSync(skillPath) || !statSync(skillPath).isFile()) continue

    if (!entry.name.startsWith('df-')) {
      violations.push({
        path: skillPath,
        message: `skill folder "${entry.name}" must start with "df-"`,
      })
    }

    const frontMatter = parseSkillFrontMatter(readFileSync(skillPath, 'utf-8'))
    if (frontMatter.name !== entry.name) {
      violations.push({
        path: skillPath,
        message: frontMatter.name
          ? `front matter name "${frontMatter.name}" must match folder "${entry.name}"`
          : `front matter name is required and must match folder "${entry.name}"`,
      })
    }

    const agentPath = join(skillDir, 'agents', 'openai.yaml')
    if (!existsSync(agentPath) || !statSync(agentPath).isFile()) {
      violations.push({
        path: agentPath,
        message: 'agents/openai.yaml is required',
      })
      continue
    }

    const agentInterface = parseOpenAiAgentInterface(readFileSync(agentPath, 'utf-8'))
    const displayName = expectedDisplayName(entry.name)
    if (agentInterface.displayName !== displayName) {
      violations.push({
        path: agentPath,
        message: agentInterface.displayName
          ? `interface.display_name "${agentInterface.displayName}" must be "${displayName}"`
          : `interface.display_name is required and must be "${displayName}"`,
      })
    }

    if (agentInterface.shortDescription !== frontMatter.description) {
      violations.push({
        path: agentPath,
        message: frontMatter.description
          ? `interface.short_description must exactly match SKILL.md description "${frontMatter.description}"`
          : 'SKILL.md description is required before interface.short_description can be validated',
      })
    }
  }

  return violations
}

function main(): number {
  const skillsRoot = Bun.argv[2] ?? join(import.meta.dir, '..', 'skills')
  const violations = validateSkillMetadata(skillsRoot)
  if (!violations.length) {
    console.log(`Skill metadata check passed for ${basename(skillsRoot) || skillsRoot}`)
    return 0
  }

  for (const violation of violations) {
    console.error(`::error file=${violation.path}::${violation.message}`)
  }
  return 1
}

// Stryker disable next-line ConditionalExpression -- import.meta.main is an untestable runtime loader boundary
if (import.meta.main) {
  process.exit(runLoggedScript({ scriptName: 'check-skill-metadata' }, () => main()))
}
