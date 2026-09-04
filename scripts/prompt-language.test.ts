import { describe, expect, it } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'

// biome-ignore lint/style/noNonNullAssertion: import.meta.dir is always defined at runtime
const ROOT = join(import.meta.dir!, '..')
const SKILLS_ROOT = join(ROOT, 'skills')
const EXCLUDED_DIRECTORIES = new Set(['.git', '.stryker-tmp', 'coverage', 'node_modules', 'reports'])

const ENGLISH_FUNCTION_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'before',
  'but',
  'by',
  'do',
  'does',
  'for',
  'from',
  'if',
  'in',
  'into',
  'is',
  'it',
  'not',
  'of',
  'on',
  'only',
  'or',
  'that',
  'the',
  'then',
  'this',
  'to',
  'use',
  'when',
  'with',
  'without',
])

function promptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (EXCLUDED_DIRECTORIES.has(entry.name)) return []
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return promptFiles(path)
    return ['.md', '.yaml', '.yml'].includes(extname(entry.name)) ? [path] : []
  })
}

function englishProseLines(path: string): string[] {
  const violations: string[] = []
  let ignoredFence = false
  const isVocabularyDictionary = path.endsWith(join('df-ai-agentinstruction-authoring', 'dictionary', 'vocabulary.yaml'))

  for (const [index, rawLine] of readFileSync(path, 'utf-8').split(/\r?\n/).entries()) {
    const line = rawLine.trim()
    const fence = line.match(/^```([A-Za-z0-9_-]*)/)
    if (fence) {
      if (ignoredFence) {
        ignoredFence = false
      } else {
        const language = fence[1].toLowerCase()
        ignoredFence = !['', 'markdown', 'text', 'yaml', 'yml'].includes(language)
      }
      continue
    }
    if (
      ignoredFence ||
      !line ||
      /^#{1,6}\s/.test(line) ||
      /^---$/.test(line) ||
      /^<!--.*-->$/.test(line) ||
      /^name:\s/.test(line) ||
      (isVocabularyDictionary && /^\s*to:\s/.test(rawLine)) ||
      /^\s*run:\s/.test(rawLine) ||
      /^\s*display_name:\s/.test(rawLine) ||
      /^\s*[a-z_]+:\s*"[A-Za-z0-9_.-]+"\s*$/.test(rawLine) ||
      /^\s*[a-z_]+:\s*\[(?:"[A-Za-z0-9_. -]+"(?:,\s*)?)+\]\s*$/.test(rawLine) ||
      /^\s*[A-Za-z][A-Za-z0-9 /+.-]*:\s*$/.test(rawLine) ||
      /^(?:https?:\/\/|[A-Za-z]:\\)/.test(line)
    ) {
      continue
    }

    const prose = line
      .replace(/`[^`]+`/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+/g, '')
    if (/\p{Script=Han}/u.test(prose)) continue

    const words = prose.toLowerCase().match(/[a-z]+/g) ?? []
    const functionWordCount = words.filter((word) => ENGLISH_FUNCTION_WORDS.has(word)).length
    if (words.length >= 4 && functionWordCount >= 2) {
      violations.push(`${index + 1}: ${line}`)
    }
  }

  return violations
}

describe('prompt language', () => {
  it('uses Markdown links for repository file references', () => {
    const violations = promptFiles(SKILLS_ROOT)
      .filter((path) => extname(path) === '.md')
      .flatMap((path) => {
        const content = readFileSync(path, 'utf-8')
        const references = content.matchAll(/`((?:\.\.?\/)?[^`\s<>*]+\/[^`\s<>*]+\.(?:ts|md|yaml|yml|json|toml|svg|kts))`/g)

        return [...references].flatMap((match) => {
          const reference = match[1]
          if (reference.startsWith('.codex/') || reference.startsWith('.devopsflow/')) {
            return []
          }
          const targets = [resolve(dirname(path), reference), resolve(ROOT, reference)]
          return targets.some((target) => existsSync(target)) ? [`${relative(ROOT, path).replaceAll('\\', '/')}: ${reference}`] : []
        })
      })

    expect(violations).toEqual([])
  })

  it('keeps file links resolvable and filename-labeled', () => {
    const violations = promptFiles(SKILLS_ROOT)
      .filter((path) => extname(path) === '.md')
      .flatMap((path) => {
        const links = readFileSync(path, 'utf-8').matchAll(/\[([^\]]+)\]\(([^)<]+)\)/g)
        return [...links].flatMap((match) => {
          const [, label, target] = match
          if (/^https?:\/\//.test(target)) {
            return []
          }
          const resolved = resolve(dirname(path), target)
          return existsSync(resolved) && label === basename(target) ? [] : [`${relative(ROOT, path).replaceAll('\\', '/')}: [${label}](${target})`]
        })
      })

    expect(violations).toEqual([])
  })

  it('uses English for every Markdown heading', () => {
    const violations = promptFiles(ROOT)
      .filter((path) => extname(path) === '.md')
      .flatMap((path) =>
        readFileSync(path, 'utf-8')
          .split(/\r?\n/)
          .flatMap((line, index) =>
            /^#{1,6}\s/.test(line) && !/^#{1,6}\s+(?=[^\r\n]*[A-Za-z])[ -~]+$/.test(line)
              ? [`${relative(ROOT, path).replaceAll('\\', '/')}:${index + 1}: ${line}`]
              : [],
          ),
      )

    expect(violations).toEqual([])
  })

  it('uses Chinese for prose while allowing titles and terminology', () => {
    const violations = promptFiles(SKILLS_ROOT).flatMap((path) =>
      englishProseLines(path).map((line) => `${relative(ROOT, path).replaceAll('\\', '/')}:${line}`),
    )

    expect(violations).toEqual([])
  })

  it('uses Chinese for plugin default prompts', () => {
    const plugin = JSON.parse(readFileSync(join(ROOT, '.codex-plugin', 'plugin.json'), 'utf-8')) as { interface: { defaultPrompt: string[] } }

    expect(plugin.interface.defaultPrompt).not.toHaveLength(0)
    for (const prompt of plugin.interface.defaultPrompt) {
      expect(prompt).toMatch(/\p{Script=Han}/u)
    }
  })

  it('uses Chinese for VCS manager instructions', () => {
    expect(englishProseLines(join(ROOT, 'agents', 'df-ops-vcs-manager.toml'))).toEqual([])
  })
})
