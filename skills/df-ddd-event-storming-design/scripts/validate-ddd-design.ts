#!/usr/bin/env bun

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runLoggedScript } from '@/shared/script-logger'

const SMELLS: Record<string, string[]> = {
  table_first: ['\\b(create|update|delete)\\s+(table|record|row)\\b', '\\b(order_item|user_table|.*_table)\\b', '数据库表|数据表|表结构'],
  technical_event: ['缓存.*已刷新|消息.*已发送|日志.*已记录|接口.*已调用', 'MQ|Kafka|Redis|HTTP.*事件'],
  crud_command: [
    '新增.*命令|修改.*命令|删除.*命令|Create.*Command|Update.*Command|Delete.*Command',
    '(建立|创建|变更|修改|调整|撤销|删除|维护|管理).*(公司|部门|岗位|员工|用户|角色|菜单|权限)',
    '(公司|部门|岗位|员工|用户|角色|菜单|权限).*(建立|创建|变更|修改|调整|撤销|删除|维护|管理)',
  ],
  generic_change_event: [
    '(公司|部门|岗位|员工|用户|角色|菜单|权限)?.*(信息|资料|状态|记录).*已(变更|更新|修改|删除)',
    '已停用或解散|已启用或停用|已通过或拒绝',
  ],
  actorless_design: ['[\\s\\S]*(命令清单|#\\s*命令|##\\s*命令|#{1,6}\\s*(Command Catalog|Commands))(?![\\s\\S]*(Actor|主体|发起|角色|外部系统|Timer|System))'],
  flat_admin_nouns: [
    '[\\s\\S]*(公司.*聚合.*部门.*聚合.*岗位.*聚合.*员工.*聚合|用户.*聚合.*角色.*聚合.*菜单.*聚合.*权限.*聚合)',
    '[\\s\\S]*(公司聚合.*部门聚合.*岗位聚合.*员工聚合|用户聚合.*角色聚合.*菜单聚合.*权限聚合)',
  ],
  data_model_echo: [
    '(字段|表|数据表|字段名|外键|主键).*(领域事件|命令|聚合|读模型)',
    '(create|update|delete|insert|upsert).*(command|event|aggregate)',
    '(新增|修改|删除|维护|管理).*(领域事件|命令|聚合)',
    '(Company|Dept|Department|Position|Employee)(Created|Updated|Deleted|Edited)Event',
    '(公司|部门|岗位|员工).*(新增|修改|删除|编辑).*事件',
  ],
  rejected_candidate_leakage: ['(不进入领域事件|拒绝|淘汰|降级|候选事件).{0,80}(领域事件清单|聚合事件|事件列表|最终事件)'],
  command_permutation: ['(事件组合|排列组合|不同组合|每种组合).{0,80}(命令|cmd|command)', '(命令|cmd|command).{0,80}(事件组合|排列组合|不同组合|每种组合)'],
  unused_aggregate_state: [
    '(聚合属性|聚合状态|状态字段|属性清单)[\\s\\S]*(来源类型|sourceType|当前状态|currentStatus|描述|description)[\\s\\S]*(未使用|无业务方法|仅展示|只展示)',
    '(来源类型|sourceType|当前状态|currentStatus|描述|description).{0,80}(聚合属性|聚合状态)',
  ],
  generic_uniqueness: ['^(?![\\s\\S]*(范围|scope|租户|公司|父级|上游|人工|来源|actor))[\\s\\S]*(名称|编码|name|code).{0,20}(不能重复|唯一|冲突)'],
}

const REQUIRED_SECTIONS = ['Problem Domain Boundary', 'Actors', 'Domain Events', 'Commands', 'Policy', 'Aggregates', 'Read Models', 'Completeness Check']

export function sortMarkdownFiles(files: readonly string[]): string[] {
  return files.filter((file) => file.endsWith('.md')).toSorted()
}

export function readText(filePath: string): string {
  const stat = require('node:fs').statSync(filePath)
  if (stat.isDirectory()) {
    const parts: string[] = []
    const files = sortMarkdownFiles(readdirSync(filePath))
    for (const file of files) {
      parts.push(`\n# FILE: ${file}\n`)
      parts.push(readFileSync(join(filePath, file), 'utf-8'))
    }
    return parts.join('\n')
  }
  return readFileSync(filePath, 'utf-8')
}

function hasAny(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => new RegExp(pattern, 'i').test(text))
}

function findConfirmationGateViolations(text: string): string[] {
  const findings: string[] = []

  const hasCrudNounCluster = hasAny(text, [
    '公司.*部门.*岗位.*员工',
    'company.*dept.*position.*employee',
    'company.*department.*position.*employee',
    '用户.*角色.*菜单.*权限',
    'user.*role.*menu.*permission',
  ])

  const hasGateQuestion = hasAny(text, ['是否.*(权威|唯一主数据|主数据权威|成立|包含|纳入|确认)', '请.*确认', '需要你.*确认', '先确认', '问题域.*确认'])

  const hasDownstreamSections =
    hasAny(text, ['领域事件清单|#\\s*领域事件|##\\s*领域事件|#{1,6}\\s*(Domain Event Catalog|Domain Events)']) &&
    hasAny(text, ['命令清单|#\\s*命令|##\\s*命令|#{1,6}\\s*(Command Catalog|Commands)']) &&
    hasAny(text, ['聚合设计|#\\s*聚合|##\\s*聚合|#{1,6}\\s*(Aggregate Design|Aggregates)'])

  const hasReadModelSection = hasAny(text, ['读模型设计|#\\s*读模型|##\\s*读模型|#{1,6}\\s*(Read Model Design|Read Models)'])

  if (hasCrudNounCluster && hasDownstreamSections && !hasGateQuestion) {
    findings.push(
      'artifact_flooding: CRUD-looking ambiguous input expanded into downstream events, commands, and aggregates without confirmation gate evidence',
    )
  }

  if (hasCrudNounCluster && hasGateQuestion && hasDownstreamSections) {
    findings.push('confirmation_gate_skipped: CRUD-looking boundary question is still open while events, commands, and aggregates are already expanded')
  }

  if (hasCrudNounCluster && hasGateQuestion && hasDownstreamSections && hasReadModelSection) {
    findings.push('full_draft_before_gate_confirmation: read models were expanded before upstream confirmation gates were resolved')
  }

  return findings
}

export function validateDesign(text: string, requireSections: boolean = false): string[] {
  const findings: string[] = []

  for (const [smell, patterns] of Object.entries(SMELLS)) {
    for (const pattern of patterns) {
      if (new RegExp(pattern, 'i').test(text)) {
        findings.push(`${smell}: matched ${pattern}`)
      }
    }
  }

  findings.push(...findConfirmationGateViolations(text))

  if (requireSections) {
    for (const section of REQUIRED_SECTIONS) {
      if (!text.includes(section)) {
        findings.push(`missing_section: ${section}`)
      }
    }
  }

  return findings
}

function main(): number {
  const args = Bun.argv.slice(2)

  const path = args.find((a) => !a.startsWith('--'))
  const requireSections = args.includes('--require-sections')

  if (!path) {
    console.error('Usage: validate-ddd-design.ts <path> [--require-sections]')
    return 1
  }

  const text = readText(path)
  const findings = validateDesign(text, requireSections)

  if (findings.length) {
    console.log('DDD design guardrail findings:')
    for (const finding of findings) {
      console.log(`- ${finding}`)
    }
    return 1
  }

  console.log('DDD design guardrail checks passed.')
  return 0
}

if (import.meta.main) {
  process.exit(runLoggedScript({ scriptName: 'validate-ddd-design' }, () => main()))
}
