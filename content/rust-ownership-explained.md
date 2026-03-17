---
title: Rust 所有权系统详解：内存安全的秘密
summary: 深入理解 Rust 所有权、借用与生命周期机制，搞懂编译器报错背后的逻辑，写出安全高效的 Rust 代码。
publishedAt: 2025-07-04T08:00:00.000Z
tags:
  - Rust
  - 后端
  - 笔记
author:
  name: 墨迹
---

# Rust 所有权系统详解：内存安全的秘密

Rust 没有 GC，却能保证内存安全——这一切依赖于编译期的**所有权系统**。

## 所有权三原则

1. Rust 中每个值都有一个**所有者（owner）**
2. 同一时刻，一个值只能有**一个所有者**
3. 所有者离开作用域时，值被**自动释放（drop）**

```rust
fn main() {
    let s = String::from("hello");  // s 是所有者
    // s 在这里有效

}   // s 离开作用域，内存自动释放
```

## Move：所有权转移

```rust
let s1 = String::from("hello");
let s2 = s1;  // 所有权从 s1 转移到 s2

// println!("{}", s1);  // ❌ 编译错误：s1 已被移走
println!("{}", s2);     // ✅
```

对于实现了 `Copy` trait 的类型（整数、浮点数、bool、字符），赋值是复制而非移动：

```rust
let x = 5;
let y = x;  // x 被复制，两者都有效
println!("{} {}", x, y);  // ✅
```

## Clone：深拷贝

需要完整复制数据时，显式调用 `.clone()`：

```rust
let s1 = String::from("hello");
let s2 = s1.clone();  // 深拷贝
println!("{} {}", s1, s2);  // ✅ 两者都有效
```

## 借用（References）

不想转移所有权，只是"借"着用——用引用：

```rust
fn calculate_length(s: &String) -> usize {
    s.len()
}

fn main() {
    let s = String::from("hello");
    let len = calculate_length(&s);  // 借用，不转移所有权
    println!("'{}' 的长度是 {}", s, len);  // s 仍然有效
}
```

### 可变引用

```rust
fn change(s: &mut String) {
    s.push_str(", world");
}

let mut s = String::from("hello");
change(&mut s);
```

**关键限制**：同一时刻，可变引用只能有一个：

```rust
let mut s = String::from("hello");

let r1 = &mut s;
// let r2 = &mut s;  // ❌ 编译错误！

// 不可变引用可以有多个
let r1 = &s;
let r2 = &s;
// let r3 = &mut s;  // ❌ 已有不可变引用时不能再借可变引用
```

这个设计消灭了**数据竞争**（data race）。

## 生命周期（Lifetimes）

编译器需要确保引用的有效期不超过被引用数据的存活期：

```rust
// 这段代码会编译失败
fn longest(x: &str, y: &str) -> &str {  // ❌ 编译器不知道返回的是哪个的引用
    if x.len() > y.len() { x } else { y }
}

// 加上生命周期标注
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {  // ✅
    if x.len() > y.len() { x } else { y }
}
```

生命周期标注不改变实际存活时间，只是告诉编译器"返回的引用至少活得和输入一样久"。

## 悬垂引用：编译器拦截

```rust
fn dangle() -> &String {  // ❌ 编译错误
    let s = String::from("hello");
    &s  // s 在函数结束时被释放，返回悬垂引用！
}

// 正确做法：返回值本身，转移所有权
fn no_dangle() -> String {
    let s = String::from("hello");
    s  // 所有权转移出去
}
```

## 切片（Slice）

切片是对数组或字符串一部分的引用：

```rust
let s = String::from("hello world");
let hello = &s[0..5];   // "hello"
let world = &s[6..11];  // "world"

// 字符串字面量本身就是切片
let literal: &str = "hello";  // &str 类型
```

## 小结

所有权系统的本质：用编译期检查代替运行时 GC，在**零成本**的前提下保证内存安全。理解了这三个概念——所有权、借用、生命周期——就理解了 Rust 编译器报错的大半逻辑。
