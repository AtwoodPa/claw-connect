# Cursor Rules 说明

本目录下的 `.mdc` 文件为 Cursor 规则，用于在开发时自动为 AI 提供上下文。

## 规则列表

| 文件 | 作用范围 | 说明 |
|------|----------|------|
| project-overview.mdc | 始终应用 | 项目结构、PRD 引用、通信协议 |
| backend-plugin.mdc | openclaw-web-channel/** | 后端插件开发规范 |
| vue-frontend.mdc | web-channel-vue/** | Vue 组件库规范 |
| typescript-standards.mdc | **/*.ts, **/*.vue | TypeScript 编码规范 |
| git-and-commit.mdc | 始终应用 | Git 提交规范 |

## 项目根目录配置

### .cursorignore（推荐创建）
在项目根目录创建 `.cursorignore`，排除无关文件以加速 Cursor 索引：

```
node_modules/
dist/
*.log
.env
.env.*
openclaw(源代码)/node_modules/
openclaw(源代码)/dist/
```

---

## 添加新规则

1. 新建 `.mdc` 文件
2. 在顶部添加 YAML frontmatter：
   ```yaml
   ---
   description: 规则描述
   globs: **/*.ts     # 可选，文件匹配
   alwaysApply: false # 可选，是否始终应用
   ---
   ```
3. 内容控制在 50 行以内，保持精简
