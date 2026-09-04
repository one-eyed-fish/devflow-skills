#!/usr/bin/env bun

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runLoggedScript } from '@/shared/script-logger'

const SKILL_PATH_PATTERN = /^skills\/([^/]+)\//
const SKILL_MARKDOWN_PATH = (skill: string) => `skills/${skill}/SKILL.md`

interface SkillVersions {
  version: string
  metadataVersion: string
}

interface ChangedSkill {
  path: string
  previousPath?: string
}

function git(root: string, args: string[]): Bun.ReadableSyncSubprocess {
  return Bun.spawnSync({
    cmd: ['git', ...args],
    cwd: root,
    stderr: 'pipe',
    stdout: 'pipe',
  })
}

function gitOutput(root: string, args: string[]): string {
  const result = git(root, args)
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString().trim())
  }
  return result.stdout.toString()
}

function readHeadFile(root: string, path: string): string | undefined {
  const result = git(root, ['show', `HEAD:${path}`])
  if (result.exitCode === 0) return result.stdout.toString()
  if (result.exitCode === 128) return undefined
  throw new Error(result.stderr.toString().trim())
}

function readStagedFile(root: string, path: string): string {
  return gitOutput(root, ['show', `:${path}`])
}

function stageFile(root: string, path: string): void {
  const result = git(root, ['add', '--', path])
  if (result.exitCode !== 0) {
    throw new Error(`Unable to stage ${path}: ${result.stderr.toString().trim()}`)
  }
}

function changedSkills(root: string): ChangedSkill[] {
  const changes = gitOutput(root, ['diff', '--cached', '--name-status', '--find-renames', '--diff-filter=ACMR', 'HEAD', '--', 'skills'])
  const skills = new Map<string, ChangedSkill>()

  for (const change of changes.split(/\r?\n/)) {
    if (!change) continue
    const [status, firstPath, secondPath] = change.split('\t')
    const renamed = status.startsWith('R')
    const currentPath = renamed ? secondPath : firstPath
    const skill = currentPath?.match(SKILL_PATH_PATTERN)?.[1]
    if (!skill) continue

    const path = SKILL_MARKDOWN_PATH(skill)
    const entry = skills.get(skill) ?? { path }
    if (renamed && currentPath === path && firstPath?.endsWith('/SKILL.md')) {
      entry.previousPath = firstPath
    }
    skills.set(skill, entry)
  }

  return [...skills.values()].sort((left, right) => left.path.localeCompare(right.path))
}

function parseVersions(path: string, content: string): SkillVersions {
  const frontMatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1]
  if (!frontMatter) throw new Error(`${path} is missing YAML front matter`)

  const version = frontMatter.match(/^version:\s*["']?([^"'\s]+)["']?\s*$/m)?.[1]
  const metadataVersion = frontMatter.match(/^metadata:\s*\r?\n(?:^ {2}[^\r\n]+\r?\n)*?^ {2}version:\s*["']?([^"'\s]+)["']?\s*$/m)?.[1]
  if (!version || !metadataVersion) {
    throw new Error(`${path} must define version and metadata.version`)
  }
  if (version !== metadataVersion) {
    throw new Error(`${path} version and metadata.version must match`)
  }
  return { version, metadataVersion }
}

function incrementPatch(version: string): string {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!match) throw new Error(`version "${version}" must be MAJOR.MINOR.PATCH`)
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`
}

function replaceVersions(content: string, version: string): string {
  const frontMatterPattern = /(^---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/
  return content.replace(frontMatterPattern, (_match, start, frontMatter, end) => {
    const updated = frontMatter
      .replace(/^(version:\s*)["']?[^"'\s]+["']?\s*$/m, `$1"${version}"`)
      .replace(/^(metadata:\s*\r?\n(?:^ {2}[^\r\n]+\r?\n)*?^ {2}version:\s*)["']?[^"'\s]+["']?\s*$/m, `$1"${version}"`)
    return `${start}${updated}${end}`
  })
}

export function checkStagedSkillVersions(root = process.cwd()): string[] {
  const checked: string[] = []
  for (const { path, previousPath } of changedSkills(root)) {
    const staged = parseVersions(path, readStagedFile(root, path))
    const head = readHeadFile(root, previousPath ?? path)
    if (head) {
      const previous = parseVersions(path, head).version
      const expected = incrementPatch(previous)
      if (staged.version !== expected) {
        const updated = replaceVersions(readStagedFile(root, path), expected)
        const target = join(root, path)
        writeFileSync(target, updated, 'utf8')
        stageFile(root, path)
        console.log(`${path}: version ${previous} -> ${expected}`)
      }
    }
    checked.push(path)
  }
  return checked
}

function main(): number {
  const checked = checkStagedSkillVersions()
  console.log(`Staged skill versions checked: ${checked.length}`)
  return 0
}

// Stryker disable next-line ConditionalExpression -- import.meta.main is an untestable runtime loader boundary
if (import.meta.main) {
  process.exit(runLoggedScript({ scriptName: 'check-staged-skill-versions' }, () => main()))
}
