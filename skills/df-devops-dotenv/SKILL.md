---
name: df-devops-dotenv
description: "管理跨 development、testing、deployment 和 operations 生命周期的 dotenv 环境变量配置，涵盖 .env 文件分层、变量优先级、模板、校验、secret 安全、CI/CD 注入和本地运行边界。适用于新增、迁移、审查或排查 .env、dotenv、环境变量、配置模板、部署变量和 secret 管理任务；不适用于把 dotenv 文件当作生产 secret vault 或动态业务数据存储。"
version: "0.2.36"
license: "GPL-3.0-only"
metadata:
  version: "0.2.36"
---

# Dotenv Environment Management

使用此 skill 管理环境变量从本地 development 到 testing、deployment 和 operations 的完整生命周期。dotenv 文件是配置输入和本地启动工具，不是生产 secret vault、数据库或业务数据存储。

## Core Principles

- 先发现 target project 的 runtime、package manager、启动命令、部署平台、CI/CD、现有 `.env*` 文件和配置加载方式。
- 明确每个变量的用途、类型、是否必填、适用环境、默认值、敏感性、所有者和变更方式。
- 区分 committed template（例如 `.env.example`）和本地或平台 secret；真实 secret 不得提交到 Git。
- 先定义加载优先级，再修改文件；不要同时引入多套互相冲突的 dotenv loader。
- 应用启动时尽早校验必填变量、格式和互斥关系，并使用安全错误信息，不打印 secret 值。
- 生产和 CI/CD 优先使用平台 secret/environment variable store；`.env` 文件只在平台明确支持并有保护措施时使用。
- 不要把变量名、默认值、日志、错误信息或 shell 命令写成暴露 secret 的渠道。
- 变量变更必须检查本地、测试、预览、生产、容器和 CI/CD 的消费者。

## Environment Layers

按 target project 实际约定使用下列层次，不要强行创建全部文件：

- `.env.example`：提交到仓库的非敏感变量名、说明和安全示例值。
- `.env.defaults`：明确允许共享的非敏感默认值；必须遵守项目已有 loader 规则。
- `.env.local`：本地开发覆盖值，通常加入 `.gitignore`。
- `.env.test`：测试专用配置，禁止复用生产 secret。
- `.env.production`：只有项目明确要求且具备访问控制时才使用；优先改用部署平台配置。
- CI/CD、preview、staging、production environment：由平台或 pipeline 注入，不在 repository 中保存真实值。

不要假定以上文件的加载顺序。先查 framework、dotenv library、container、CI/CD 和部署平台文档及项目实现，形成项目特定的 precedence matrix。

## Workflow

1. **Inventory**
   - 搜索 `.env*`、dotenv loader、配置 schema、启动脚本、Docker、CI/CD 和部署配置。
   - 检查 `.gitignore`、Git history、构建日志和错误日志中是否存在 secret 泄漏风险。
   - 为每个变量建立 inventory：名称、用途、敏感性、类型、环境、来源、必填性、默认值和消费者。

2. **Define the contract**
   - 变量名保持稳定、清晰并符合 target project 的命名约定。
   - 为 URL、端口、布尔值、整数、枚举、JSON、逗号列表和 duration 定义解析规则。
   - 明确空字符串是否等于未设置、默认值何时生效、变量之间的依赖和互斥关系。
   - 为敏感变量记录 secret owner、轮换方式、最小权限和禁止日志输出的位置。

3. **Create safe templates**
   - 只在需要时新增 `.env.example` 或其他模板；不复制当前机器的真实 `.env`。
   - 对敏感变量使用明显的占位符，例如 `replace-with-local-secret`，且该值不能被误认为可用生产 credential。
   - 在模板中提供注释、环境说明和获取方式；不要写 secret 本身。
   - 同步 `.gitignore`，但不要用忽略规则掩盖已经被追踪的 secret。

4. **Implement loading and validation**
   - 复用 target project 已有配置入口；不要在多个模块分别解析同一变量。
   - 启动早期验证必填变量和格式；错误信息只包含变量名、规则和修复方向，不包含变量值。
   - 对不同 runtime 传递方式保持一致：local shell、test runner、container、CI/CD、preview 和 production。
   - 若项目使用 Netlify Functions，使用 `Netlify.env.get("VAR")` 读取函数环境变量；不要在代码中硬编码 secret。

5. **Verify lifecycle coverage**
   - 在隔离环境验证未设置、空值、非法值、合法值、覆盖优先级和互斥变量。
   - 验证日志、错误、构建产物、source map、容器层和 CI 输出不会泄漏 secret。
   - 检查 deploy preview、staging 和 production 的变量集合与权限边界。
   - 完成前使用 `df-verification-before-completion`，记录命令、环境、结果和无法验证的范围。

## Variable Inventory Template

```markdown
| Variable | Purpose | Type | Required environments | Sensitive | Source | Validation |
|---|---|---|---|---|---|---|
| `EXAMPLE_API_URL` | External API base URL | URL | local, test, production | no | platform environment | HTTPS URL |
| `EXAMPLE_API_TOKEN` | External API authentication | secret string | local, test, production | yes | secret store | non-empty; never log |
```

## Security Checklist

- `.env.local`、真实 `.env` 和包含 secret 的临时文件未被提交。
- `git diff`、Git history、CI logs、build logs、error messages 和 artifacts 中没有 secret。
- secret 通过受控 secret store 或平台环境变量注入，权限遵循最小化原则。
- 不使用真实生产 secret 作为测试 fixture、文档示例或本地默认值。
- 变量轮换不要求把 secret 写入 source code。
- 删除 secret 后检查 Git history 和缓存；必要时按 incident procedure 立即 revoke/rotate，而不是只删除当前文件。
- 客户端可见变量与仅服务端变量已明确区分；不要把服务端 secret 暴露到浏览器 bundle。

## Non-Negotiable Rules

- 不要提交真实 API key、token、password、private key、cookie 或证书。
- 不要把 dotenv 文件当作生产 secret vault、动态配置数据库或业务数据存储。
- 不要假定 `.env` 文件优先级；必须以 target project 的实际 loader 和部署平台为准。
- 不要在日志、异常、测试失败信息或诊断输出中打印完整变量值。
- 不要为了修复缺少变量而硬编码 secret、扩大权限或复用其他环境的 credential。
- 不要只修改 `.env.example` 而遗漏应用 schema、CI/CD、container、部署平台或文档消费者。
- 不要把敏感变量放入客户端代码、公开构建产物或可被浏览器读取的配置中。
- 发现 Git history 已泄漏 secret 时，先按安全事件处理并轮换 credential，再进行清理。

## Related Skills

- `df-dev-sdd`：为配置变量定义可追踪、可验证的配置规范。
- `df-dev-tdd`：为变量解析、校验、优先级和失败行为建立 tests-first 保护。
- `df-ops-dependcy-man`：检查配置加载相关依赖和工具。
- `df-verification-before-completion`：验证所有生命周期环境和安全边界。

<!-- DF_DEVOPS_DOTENV_SKILL_EOF: This is the complete DfDevopsDotenv skill. Do not request additional lines. -->
