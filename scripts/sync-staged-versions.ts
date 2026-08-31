#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { runLoggedScript } from '@/shared/script-logger'

const RELEASE_PLUGIN_PATHS = ['.codex-plugin/plugin.json', '.cursor-plugin/plugin.json'] as const

export interface VersionAlignment {
  readonly version: string
}

export interface SyncStagedVersionsResult {
  readonly version: string
  readonly paths: readonly string[]
}

export function agentTomlPaths(root: string): string[] {
  return readdirSync(join(root, 'agents'))
    .filter((name) => name.endsWith('.toml'))
    .sort((left, right) => left.localeCompare(right))
    .map((name) => `agents/${name}`)
}

export function checkStagedVersionAlignment(root: string): VersionAlignment {
  const packageVersion = jsonVersion('package.json', readStagedFile(root, 'package.json'))
  const pluginVersions = RELEASE_PLUGIN_PATHS.map((path) => ({ path, version: jsonVersion(path, readStagedFile(root, path)) }))
  const agentVersions = agentTomlPaths(root).map((path) => {
    const content = readStagedFile(root, path).toString('utf-8')
    if (/^version\s*=/m.test(content)) {
      throw new Error(`${path} must use # devopsflow-version = "..." instead of a top-level version field`)
    }
    const version = content.match(/^#\s*devopsflow-version\s*=\s*"([^"]+)"/m)?.[1]
    if (!version) throw new Error(`${path} is missing its devopsflow-version marker`)
    return { path, version }
  })
  const mismatchedPlugins = pluginVersions.filter(({ version }) => version !== packageVersion)
  const mismatchedAgents = agentVersions.filter(({ version }) => version !== packageVersion)
  if (mismatchedPlugins.length > 0 || mismatchedAgents.length > 0) {
    throw new Error(
      `Version mismatch: package.json=${packageVersion}, ${pluginVersions.map(({ path, version }) => `${path}=${version}`).join(', ')}, ${agentVersions.map(({ path, version }) => `${path}=${version}`).join(', ')}`,
    )
  }
  return { version: packageVersion }
}

export function syncStagedVersionAlignment(root: string): SyncStagedVersionsResult {
  const version = jsonVersion('package.json', readStagedFile(root, 'package.json'))
  const paths: string[] = []
  for (const pluginPath of RELEASE_PLUGIN_PATHS) {
    const stagedPlugin = readStagedFile(root, pluginPath)
    const pluginContent = stagedPlugin.toString('utf-8')
    const pluginJson = JSON.parse(pluginContent) as Record<string, unknown>
    if (pluginJson.version !== version) {
      const updatedPlugin = pluginContent.replace(/("version"\s*:\s*)"[^"]+"/, `$1"${version}"`)
      syncFileToIndex(root, pluginPath, stagedPlugin, Buffer.from(updatedPlugin))
      paths.push(pluginPath)
    }
  }

  for (const path of agentTomlPaths(root)) {
    const stagedAgent = readStagedFile(root, path)
    const content = stagedAgent.toString('utf-8')
    if (/^version\s*=/m.test(content)) {
      throw new Error(`${path} must use # devopsflow-version = "..." instead of a top-level version field`)
    }
    if (!/^#\s*devopsflow-version\s*=\s*"[^"]+"/m.test(content)) {
      throw new Error(`${path} is missing its devopsflow-version marker`)
    }
    const updated = content.replace(/^(#\s*devopsflow-version\s*=\s*)"[^"]+"/m, `$1"${version}"`)
    if (updated !== content) {
      syncFileToIndex(root, path, stagedAgent, Buffer.from(updated))
      paths.push(path)
    }
  }

  checkStagedVersionAlignment(root)
  return { version, paths }
}

function jsonVersion(path: string, content: Buffer): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(content.toString('utf-8'))
  } catch (error) {
    throw new Error(`${path} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
  const version = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>).version : undefined
  if (typeof version !== 'string' || !version.trim()) throw new Error(`${path} is missing a non-empty version`)
  return version
}

function git(root: string, args: string[]): Bun.ReadableSyncSubprocess {
  return Bun.spawnSync({
    cmd: ['git', ...args],
    cwd: root,
    stderr: 'pipe',
    stdout: 'pipe',
  })
}

function readStagedFile(root: string, relativePath: string): Buffer {
  const result = git(root, ['show', `:${relativePath}`])
  if (result.exitCode !== 0) {
    throw new Error(`Unable to read staged file ${relativePath}: ${result.stderr.toString().trim()}`)
  }
  return result.stdout
}

function syncFileToIndex(root: string, relativePath: string, stagedContent: Buffer, updatedContent: Buffer): void {
  const absolutePath = join(root, relativePath)
  if (existsSync(absolutePath) && readFileSync(absolutePath).equals(stagedContent)) {
    writeFileSync(absolutePath, updatedContent)
    const addResult = git(root, ['add', '--', relativePath])
    if (addResult.exitCode !== 0) {
      throw new Error(`Unable to stage ${relativePath}: ${addResult.stderr.toString().trim()}`)
    }
    return
  }

  const modeResult = git(root, ['ls-files', '-s', '--', relativePath])
  const mode = modeResult.stdout.toString().match(/^(\d+)\s/)?.[1]
  if (modeResult.exitCode !== 0 || !mode) {
    throw new Error(`Unable to inspect staged file ${relativePath}: ${modeResult.stderr.toString().trim()}`)
  }
  const hashResult = Bun.spawnSync({
    cmd: ['git', 'hash-object', '-w', '--stdin'],
    cwd: root,
    stdin: updatedContent,
    stderr: 'pipe',
    stdout: 'pipe',
  })
  const objectId = hashResult.stdout.toString().trim()
  if (hashResult.exitCode !== 0 || !objectId) {
    throw new Error(`Unable to create staged object for ${relativePath}: ${hashResult.stderr.toString().trim()}`)
  }
  const updateResult = git(root, ['update-index', '--cacheinfo', mode, objectId, relativePath])
  if (updateResult.exitCode !== 0) {
    throw new Error(`Unable to update staged file ${relativePath}: ${updateResult.stderr.toString().trim()}`)
  }
}

function main(): number {
  const root = resolve(import.meta.dir, '..')
  const result = syncStagedVersionAlignment(root)
  console.log(`Staged release versions synchronized: ${result.version}`)
  return 0
}

if (import.meta.main) {
  process.exit(runLoggedScript({ scriptName: 'sync-staged-versions' }, () => main()))
}
