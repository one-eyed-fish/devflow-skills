# Standards Map

这些链接是规范入口，不是 DevopsFlow 的第二份规范正文。任务需要具体条款时读取对应官方页面，并记录使用的版本、章节或 URL。

## Engineering Process And Review

- [Google Engineering Practices](https://google.github.io/eng-practices/)
- [Google Code Review Developer Guide](https://google.github.io/eng-practices/review/developer/)
- [Google Code Review Reviewer Guide](https://google.github.io/eng-practices/review/reviewer/)

用于变更粒度、评审重点、可维护性和验证证据。它不能替项目决定业务边界或技术栈实现。

## Security And Input Boundaries

- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

用于输入验证、输出编码、认证、会话、授权、错误处理和敏感数据。它要求边界验证，但不自动决定规范化应由哪个业务层拥有；该责任由项目契约和边界设计裁决。

## API And Contracts

- [Google API Improvement Proposals](https://google.aip.dev/)
- [Google API Design Guide](https://cloud.google.com/apis/design)
- [API Linter](https://linter.aip.dev/)

用于资源模型、方法和 URI、版本、分页、过滤、字段掩码、幂等、错误和长时间操作。使用具体 AIP 编号时直接读取其官方正文。

## Java Style

- [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)

用于 Java 格式、命名、导入、注释和声明布局。项目 formatter、编译器和 `AGENTS.md` 对当前仓库拥有更高优先级。

## Selection Rules

- 只选择与当前规范敏感面直接相关的最小来源集合。
- 外部来源之间发生冲突时，记录冲突，不把多个建议拼成未经验证的新规则。
- 外部标准未覆盖的业务语义、模块所有权和项目例外，必须回到目标项目规则或当前设计决策。
