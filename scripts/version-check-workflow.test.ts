import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// biome-ignore lint/style/noNonNullAssertion: import.meta.dir is always defined at runtime
const ROOT = join(import.meta.dir!, '..')
const WORKFLOW = readFileSync(join(ROOT, '.github', 'workflows', 'version-check.yml'), 'utf-8')
const PACKAGE = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')) as {
  scripts: Record<string, string>
}

describe('version-check workflow', () => {
  it('uses package.json as the release tag version source', () => {
    expect(WORKFLOW).toContain('tags: ["v*"]')
    expect(WORKFLOW).toContain('PKG_VERSION=$(bun -e "console.log(require(\'./package.json\').version)")')
    expect(WORKFLOW).toContain('EXPECTED_TAG="v$' + '{PKG_VERSION}"')
    expect(WORKFLOW).toContain('"$GITHUB_REF_NAME" != "$EXPECTED_TAG"')
    expect(WORKFLOW).toContain('package.json version requires tag $' + '{EXPECTED_TAG}')
    expect(WORKFLOW).toContain("if: github.ref_type == 'tag'")
  })

  it('uses the DevopsFlow repository as the managed asset source', () => {
    expect(WORKFLOW).toContain('LiTeXz/devopsflow')
  })

  it('defines every package script invoked by the skill metadata workflow', () => {
    const skillMetadataWorkflow = readFileSync(join(ROOT, '.github', 'workflows', 'skill-metadata-check.yml'), 'utf-8')

    expect(skillMetadataWorkflow).toContain('bun run check:skill-metadata')
    expect(PACKAGE.scripts['check:skill-metadata']).toBe('bun scripts/check-skill-metadata.ts')
  })
})
