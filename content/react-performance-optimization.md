---
title: React 性能优化实战指南
summary: 深入讲解 memo、useMemo、useCallback 的正确使用场景，以及 Suspense、懒加载、虚拟列表等进阶优化手段。
publishedAt: 2025-05-18T11:00:00.000Z
tags:
  - React
  - 前端
  - 性能
  - JavaScript
author:
  name: 墨迹
---

# React 性能优化实战指南

React 默认已经很快，但随着应用复杂度增加，过度渲染和大包体积会成为瓶颈。

## 理解重渲染

React 组件在以下情况会重渲染：
- 自身 state 或 props 变化
- 父组件重渲染
- Context 值变化

重渲染本身不是问题，**不必要的重渲染**才是。

## React.memo：避免子组件重渲染

```tsx
// 没有 memo：父组件每次渲染都会重渲染 UserCard
function UserCard({ user }: { user: User }) {
  return <div>{user.name}</div>;
}

// 加上 memo：props 不变就跳过渲染
const UserCard = React.memo(function UserCard({ user }: { user: User }) {
  return <div>{user.name}</div>;
});
```

**注意**：memo 用浅比较，对象/数组 props 每次渲染都是新引用，需要配合 `useMemo`。

## useMemo：缓存计算结果

```tsx
function ProductList({ products, filter }: Props) {
  // ❌ 每次渲染都重新计算
  const filtered = products.filter(p => p.category === filter);

  // ✅ 只在依赖变化时重新计算
  const filtered = useMemo(
    () => products.filter(p => p.category === filter),
    [products, filter]
  );

  return <>{filtered.map(p => <ProductCard key={p.id} product={p} />)}</>;
}
```

什么时候用 `useMemo`：
- 计算量大（排序、过滤大数组、复杂数学运算）
- 结果作为 `memo` 组件的 props
- 结果是 `useEffect` 的依赖项

## useCallback：缓存函数引用

```tsx
function Parent() {
  const [count, setCount] = useState(0);

  // ❌ 每次渲染都是新函数，Child 会无谓重渲染
  const handleClick = () => console.log("clicked");

  // ✅ 函数引用稳定
  const handleClick = useCallback(() => {
    console.log("clicked");
  }, []);  // 没有依赖，永远是同一个函数

  return <Child onClick={handleClick} />;
}

const Child = React.memo(({ onClick }: { onClick: () => void }) => {
  return <button onClick={onClick}>Click</button>;
});
```

## 代码分割与懒加载

```tsx
import { lazy, Suspense } from "react";

// 懒加载重型组件
const RichEditor = lazy(() => import("@/components/RichEditor"));
const ChartDashboard = lazy(() => import("@/components/ChartDashboard"));

function App() {
  return (
    <Suspense fallback={<div className="animate-pulse">加载中...</div>}>
      <RichEditor />
    </Suspense>
  );
}
```

路由级别的代码分割效果最明显，可以大幅减少首屏加载时间。

## 虚拟列表：渲染海量数据

列表超过 100 条时，考虑虚拟滚动（只渲染可视区域内的项）：

```bash
npm install @tanstack/react-virtual
```

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

function VirtualList({ items }: { items: string[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,  // 每项估算高度
  });

  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.index}
            style={{ transform: `translateY(${item.start}px)`, position: "absolute", width: "100%" }}
            className="h-12 flex items-center px-4 border-b"
          >
            {items[item.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 避免常见的性能陷阱

### 1. 不要在渲染时创建新对象作为 props

```tsx
// ❌ 每次渲染都是新的 style 对象
<Component style={{ color: "red" }} />

// ✅ 提取到组件外部或用 useMemo
const style = { color: "red" };
<Component style={style} />
```

### 2. Context 拆分

```tsx
// ❌ 一个大 Context，任何值变化都触发所有消费者重渲染
const AppContext = createContext({ user, theme, cart });

// ✅ 按关注点拆分
const UserContext = createContext(user);
const ThemeContext = createContext(theme);
const CartContext = createContext(cart);
```

### 3. 状态下沉

把 state 放到真正需要它的最小范围内，避免顶层 state 变化引起大范围重渲染。

## 性能分析工具

- **React DevTools Profiler**：录制渲染，找出渲染耗时长的组件
- **Chrome Performance 面板**：分析 JS 执行时间
- **why-did-you-render**：自动提示不必要的重渲染

优化的前提是先**测量**，不要凭感觉过早优化。
