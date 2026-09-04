import { afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// biome-ignore lint/style/noNonNullAssertion: import.meta.dir is always defined at runtime
const ROOT = import.meta.dir!
const EXAMPLES = join(ROOT, 'examples')

function readText(filePath: string): string {
  try {
    const stat = statSync(filePath)
    if (stat.isDirectory()) {
      const { readdirSync } = require('node:fs')
      const parts: string[] = []
      const files = readdirSync(filePath).sort()
      for (const file of files) {
        if (file.endsWith('.md')) {
          parts.push(`\n# FILE: ${file}\n`)
          parts.push(readFileSync(join(filePath, file), 'utf-8'))
        }
      }
      return parts.join('\n')
    }
  } catch {
    // Not a directory
  }
  return readFileSync(filePath, 'utf-8')
}

type ValidateFunc = (text: string, requireSections?: boolean) => string[]
type ReadTextFunc = (filePath: string) => string
type SortMarkdownFilesFunc = (files: readonly string[]) => string[]
let validate: ValidateFunc
let readDesignText: ReadTextFunc
let sortMarkdownFiles: SortMarkdownFilesFunc
const tempRoots: string[] = []

beforeAll(async () => {
  const mod = await import('./validate-ddd-design')
  validate = mod.validateDesign as ValidateFunc
  readDesignText = mod.readText as ReadTextFunc
  sortMarkdownFiles = mod.sortMarkdownFiles as SortMarkdownFilesFunc
})

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const CASES = [
  { name: 'valid_design', file: 'valid_design.md', expectErrors: false },
  { name: 'table_first', file: 'table_first.md', expectErrors: true },
  { name: 'flat_admin', file: 'flat_admin.md', expectErrors: true },
  {
    name: 'full_draft_before_gate',
    file: 'full_draft_before_gate.md',
    expectErrors: true,
  },
  { name: 'data_model_echo', file: 'data_model_echo.md', expectErrors: true },
  {
    name: 'artifact_flooding',
    file: 'artifact_flooding.md',
    expectErrors: true,
  },
  {
    name: 'proof_gate_violations',
    file: 'proof_gate_violations.md',
    expectErrors: true,
  },
]

describe('DDD Design Validation', () => {
  for (const testCase of CASES) {
    it(`${testCase.name}`, () => {
      const filePath = join(EXAMPLES, testCase.file)
      const text = readText(filePath)
      const errors = validate(text, testCase.file === 'valid_design.md')

      if (testCase.expectErrors) {
        expect(errors.length).toBeGreaterThan(0)
      } else {
        expect(errors.length).toBe(0)
      }
    })
  }

  it('returns no findings for neutral text when sections are optional', () => {
    expect(validate('A neutral design note.')).toEqual([])
  })

  it.each([
    ['table_first', 'create table'],
    ['table_first', 'CREATE TABLE'],
    ['table_first', 'order_item'],
    ['table_first', '数据库表'],
    ['technical_event', '缓存已刷新'],
    ['technical_event', 'Kafka'],
    ['crud_command', '新增用户命令'],
    ['crud_command', '创建公司'],
    ['crud_command', '员工删除'],
    ['generic_change_event', '用户信息已更新'],
    ['generic_change_event', '账号已启用或停用'],
    ['actorless_design', '# Commands\nIssueAccessCommand'],
    ['flat_admin_nouns', '公司聚合 部门聚合 岗位聚合 员工聚合'],
    ['flat_admin_nouns', '用户聚合角色聚合菜单聚合权限聚合'],
    ['data_model_echo', '字段生成领域事件'],
    ['data_model_echo', 'create aggregate'],
    ['data_model_echo', '新增命令'],
    ['data_model_echo', 'CompanyCreatedEvent'],
    ['data_model_echo', '公司新增事件'],
    ['rejected_candidate_leakage', '拒绝候选后仍进入领域事件清单'],
    ['command_permutation', '事件组合产生命令'],
    ['command_permutation', 'command 来自排列组合'],
    ['unused_aggregate_state', '聚合属性：sourceType，仅展示，未使用'],
    ['unused_aggregate_state', 'currentStatus 作为聚合状态'],
    ['generic_uniqueness', '名称不能重复'],
  ])('reports the %s smell for %s', (smell, text) => {
    expect(validate(text).some((finding) => finding.startsWith(`${smell}: matched `))).toBeTrue()
  })

  it('requires every downstream section before reporting an unconfirmed expanded design', () => {
    const cluster = '公司 部门 岗位 员工'
    const events = '# Domain Events'
    const commands = '# Commands\nActor: administrator'
    const aggregates = '# Aggregates'

    expect(validate(`${cluster}\n${events}\n${commands}`)).toEqual([])
    expect(validate(`${cluster}\n${events}\n${aggregates}`)).toEqual([])
    expect(validate(`${cluster}\n${commands}\n${aggregates}`)).toEqual([])
    expect(validate(`${events}\n${commands}\n${aggregates}`)).toEqual([])
    expect(validate(`${cluster}\n${events}\n${commands}\n${aggregates}`)).toEqual([
      'artifact_flooding: CRUD-looking ambiguous input expanded into downstream events, commands, and aggregates without confirmation gate evidence',
    ])
  })

  it('reports the exact confirmation-gate findings and only adds the read-model finding when present', () => {
    const expanded = 'company department position employee\n请确认\n# Domain Events\n# Commands\nActor: owner\n# Aggregates'

    expect(validate(expanded)).toEqual([
      'confirmation_gate_skipped: CRUD-looking boundary question is still open while events, commands, and aggregates are already expanded',
    ])
    expect(validate(`${expanded}\n# Read Models`)).toEqual([
      'confirmation_gate_skipped: CRUD-looking boundary question is still open while events, commands, and aggregates are already expanded',
      'full_draft_before_gate_confirmation: read models were expanded before upstream confirmation gates were resolved',
    ])
  })

  it('recognizes every supported CRUD cluster and confirmation phrase without making neutral downstream sections ambiguous', () => {
    const downstream = '# Domain Events\n# Commands\nActor: owner\n# Aggregates'
    for (const cluster of [
      '公司 部门 岗位 员工',
      'company dept position employee',
      'company department position employee',
      '用户 角色 菜单 权限',
      'user role menu permission',
    ]) {
      expect(validate(`${cluster}\n${downstream}`)).toEqual([
        'artifact_flooding: CRUD-looking ambiguous input expanded into downstream events, commands, and aggregates without confirmation gate evidence',
      ])
    }
    for (const question of ['是否为权威', '请确认', '需要你确认', '先确认', '问题域待确认']) {
      expect(validate(`公司 部门 岗位 员工\n${question}\n${downstream}`)[0]).toStartWith('confirmation_gate_skipped:')
    }
    expect(validate('COMPANY DEPARTMENT POSITION EMPLOYEE\n# DOMAIN EVENTS\n# COMMANDS\nACTOR: OWNER\n# AGGREGATES')).toEqual([
      'artifact_flooding: CRUD-looking ambiguous input expanded into downstream events, commands, and aggregates without confirmation gate evidence',
    ])
    expect(validate('公司 部门 岗位 员工')).toEqual([])
    expect(validate(downstream)).toEqual([])
  })

  it('requires the CRUD cluster before reporting confirmation-gate findings', () => {
    expect(validate('请确认\n# Domain Events\n# Commands\nActor: owner\n# Aggregates')).toEqual([])
  })
  it('enforces all required sections only when explicitly requested', () => {
    expect(validate('', false)).toEqual([])
    expect(validate('', true)).toEqual([
      'missing_section: Problem Domain Boundary',
      'missing_section: Actors',
      'missing_section: Domain Events',
      'missing_section: Commands',
      'missing_section: Policy',
      'missing_section: Aggregates',
      'missing_section: Read Models',
      'missing_section: Completeness Check',
    ])
  })

  it('sorts Markdown file names deterministically and excludes other extensions', () => {
    expect(sortMarkdownFiles(['z.md', 'ignored.txt', 'a.md'])).toEqual(['a.md', 'z.md'])
  })

  it('reads files and sorted Markdown directories into a stable validation document', () => {
    const root = mkdtempSync(join(tmpdir(), 'ddd-design-read-'))
    tempRoots.push(root)
    const filePath = join(root, 'single.md')
    writeFileSync(filePath, 'single content', 'utf-8')
    expect(readDesignText(filePath)).toBe('single content')

    writeFileSync(join(root, 'b.md'), 'second', 'utf-8')
    writeFileSync(join(root, 'a.md'), 'first', 'utf-8')
    writeFileSync(join(root, 'ignored.txt'), 'ignored', 'utf-8')
    expect(readDesignText(root)).toBe('\n# FILE: a.md\n\nfirst\n\n# FILE: b.md\n\nsecond\n\n# FILE: single.md\n\nsingle content')
  })

  it('validates file and directory CLI inputs with exact output and section flags', () => {
    const root = mkdtempSync(join(tmpdir(), 'ddd-design-cli-'))
    tempRoots.push(root)
    const script = join(ROOT, 'validate-ddd-design.ts')
    const validPath = join(root, 'valid.md')
    writeFileSync(validPath, 'A neutral design note.', 'utf-8')

    const cliEnvironment = { ...process.env, PLUGIN_ROOT: root, CODEX_SESSION_ID: 'ddd-cli' }
    const valid = Bun.spawnSync([process.execPath, script, validPath], { cwd: root, env: cliEnvironment, stdout: 'pipe', stderr: 'pipe' })
    const required = Bun.spawnSync([process.execPath, script, validPath, '--require-sections'], {
      cwd: root,
      env: cliEnvironment,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const leadingFlag = Bun.spawnSync([process.execPath, script, '--require-sections', validPath], {
      cwd: root,
      env: cliEnvironment,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const missing = Bun.spawnSync([process.execPath, script], { cwd: root, env: cliEnvironment, stdout: 'pipe', stderr: 'pipe' })

    expect(valid.exitCode).toBe(0)
    expect(valid.stdout.toString()).toBe('DDD design guardrail checks passed.\n')
    expect(required.exitCode).toBe(1)
    expect(required.stdout.toString()).toContain('- missing_section: Problem Domain Boundary\n')
    expect(leadingFlag.exitCode).toBe(1)
    expect(leadingFlag.stdout.toString()).toBe(required.stdout.toString())
    expect(leadingFlag.stderr.toString()).toBe('')
    expect(missing.exitCode).toBe(1)
    expect(missing.stderr.toString()).toBe('Usage: validate-ddd-design.ts <path> [--require-sections]\n')
    const [logName] = readdirSync(join(root, '.logs'))
    expect(logName).toEndWith('-ddd-cli.log')
    const logEntries = readFileSync(join(root, '.logs', logName as string), 'utf-8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { script?: string })
    expect(logEntries.every(({ script }) => script === 'validate-ddd-design')).toBeTrue()
  })

  it('reads sorted Markdown files from directories and excludes other extensions', () => {
    const root = mkdtempSync(join(tmpdir(), 'ddd-design-directory-'))
    tempRoots.push(root)
    writeFileSync(join(root, 'a.md'), '缓存已刷新', 'utf-8')
    writeFileSync(join(root, 'b.md'), 'create table', 'utf-8')
    writeFileSync(join(root, 'ignored.txt'), 'Kafka', 'utf-8')
    const result = Bun.spawnSync([process.execPath, join(ROOT, 'validate-ddd-design.ts'), root], {
      cwd: root,
      stdout: 'pipe',
      stderr: 'pipe',
    })

    expect(result.exitCode).toBe(1)
    expect(result.stdout.toString()).toBe(
      'DDD design guardrail findings:\n- table_first: matched \\b(create|update|delete)\\s+(table|record|row)\\b\n- technical_event: matched 缓存.*已刷新|消息.*已发送|日志.*已记录|接口.*已调用\n',
    )
  })
})
