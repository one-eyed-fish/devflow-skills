import { beforeAll, describe, expect, it } from 'bun:test'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

type ValidateIdentifier = (value: string) => string[]
type ValidateLines = (text: string, kind: 'permission' | 'role') => Array<{ line: number; value: string; errors: string[] }>

let validatePermissionIdentifier: ValidateIdentifier
let validateRoleIdentifier: ValidateIdentifier
let validateIdentifierLines: ValidateLines

beforeAll(async () => {
  const module = await import('./validate-authorization-identifiers')
  validatePermissionIdentifier = module.validatePermissionIdentifier
  validateRoleIdentifier = module.validateRoleIdentifier
  validateIdentifierLines = module.validateIdentifierLines
})

describe('permission identifiers', () => {
  it('returns exact errors for empty, whitespace, wildcard, and malformed values', () => {
    expect(validatePermissionIdentifier('')).toEqual(['identifier must not be empty', 'permission must match service.resource.verb using lowerCamelCase'])
    expect(validatePermissionIdentifier(' compute.instances.get ')).toEqual([
      'identifier must not contain surrounding whitespace',
      'permission must match service.resource.verb using lowerCamelCase',
    ])
    expect(validatePermissionIdentifier('compute.instances.*')).toEqual([
      'wildcard identifiers are forbidden',
      'permission must match service.resource.verb using lowerCamelCase',
    ])
    expect(validatePermissionIdentifier('invalid')).toEqual(['permission must match service.resource.verb using lowerCamelCase'])
  })

  it.each(['compute.instances.list', 'iam.serviceAccounts.actAs', 'cloudkms.cryptoKeyVersions.useToEncrypt'])('accepts %s', (identifier) => {
    expect(validatePermissionIdentifier(identifier)).toEqual([])
  })

  it.each([
    'rbac:user:read',
    'compute.instances.*',
    'compute.instances',
    'compute.instances.list.extra',
    'compute.service_accounts.get',
    'compute.service-accounts.get',
    'Compute.instances.get',
    'compute.Instances.get',
    'compute.instances.Get',
    ' compute.instances.get',
  ])('rejects %s', (identifier) => {
    expect(validatePermissionIdentifier(identifier).length).toBeGreaterThan(0)
  })
})

describe('role identifiers', () => {
  it('returns exact role-format errors', () => {
    expect(validateRoleIdentifier('invalid')).toEqual(['role must match roles/service.role using lowerCamelCase'])
    expect(validateRoleIdentifier('roles/compute.*')).toEqual(['wildcard identifiers are forbidden', 'role must match roles/service.role using lowerCamelCase'])
  })

  it.each(['roles/compute.viewer', 'roles/iam.serviceAccountAdmin'])('accepts %s', (identifier) => {
    expect(validateRoleIdentifier(identifier)).toEqual([])
  })

  it.each(['compute:viewer', 'compute.viewer', 'roles/compute.*', 'roles/Compute.viewer', 'roles/compute.Viewer', 'roles/compute.service_account_admin'])(
    'rejects %s',
    (identifier) => {
      expect(validateRoleIdentifier(identifier).length).toBeGreaterThan(0)
    },
  )
})

describe('line catalogs', () => {
  it('ignores blank lines and comments while retaining source lines', () => {
    const findings = validateIdentifierLines('# catalog\n\ncompute.instances.get\nrbac:user:read\n', 'permission')

    expect(findings).toHaveLength(1)
    expect(findings[0]?.line).toBe(4)
    expect(findings[0]?.value).toBe('rbac:user:read')
    expect(findings[0]?.errors.length).toBeGreaterThan(0)
  })

  it('ignores whitespace-only lines and indented comments while preserving invalid raw input', () => {
    expect(validateIdentifierLines('   \n  # comment\n compute.instances.get \n', 'permission')).toEqual([
      {
        line: 3,
        value: ' compute.instances.get ',
        errors: ['identifier must not contain surrounding whitespace', 'permission must match service.resource.verb using lowerCamelCase'],
      },
    ])
    expect(validateIdentifierLines('roles/compute.viewer\n', 'role')).toEqual([])
  })

  it('returns blocking CLI exit codes for invalid catalogs', () => {
    const directory = mkdtempSync(join(tmpdir(), 'iam-identifiers-'))
    const validPath = join(directory, 'valid.txt')
    const invalidPath = join(directory, 'invalid.txt')
    const rolePath = join(directory, 'roles.txt')
    const scriptPath = join(import.meta.dir, 'validate-authorization-identifiers.ts')

    try {
      writeFileSync(validPath, 'compute.instances.get\n', 'utf-8')
      writeFileSync(invalidPath, 'compute:instances:get\n', 'utf-8')
      writeFileSync(rolePath, 'roles/compute.viewer\n', 'utf-8')
      const env = { ...process.env, PLUGIN_ROOT: directory, CODEX_SESSION_ID: 'iam-cli' }

      const valid = Bun.spawnSync([process.execPath, scriptPath, '--input', validPath, '--kind', 'permission'], { env })
      const validWithUnknownOption = Bun.spawnSync([process.execPath, scriptPath, '--kind', 'permission', '--input', validPath, '--unknown'], { env })
      const validRole = Bun.spawnSync([process.execPath, scriptPath, '--kind', 'role', '--input', rolePath], { env })
      const invalid = Bun.spawnSync([process.execPath, scriptPath, '--kind', 'permission', '--input', invalidPath], { env })
      const missing = Bun.spawnSync([process.execPath, scriptPath, '--kind', 'permission'], { env })
      const invalidKind = Bun.spawnSync([process.execPath, scriptPath, '--kind', 'unknown', '--input', validPath], { env })

      expect(valid.exitCode).toBe(0)
      expect(valid.stdout.toString()).toBe('permission identifiers valid\n')
      expect(validWithUnknownOption.exitCode).toBe(0)
      expect(validWithUnknownOption.stdout.toString()).toBe('permission identifiers valid\n')
      expect(validRole.exitCode).toBe(0)
      expect(validRole.stdout.toString()).toBe('role identifiers valid\n')
      expect(invalid.exitCode).toBe(1)
      expect(invalid.stderr.toString()).toBe(
        'ERROR line 1: compute:instances:get: legacy colon-delimited identifiers are forbidden\nERROR line 1: compute:instances:get: permission must match service.resource.verb using lowerCamelCase\n',
      )
      expect(missing.exitCode).toBe(1)
      expect(missing.stderr.toString()).toBe('Usage: validate-authorization-identifiers.ts --kind <permission|role> --input <file>\n')
      expect(invalidKind.exitCode).toBe(1)
      expect(invalidKind.stderr.toString()).toBe('Usage: validate-authorization-identifiers.ts --kind <permission|role> --input <file>\n')

      const [logName] = readdirSync(join(directory, '.logs'))
      expect(logName).toEndWith('-iam-cli.log')
      const logEntries = readFileSync(join(directory, '.logs', logName as string), 'utf-8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as { script?: string })
      expect(logEntries.every(({ script }) => script === 'validate-authorization-identifiers')).toBeTrue()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
