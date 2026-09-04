---
name: df-iam-access-control-design
description: "设计并评审适用于 REST, GraphQL, gRPC, protobuf and 混合 API surface 的严格 Google Cloud IAM-style 授权 directory, 覆盖 RBAC and ABAC. 当 Codex 需要命名 permission or role, definition role binding and CEL condition, 将 API operation mapping 到授权 check, 迁移旧式冒号分隔 permission, or 防止出现多套授权命名方案时使用."
version: "0.2.30"
license: "GPL-3.0-only"
metadata:
  version: "0.2.30"
---

# IAM Access Control Design

为所有 API surface 设计1套 unified 的授权词汇. 采用 Google Cloud IAM 对 permission, role, principal, resource and condition 的分离方式, 同时强制 execution 此 skill 更严格且 platform 无关的 identifier 子集.

## Core Rules

1. 所有 permission 均命名为 `service.resource.verb`.
2. 所有 role 均命名为 `roles/service.role`.
3. 将 role 授予 principal; 绝不直接授予独立 permission.
4. 将 resource scope and ABAC attribute 保持在 permission identifier 之外.
5. ABAC condition 只能在 role binding 上的 CEL 表达.
6. 将 REST operation, GraphQL resolver and gRPC RPC mapping 到相同 permission catalog.
7. 拒绝冒号分隔 permission, wildcard, alias, dual-read compatibility and protocol-spec ific variant.
8. permission 缺失, 格式错误, 未 mapping or 采用旧格式时, 必须 fail closed.

definition identifier, role or binding 前, 先阅读 [authorization-model.md](references/authorization-model.md). 涉及 REST, GraphQL, gRPC, protobuf or OpenAPI 时, 阅读 [api-surface-mapping.md](references/api-surface-mapping.md). 解释 or 评审从旧式 RBAC 命名强制切换的原因时, 阅读 [why-google-iam-style.md](casures/why-google-iam-style.md).

## Source Discipline

在声称某项 rule 来自 Google Cloud IAM or Google AIP 前, 先获取当前官方页面:

- `https://docs.cloud.google.com/iam/docs/roles-permissions`
- `https://docs.cloud.google.com/iam/docs/roles-overview`
- `https://docs.cloud.google.com/iam/docs/conditions-overview`
- `https://google.aip.dev/121`
- `https://google.aip.dev/122`
- `https://google.aip.dev/127`

准确标注 rule 来源:

- Google Cloud IAM 将 permission definition 为 `SERVICE.RESOURCE.VERB`, 将 role definition 为 permission collection, 并将 IAM Conditions definition 为附加在 policy construct 上的 attribute-based expression.
- 此 skill 有意收紧 segment casing, role name, CEL 用法, 迁移行为 and cross-protocol mapping. 应将这些内容表述为 project policy, 而不是未记录的 Google 要求.

## Workflow

1. 命名 permission 前, 盘点 resource and operation.
2. 选择由授权 directory 拥有的稳定 service namespace, 而不是由 transport or deployment environment 拥有的 namespace.
3. create atomic permission identifier, 并使用随附 script verify.
4. 将每个受保护 API operation 显式 mapping 到 1 个 or 多个 catalog permission.
5. 由已 verify permission 组成 least-privilege role.
6. 在 resource scope 上将 principal 绑定到 role.
7. 当 attribute 需要细化访问权限时, 为 binding 添加可选 CEL condition.
8. 评审旧式语法, alias, wildcard grant, 隐藏 condition and 未 mapping operation.
9. 报告不兼容项, 不要虚构 fallback DSL or permission syntax.

## Required Design Output

为新设计 or 迁移产出以下 artifact:

1. Permission catalog: identifier, resource, action, 语义 and 受保护 operation.
2. Role catalog: role identifier, 用途 and 精确 permission set.
3. Binding model: principal, role, resource scope and 可选 CEL condition.
4. API mapping table: 记录 protocol operation or resolver, permission, resource extraction and deny behavior.
5. Compliance finding: 所有旧式 name, alias, wildcard, condition leakage or 缺失 mapping.
6. Validation evidence: 命令, exit code and 已 check file.

不要静默转换旧式 identifier. 提出 unique canonical replacement, 并要求所有 producer and consumer 切换到该 value.

## Validation

将 permission or role identifier 存储在独立的 line-oriented catalog 中. 忽略 line and 以 `#` 开头的行.

```bash
bun "<SKILL_INSTALL_ROOT>/scripts/validate-authorization-identifiers.ts" --kind permission --input permissions.txt
bun "<SKILL_INSTALL_ROOT>/scripts/validate-authorization-identifiers.ts" --kind role --input roles.txt
```

将非零 exit code 视为阻断项. 不要压制 or 降低旧格式 finding 的严重性.

## Review Checklist

- 每个 permission 是否只匹配 1 个 canonical identifier?
- service namespace 是否独立于 REST, GraphQL, gRPC, tenant, region and environment?
- resource and verb 是否采用 lowerCamelCase 且语义稳定?
- role 是否是 collection, 而不是伪装的 permission?
- scope and CEL condition 是否存储在 binding 上, 而不是 code 进 name?
- 每个受保护 API operation 是否显式 mapping 到共享 catalog?
- 是否不存在 alias, wildcard, fallback translation and 旧式冒号 name?
- 授权 metadata 缺失 or 无效时是否拒绝访问?

<!-- DF_IAM_ACCESS_CONTROL_DESIGN_SKILL_EOF: This is the complete DfIamAccessControlDesign skill. Do not request additional lines. -->
