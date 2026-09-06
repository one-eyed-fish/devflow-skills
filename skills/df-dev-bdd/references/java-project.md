# Java And Kotlin Project Structures

本文列出 Java/Kotlin 项目中可以承载 BDD 行为契约的常见文件组织方式，不把某一种 Maven、Gradle、Java 或 Kotlin 布局声明为普适的最佳实践。实际选择应先服从目标项目已有的模块、source set、测试框架和构建命令。

## Structure A: Conventional JVM Source Sets

Java/Kotlin 项目通常将生产代码、测试代码和 feature 资源分开：

```text
module/
  src/main/java/.../OrderService.java
  src/main/kotlin/.../OrderService.kt
  src/test/java/.../OrderSteps.java
  src/test/kotlin/.../OrderSteps.kt
  src/test/resources/features/order.feature
  src/test/java/.../OrderFeatureTest.java
  src/test/kotlin/.../OrderFeatureTest.kt
```

其中 Java 和 Kotlin 的生产、step definitions 或测试 runner 可以按项目语言分别存在；同一模块不需要同时使用两种语言。`.feature` 通常属于测试资源，而不是 `src/main` 生产 source set。

## Structure B: Package-Aligned BDD Tests

如果项目按领域或业务能力划分 package，可以让 steps、runner 和测试资源按照相同能力归组：

```text
src/test/java/com/example/order/OrderSteps.java
src/test/java/com/example/order/OrderFeatureTest.java
src/test/resources/features/order/order.feature
```

Kotlin 项目可以使用对应的 `src/test/kotlin` package。该布局强调测试代码与领域 package 的对应关系，但不要求生产类、step definitions 和 `.feature` 使用相同的物理目录。

## Structure C: Dedicated Acceptance Test Source Set

Gradle 或 Maven 项目也可以把验收测试作为独立 source set 或模块：

```text
order-domain/
  src/main/java/...
  src/test/java/...
order-acceptance/
  src/test/java/.../OrderSteps.java
  src/test/resources/features/order.feature
  src/test/java/.../OrderFeatureTest.java
```

这种布局可以将快速单元测试与较慢的 Cucumber、integration 或 end-to-end 测试分开，但需要项目构建配置明确依赖、测试任务和报告边界。

## Runner Variants

Java/Kotlin 项目可以根据现有技术栈选择不同执行方式：

- Java Cucumber 通常由 JUnit 4、JUnit Platform 或项目已有的 Cucumber runner 启动。
- Kotlin Cucumber 可以使用 Kotlin step definitions，并由 JUnit、Kotest 或项目已有 runner 承载。
- Maven Surefire、Maven Failsafe、Gradle `test` 或独立 acceptance test task 都可能负责收集执行结果。

这些是可选的 runner 组合。不能仅根据使用 Java 或 Kotlin 就推断项目一定使用某一个 runner。

## Selection Notes

- 先检查 Maven `pom.xml`、Gradle build files、source set、JUnit/Cucumber/Kotest 配置和 CI 命令。
- `.feature` 放在测试资源目录还是独立验收目录，应由现有构建和测试发现规则决定。
- Java 与 Kotlin 的实体、step definitions 和测试 runner 遵循目标项目既有语言及代码风格，不因为 BDD 契约而强制混用语言。
- 重点是让 Feature、需求标签、step definitions、测试入口和构建任务保持可追踪，而不是强制某个目录名称。
- 如果项目已有约定，应保留已有布局，只补充缺失的契约、steps 或 runner 入口。
