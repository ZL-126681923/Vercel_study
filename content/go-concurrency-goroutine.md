---
title: Go 并发编程：goroutine 与 channel 实战
summary: 深入理解 Go 的并发模型，掌握 goroutine、channel、select、sync 包的正确用法，避免常见的并发陷阱。
publishedAt: 2025-04-10T09:00:00.000Z
tags:
  - Go
  - 后端
  - 笔记
author:
  name: 墨迹
---

# Go 并发编程：goroutine 与 channel 实战

Go 的并发是其最大卖点之一，"不要通过共享内存来通信，而要通过通信来共享内存"是 Go 的并发哲学。

## goroutine：轻量级线程

```go
package main

import (
    "fmt"
    "time"
)

func say(s string) {
    for i := 0; i < 3; i++ {
        fmt.Println(s)
        time.Sleep(100 * time.Millisecond)
    }
}

func main() {
    go say("world")  // 启动 goroutine
    say("hello")     // 主 goroutine
}
```

goroutine 非常轻量，初始栈只有 2KB，可以轻松创建数十万个。

## channel：goroutine 间通信

```go
func sum(s []int, c chan int) {
    total := 0
    for _, v := range s {
        total += v
    }
    c <- total  // 发送到 channel
}

func main() {
    s := []int{7, 2, 8, -9, 4, 0}
    c := make(chan int)

    go sum(s[:len(s)/2], c)
    go sum(s[len(s)/2:], c)

    x, y := <-c, <-c  // 接收两个结果
    fmt.Println(x + y) // 12
}
```

### 缓冲 channel

```go
// 无缓冲：发送方阻塞直到接收方就绪
ch := make(chan int)

// 有缓冲：容量内不阻塞
ch := make(chan int, 10)
ch <- 1  // 不阻塞
ch <- 2  // 不阻塞
```

### 关闭 channel

```go
func producer(ch chan int) {
    for i := 0; i < 5; i++ {
        ch <- i
    }
    close(ch)  // 发完后关闭
}

func main() {
    ch := make(chan int, 5)
    go producer(ch)

    // range 会在 channel 关闭后自动退出
    for v := range ch {
        fmt.Println(v)
    }
}
```

## select：多路复用

```go
func fibonacci(c, quit chan int) {
    x, y := 0, 1
    for {
        select {
        case c <- x:  // 能发就发
            x, y = y, x+y
        case <-quit:  // 收到退出信号
            fmt.Println("quit")
            return
        }
    }
}
```

`select` 类似 `switch`，但针对 channel 操作，随机选择一个可以执行的 case。

## sync 包：共享内存同步

有时共享内存更直观，用 `sync.Mutex` 保护：

```go
import "sync"

type SafeCounter struct {
    mu sync.Mutex
    v  map[string]int
}

func (c *SafeCounter) Inc(key string) {
    c.mu.Lock()
    c.v[key]++
    c.mu.Unlock()
}

func (c *SafeCounter) Value(key string) int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.v[key]
}
```

### WaitGroup：等待所有 goroutine 完成

```go
func main() {
    var wg sync.WaitGroup
    urls := []string{"https://example.com", "https://golang.org", "https://github.com"}

    for _, url := range urls {
        wg.Add(1)
        go func(u string) {
            defer wg.Done()
            // 并发请求
            resp, err := http.Get(u)
            if err == nil {
                fmt.Printf("%s: %d\n", u, resp.StatusCode)
                resp.Body.Close()
            }
        }(url)
    }

    wg.Wait()  // 等待所有 goroutine 完成
    fmt.Println("全部完成")
}
```

## 常见陷阱

### 1. goroutine 泄漏

```go
// ❌ channel 无人接收，goroutine 永久阻塞
func leak() {
    ch := make(chan int)
    go func() {
        ch <- 1  // 永远阻塞
    }()
    // 函数返回，但 goroutine 还在
}

// ✅ 用 context 控制生命周期
func noLeak(ctx context.Context) {
    ch := make(chan int, 1)
    go func() {
        select {
        case ch <- 1:
        case <-ctx.Done():  // 超时或取消时退出
        }
    }()
}
```

### 2. 闭包捕获循环变量

```go
// ❌ 所有 goroutine 共享同一个 i
for i := 0; i < 5; i++ {
    go func() {
        fmt.Println(i)  // 可能全部打印 5
    }()
}

// ✅ 传参复制
for i := 0; i < 5; i++ {
    go func(n int) {
        fmt.Println(n)
    }(i)
}
```

## 并发模式：工作池

```go
func worker(id int, jobs <-chan int, results chan<- int) {
    for j := range jobs {
        result := j * j  // 模拟耗时工作
        results <- result
    }
}

func main() {
    jobs := make(chan int, 100)
    results := make(chan int, 100)

    // 启动 3 个 worker
    for w := 1; w <= 3; w++ {
        go worker(w, jobs, results)
    }

    // 发送 9 个任务
    for j := 1; j <= 9; j++ {
        jobs <- j
    }
    close(jobs)

    // 收集结果
    for a := 1; a <= 9; a++ {
        fmt.Println(<-results)
    }
}
```

Go 的并发模型简洁强大，理解了 goroutine 和 channel 就掌握了 Go 并发的精髓。
