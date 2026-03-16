---
title: TypeScript 最佳实践 2026
summary: 分享在实际项目中总结的 TypeScript 使用技巧和最佳实践，帮助你写出更健壮的代码。
publishedAt: 2026-03-14
tags:
  - TypeScript
  - 最佳实践
coverImage: https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1200&h=600&fit=crop
author:
  name: 墨迹
---

## 为什么选择 TypeScript

TypeScript 已经成为现代前端开发的标配。类型系统不仅能在编译时捕获错误，还能提供更好的开发体验。

## 核心技巧

### 1. 善用类型推断

不要过度标注类型，让 TypeScript 自动推断：

```typescript
// ❌ 过度标注
const name: string = "hello";
const numbers: number[] = [1, 2, 3];

// ✅ 让 TS 推断
const name = "hello";
const numbers = [1, 2, 3];
```

### 2. 使用 const 断言

```typescript
// 类型为 { name: string; age: number }
const user = { name: "Tom", age: 18 };

// 类型为 { readonly name: "Tom"; readonly age: 18 }
const user = { name: "Tom", age: 18 } as const;
```

### 3. 类型守卫

```typescript
interface Cat {
  meow(): void;
}

interface Dog {
  bark(): void;
}

function isCat(pet: Cat | Dog): pet is Cat {
  return "meow" in pet;
}

function speak(pet: Cat | Dog) {
  if (isCat(pet)) {
    pet.meow(); // TypeScript 知道这是 Cat
  } else {
    pet.bark(); // TypeScript 知道这是 Dog
  }
}
```

### 4. 工具类型

TypeScript 内置了很多实用的工具类型：

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// 所有属性可选
type PartialUser = Partial<User>;

// 所有属性必填
type RequiredUser = Required<User>;

// 选取部分属性
type UserBasic = Pick<User, "id" | "name">;

// 排除部分属性
type UserWithoutEmail = Omit<User, "email">;
```

### 5. 泛型约束

```typescript
interface HasId {
  id: number;
}

function getById<T extends HasId>(items: T[], id: number): T | undefined {
  return items.find((item) => item.id === id);
}
```

## 项目配置建议

推荐在 `tsconfig.json` 中启用严格模式：

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## 总结

TypeScript 的价值在于它能帮助我们在开发阶段就发现潜在问题，而不是等到运行时。花时间学习类型系统，长远来看是值得的投资。
