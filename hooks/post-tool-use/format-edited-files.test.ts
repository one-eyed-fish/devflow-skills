import { describe, expect, it } from 'bun:test'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { biomeCommand, extractEditedPaths, findGradleWrapper, formatEditedFiles, gradleCommand, spotlessTaskForPath } from './format-edited-files'

function initGitRepo(root: string, withBiome = true): void {
  const result = Bun.spawnSync({ cmd: ['git', 'init', '-b', 'codex/test'], cwd: root, stderr: 'ignore', stdout: 'ignore' })
  if (result.exitCode !== 0) throw new Error('failed to initialize test Git repository')
  if (withBiome) writeFileSync(join(root, 'biome.json'), '{}\n')
}

describe('PostToolUse edited-file formatter', () => {
  it('routes JVM and Gradle files to their Spotless tasks', () => {
    expect(spotlessTaskForPath('src/Main.java')).toBe('spotlessJavaApply')
    expect(spotlessTaskForPath('src/Main.kt')).toBe('spotlessKotlinApply')
    expect(spotlessTaskForPath('build.gradle')).toBe('spotlessGradleApply')
    expect(spotlessTaskForPath('build.gradle.kts')).toBe('spotlessGradleApply')
    expect(spotlessTaskForPath('src/Main.groovy')).toBeUndefined()
  })

  it('finds the platform wrapper in an ancestor and builds a no-daemon command', () => {
    const root = mkdtempSync(join(tmpdir(), 'devopsflow-gradle-wrapper-'))
    const nested = join(root, 'module', 'src')
    mkdirSync(nested, { recursive: true })
    writeFileSync(join(root, 'gradlew'), '#!/bin/sh\n')

    expect(findGradleWrapper(join(nested, 'Main.java'), root, 'linux')).toEqual({ root, wrapper: join(root, 'gradlew') })
    expect(gradleCommand(join(root, 'gradlew'), 'spotlessJavaApply')).toEqual([join(root, 'gradlew'), '--no-daemon', 'spotlessJavaApply'])
  })

  it('searches from the edited file up to cwd without crossing above cwd', () => {
    const root = mkdtempSync(join(tmpdir(), 'devopsflow-gradle-file-boundary-'))
    const cwd = join(root, 'workspace')
    const editedDir = join(cwd, 'module', 'src')
    mkdirSync(editedDir, { recursive: true })
    writeFileSync(join(root, 'gradlew'), '')
    writeFileSync(join(cwd, 'gradlew'), '')

    expect(findGradleWrapper(join(editedDir, 'Main.java'), cwd, 'linux')).toEqual({ root: cwd, wrapper: join(cwd, 'gradlew') })
    rmSync(join(cwd, 'gradlew'))
    expect(findGradleWrapper(join(editedDir, 'Main.java'), cwd, 'linux')).toBeUndefined()
  })

  it('prefers gradlew.bat on Windows and reports no wrapper when absent', () => {
    const root = mkdtempSync(join(tmpdir(), 'devopsflow-gradle-wrapper-win-'))
    const nested = join(root, 'module')
    mkdirSync(nested, { recursive: true })
    writeFileSync(join(root, 'gradlew.bat'), '@echo off\r\n')

    expect(findGradleWrapper(join(nested, 'Main.java'), root, 'win32')).toEqual({ root, wrapper: join(root, 'gradlew.bat') })
    const noWrapper = mkdtempSync(join(tmpdir(), 'devopsflow-no-wrapper-'))
    expect(findGradleWrapper(join(noWrapper, 'Main.java'), noWrapper, 'linux')).toBeUndefined()
  })

  it('runs the matching Spotless task with the Gradle wrapper for JVM files', () => {
    const root = mkdtempSync(join(tmpdir(), 'devopsflow-spotless-route-'))
    initGitRepo(root, false)
    const source = join(root, 'src', 'Main.java')
    const argsFile = join(root, 'gradle-args.txt')
    mkdirSync(join(root, 'src'), { recursive: true })
    writeFileSync(source, 'class Main {}\n')
    const wrapper = join(root, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')
    const wrapperSource = process.platform === 'win32' ? `@echo off\necho %* > "${argsFile}"\r\n` : `#!/bin/sh\nprintf '%s\\n' "$*" > '${argsFile}'\n`
    writeFileSync(wrapper, wrapperSource)
    if (process.platform !== 'win32') chmodSync(wrapper, 0o755)

    const result = formatEditedFiles({
      cwd: root,
      hook_event_name: 'PostToolUse',
      tool_name: 'apply_patch',
      tool_input: { command: '*** Begin Patch\n*** Update File: src/Main.java\n*** End Patch' },
      tool_response: {},
    })

    expect(result).toEqual({ formatted: ['src/Main.java'], warning: undefined })
    expect(readFileSync(argsFile, 'utf8').trim()).toBe('--no-daemon spotlessJavaApply')
  })

  it('uses only the repository-installed Biome executable', () => {
    const root = process.cwd()
    expect(biomeCommand(root, ['source.ts'])).toEqual([
      process.execPath,
      join(root, 'node_modules', '@biomejs', 'biome', 'bin', 'biome'),
      'format',
      '--write',
      '--vcs-use-ignore-file=false',
      'source.ts',
    ])
  })

  it('extracts added and updated files while excluding deleted files', () => {
    const patch = [
      '*** Begin Patch',
      '*** Update File: src/existing.ts',
      '@@',
      '-const value={ok:false}',
      '+const value={ok:true}',
      '*** Add File: src/added.json',
      '+{"ok":true}',
      '*** Delete File: src/removed.ts',
      '*** End Patch',
    ].join('\n')

    expect(extractEditedPaths(patch)).toEqual(['src/existing.ts', 'src/added.json'])
  })

  it('formats only existing files contained by the session repository', () => {
    const root = mkdtempSync(join(tmpdir(), 'devopsflow-post-edit-format-'))
    initGitRepo(root)
    mkdirSync(join(root, 'src'), { recursive: true })
    writeFileSync(join(root, 'src', 'existing.ts'), 'const value={ok:true}\n')
    writeFileSync(join(root, 'outside.ts'), 'const outside={ok:false}\n')

    const invocations: string[][] = []
    const result = formatEditedFiles(
      {
        cwd: root,
        hook_event_name: 'PostToolUse',
        tool_name: 'apply_patch',
        tool_input: {
          command: [
            '*** Begin Patch',
            '*** Update File: src/existing.ts',
            '*** Update File: ../outside.ts',
            '*** Update File: src/missing.ts',
            '*** End Patch',
          ].join('\n'),
        },
        tool_response: {},
      },
      (paths) => {
        invocations.push(paths)
        return { exitCode: 0, stderr: '' }
      },
    )

    expect(result).toEqual({ formatted: ['src/existing.ts'], warning: undefined })
    expect(invocations).toEqual([['src/existing.ts']])
    expect(readFileSync(join(root, 'outside.ts'), 'utf8')).toBe('const outside={ok:false}\n')
  })

  it('resolves patch paths from a session started in a repository subdirectory', () => {
    const root = mkdtempSync(join(tmpdir(), 'devopsflow-post-edit-subdir-'))
    initGitRepo(root)
    const cwd = join(root, 'packages', 'app')
    mkdirSync(cwd, { recursive: true })
    writeFileSync(join(cwd, 'source.ts'), 'const value={ok:true}\n')

    const invocations: string[][] = []
    const result = formatEditedFiles(
      {
        cwd,
        hook_event_name: 'PostToolUse',
        tool_name: 'apply_patch',
        tool_input: { command: '*** Begin Patch\n*** Update File: source.ts\n*** End Patch' },
        tool_response: {},
      },
      (paths) => {
        invocations.push(paths)
        return { exitCode: 0, stderr: '' }
      },
    )

    expect(result.formatted).toEqual(['packages/app/source.ts'])
    expect(invocations).toEqual([['packages/app/source.ts']])
  })

  it('fails open and reports a concise warning when the formatter fails', () => {
    const root = mkdtempSync(join(tmpdir(), 'devopsflow-post-edit-failure-'))
    initGitRepo(root)
    writeFileSync(join(root, 'source.ts'), 'const value={ok:true}\n')

    const result = formatEditedFiles(
      {
        cwd: root,
        hook_event_name: 'PostToolUse',
        tool_name: 'apply_patch',
        tool_input: { command: '*** Begin Patch\n*** Update File: source.ts\n*** End Patch' },
        tool_response: {},
      },
      () => ({ exitCode: 1, stderr: 'formatter details that should be summarized' }),
    )

    expect(result.formatted).toEqual([])
    expect(result.warning).toContain('source.ts')
    expect(result.warning).toContain('formatter details')
  })

  it('uses the repository Biome configuration to rewrite an edited TypeScript file', () => {
    const relativePath = `hooks/post-tool-use/.format-hook-${crypto.randomUUID()}.ts`
    const absolutePath = join(process.cwd(), ...relativePath.split('/'))
    writeFileSync(absolutePath, 'const value={ok:true}\n')

    try {
      const result = formatEditedFiles({
        cwd: process.cwd(),
        hook_event_name: 'PostToolUse',
        tool_name: 'apply_patch',
        tool_input: { command: `*** Begin Patch\n*** Update File: ${relativePath}\n*** End Patch` },
        tool_response: {},
      })

      expect(result).toEqual({ formatted: [relativePath], warning: undefined })
      expect(readFileSync(absolutePath, 'utf8')).toBe('const value = { ok: true }\n')
    } finally {
      rmSync(absolutePath, { force: true })
    }
  })

  it('does nothing for failed or unrelated tool calls', () => {
    let invoked = false
    const run = () => {
      invoked = true
      return { exitCode: 0, stderr: '' }
    }

    expect(
      formatEditedFiles(
        {
          cwd: process.cwd(),
          hook_event_name: 'PostToolUse',
          tool_name: 'apply_patch',
          tool_input: { command: '*** Update File: package.json' },
          tool_response: { isError: true },
        },
        run,
      ),
    ).toEqual({ formatted: [], warning: undefined })
    expect(
      formatEditedFiles(
        {
          cwd: process.cwd(),
          hook_event_name: 'PostToolUse',
          tool_name: 'apply_patch',
          tool_input: { command: '*** Update File: package.json' },
          toolResponse: { success: false },
        },
        run,
      ),
    ).toEqual({ formatted: [], warning: undefined })
    expect(
      formatEditedFiles(
        {
          cwd: process.cwd(),
          hook_event_name: 'PostToolUse',
          tool_name: 'Bash',
          tool_input: { command: 'touch source.ts' },
          tool_response: {},
        },
        run,
      ),
    ).toEqual({ formatted: [], warning: undefined })
    expect(invoked).toBe(false)
  })

  it('skips repositories that do not declare Biome formatting', () => {
    const root = mkdtempSync(join(tmpdir(), 'devopsflow-post-edit-no-biome-'))
    initGitRepo(root, false)
    writeFileSync(join(root, 'source.ts'), 'const value={ok:true}\n')
    let invoked = false

    const result = formatEditedFiles(
      {
        cwd: root,
        hook_event_name: 'PostToolUse',
        tool_name: 'apply_patch',
        tool_input: { command: '*** Begin Patch\n*** Update File: source.ts\n*** End Patch' },
        tool_response: {},
      },
      () => {
        invoked = true
        return { exitCode: 0, stderr: '' }
      },
    )

    expect(result).toEqual({ formatted: [], warning: undefined })
    expect(invoked).toBe(false)
  })

  it('registers the formatter only for apply_patch and its edit aliases', () => {
    const manifest = JSON.parse(readFileSync(join(import.meta.dir, '..', 'hooks.codex.json'), 'utf8')) as {
      hooks: { PostToolUse?: Array<{ matcher?: string; hooks: Array<{ command: string }> }> }
    }
    const group = manifest.hooks.PostToolUse?.[0]

    expect(group?.matcher).toBe('apply_patch|Edit|Write')
    expect(group?.hooks[0]?.command).toContain('/hooks/post-tool-use/format-edited-files.ts')
  })
})
