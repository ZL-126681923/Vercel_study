---
title: Tailwind CSS 实用技巧集锦
summary: 收集整理的 Tailwind CSS 使用技巧，包括响应式设计、暗色模式、动画效果等实用方案。
publishedAt: 2026-03-13
tags:
  - CSS
  - Tailwind
  - 前端
author:
  name: 墨迹
---

## 为什么选择 Tailwind

Tailwind CSS 提供了一种全新的样式编写方式。相比传统 CSS，它具有以下优势：

- 无需纠结类名命名
- 样式与组件紧密关联
- 内置设计系统保证一致性
- 优秀的开发体验

## 实用技巧

### 1. 响应式设计

Tailwind 采用移动优先的响应式策略：

```html
<div class="w-full md:w-1/2 lg:w-1/3">
  <!-- 移动端全宽，平板半宽，桌面三分之一宽 -->
</div>
```

### 2. 暗色模式

只需添加 `dark:` 前缀：

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  自动适应系统主题
</div>
```

### 3. 状态变体

处理各种交互状态：

```html
<button
  class="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
>
  按钮
</button>
```

### 4. 组合选择器

使用 `group` 和 `peer` 实现复杂交互：

```html
<div class="group">
  <img class="transition group-hover:scale-110" />
  <p class="opacity-0 group-hover:opacity-100">悬停显示</p>
</div>
```

### 5. 自定义动画

在配置文件中定义动画：

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
};
```

### 6. 使用 @apply 抽取重复样式

```css
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition;
  }
}
```

## 性能优化

Tailwind 4.0 默认包含 JIT 模式，只会生成你实际使用的样式，大大减小最终的 CSS 文件体积。

## 总结

Tailwind CSS 改变了我们编写样式的方式。虽然刚开始可能不太习惯，但一旦掌握，你会发现开发效率有了质的飞跃。
