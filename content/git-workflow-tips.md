---
title: Git 工作流实战：团队协作的最佳实践
summary: 从 commit 规范到分支策略，梳理高效团队 Git 工作流，减少合并冲突，让代码历史清晰可读。
publishedAt: 2025-11-15T09:30:00.000Z
tags:
  - 工具
  - Git
  - 教程
author:
  name: 墨迹
---

# Git 工作流实战：团队协作的最佳实践

好的 Git 工作流不是限制，而是让团队协作更顺畅的框架。

## Commit 信息规范（Conventional Commits）

混乱的 commit 历史让 code review 和排查问题都很痛苦。遵循 Conventional Commits 规范：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

常用 type：

| type | 含义 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响逻辑） |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具链变更 |

示例：

```bash
git commit -m "feat(auth): add Google OAuth login"
git commit -m "fix(api): handle null response from payment service"
git commit -m "docs: update README deployment section"
```

## 分支策略

### GitHub Flow（推荐小团队）

简单高效，适合持续部署的项目：

```
main
 ├── feature/user-profile
 ├── fix/login-redirect
 └── feature/dark-mode
```

流程：
1. 从 `main` 创建功能分支
2. 开发完成后提 PR
3. Code review 通过后 merge 到 `main`
4. `main` 始终保持可部署状态

### Git Flow（适合有版本节奏的项目）

```
main        ← 生产代码，只接受 release/hotfix merge
develop     ← 集成分支，功能在此汇总
feature/*   ← 功能开发
release/*   ← 发版准备
hotfix/*    ← 线上紧急修复
```

## 实用技巧

### 交互式 rebase 整理提交

PR 前把多个"WIP"提交整理成有意义的记录：

```bash
# 整理最近 4 个提交
git rebase -i HEAD~4
```

在编辑器中把 `pick` 改为 `squash` 合并，或 `reword` 修改信息。

### stash 保存临时工作

```bash
# 保存当前修改
git stash push -m "临时保存：正在修复登录问题"

# 查看 stash 列表
git stash list

# 恢复最新的 stash
git stash pop

# 恢复指定 stash
git stash apply stash@{2}
```

### 找出引入 Bug 的提交

```bash
# 二分查找
git bisect start
git bisect bad                  # 当前版本有问题
git bisect good v2.1.0          # 这个版本是好的
# Git 自动切换到中间版本，测试后告知结果
git bisect good / git bisect bad
# 找到后重置
git bisect reset
```

### cherry-pick 摘取特定提交

```bash
# 把其他分支的某个提交应用到当前分支
git cherry-pick a1b2c3d
```

## .gitignore 最佳实践

```gitignore
# 依赖
node_modules/
.pnp
.pnp.js

# 构建产物
dist/
build/
.next/
out/

# 环境变量（绝对不要提交！）
.env
.env.local
.env.*.local

# 编辑器配置（保留团队共用的，忽略个人的）
.vscode/settings.json
.idea/
*.swp

# 操作系统文件
.DS_Store
Thumbs.db
```

## Code Review 礼仪

- **PR 要小**：尽量控制在 400 行以内，大 PR 没人认真看
- **描述清楚背景**：为什么改，改了什么，如何测试
- **评论要建设性**：提建议而非批评，对事不对人
- **及时响应**：别让 PR 挂着超过 2 天

养成好的 Git 习惯，代码历史就是最好的文档。
