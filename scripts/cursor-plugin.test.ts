import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..')

describe('Cursor plugin', () => {
  it('declares installable plugin assets and hooks', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, '.cursor-plugin/plugin.json'), 'utf8'))
    expect(manifest).toMatchObject({
      name: 'devopsflow',
      displayName: 'DevopsFlow',
      logo: 'assets/logo.svg',
      skills: './skills',
      hooks: './hooks/hooks.cursor.json',
    })
    expect(manifest.tags).toEqual(expect.arrayContaining(['agent-skills', 'engineering-workflows', 'git-safety']))
    expect(readFileSync(join(ROOT, manifest.hooks), 'utf8')).toContain('CURSOR_PLUGIN_ROOT')
  })

  it('declares a single-plugin marketplace catalog', () => {
    const marketplace = JSON.parse(readFileSync(join(ROOT, '.cursor-plugin/marketplace.json'), 'utf8'))
    expect(marketplace).toMatchObject({
      name: 'devopsflow',
      owner: { name: 'LiTeXz', email: 'truenine304520@gmail.com' },
      plugins: [{ name: 'devopsflow', source: '.' }],
    })
    expect(marketplace.plugins).toHaveLength(1)
    expect(marketplace.plugins[0].description.length).toBeGreaterThan(0)
  })

  it('points every hook command to an existing source file', () => {
    const hooks = JSON.parse(readFileSync(join(ROOT, 'hooks/hooks.cursor.json'), 'utf8'))
    for (const group of Object.values(hooks.hooks) as Array<Array<{ command: string }>>) {
      for (const hook of group) {
        const match = hook.command.match(/CURSOR_PLUGIN_ROOT}\/([^"']+)/)
        expect(match?.[1]).toBeDefined()
        expect(readFileSync(join(ROOT, match?.[1] ?? ''), 'utf8').length).toBeGreaterThan(0)
      }
    }
  })

  it('publishes frontmatter for every skill directory', () => {
    const skillDirectories = readdirSync(join(ROOT, 'skills'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()

    expect(skillDirectories.length).toBeGreaterThan(0)
    for (const skill of skillDirectories) {
      const document = readFileSync(join(ROOT, 'skills', skill, 'SKILL.md'), 'utf8')
      expect(document).toMatch(new RegExp(`^---\\n[\\s\\S]*?name: ${skill}\\n`))
      expect(document).toMatch(/^description:\s*.+$/m)
    }
  })
})
