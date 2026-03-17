---
title: Pandas 数据分析快速上手
summary: 用 Python Pandas 处理表格数据的核心操作：读取、清洗、聚合、可视化，附带真实案例演示。
publishedAt: 2025-09-22T14:00:00.000Z
tags:
  - Python
  - AI / ML
  - 数据库
  - 教程
author:
  name: 墨迹
---

# Pandas 数据分析快速上手

Pandas 是 Python 数据分析的核心库，几乎所有数据工作流都离不开它。

## 安装

```bash
pip install pandas numpy matplotlib openpyxl
```

## 核心数据结构

### Series：一维数据

```python
import pandas as pd

s = pd.Series([10, 20, 30, 40], index=["a", "b", "c", "d"])
print(s["b"])   # 20
print(s[s > 15])  # 筛选大于 15 的
```

### DataFrame：二维表格

```python
df = pd.DataFrame({
    "姓名": ["Alice", "Bob", "Carol", "Dave"],
    "年龄": [25, 30, 28, 35],
    "部门": ["工程", "产品", "工程", "设计"],
    "薪资": [15000, 18000, 16000, 14000],
})
```

## 读取数据

```python
# CSV
df = pd.read_csv("data.csv", encoding="utf-8")

# Excel
df = pd.read_excel("data.xlsx", sheet_name="Sheet1")

# JSON
df = pd.read_json("data.json")

# 数据库（需要 sqlalchemy）
from sqlalchemy import create_engine
engine = create_engine("postgresql://user:pass@localhost/db")
df = pd.read_sql("SELECT * FROM orders WHERE status = 'paid'", engine)
```

## 数据探索

```python
df.shape          # (行数, 列数)
df.dtypes         # 各列数据类型
df.head(10)       # 前 10 行
df.tail(5)        # 后 5 行
df.info()         # 概况信息
df.describe()     # 数值列统计摘要

# 缺失值检查
df.isnull().sum()
```

## 数据清洗

```python
# 删除重复行
df = df.drop_duplicates()

# 填充缺失值
df["薪资"].fillna(df["薪资"].median(), inplace=True)

# 删除含缺失值的行
df = df.dropna(subset=["姓名", "部门"])

# 类型转换
df["入职日期"] = pd.to_datetime(df["入职日期"])
df["年龄"] = df["年龄"].astype(int)

# 字符串处理
df["姓名"] = df["姓名"].str.strip().str.title()

# 重命名列
df = df.rename(columns={"薪资": "monthly_salary"})
```

## 筛选与查询

```python
# 条件筛选
senior = df[df["年龄"] > 30]
engineers = df[df["部门"] == "工程"]

# 多条件
high_paid_engineers = df[(df["部门"] == "工程") & (df["薪资"] > 15000)]

# query 语法（更简洁）
result = df.query("部门 == '工程' and 薪资 > 15000")

# isin
selected = df[df["部门"].isin(["工程", "产品"])]
```

## 聚合分析

```python
# 按部门统计平均薪资
dept_avg = df.groupby("部门")["薪资"].mean().sort_values(ascending=False)

# 多维聚合
summary = df.groupby("部门").agg(
    人数=("姓名", "count"),
    平均薪资=("薪资", "mean"),
    最高薪资=("薪资", "max"),
)

# 数据透视表
pivot = df.pivot_table(
    values="薪资",
    index="部门",
    columns="年份",
    aggfunc="mean",
    fill_value=0,
)
```

## 简单可视化

```python
import matplotlib.pyplot as plt
import matplotlib
matplotlib.rcParams["font.family"] = "SimHei"  # 支持中文

# 柱状图
dept_avg.plot(kind="bar", title="各部门平均薪资", figsize=(8, 4))
plt.tight_layout()
plt.savefig("dept_salary.png", dpi=150)

# 箱线图（查看分布）
df.boxplot(column="薪资", by="部门", figsize=(8, 5))
plt.show()
```

## 导出数据

```python
df.to_csv("output.csv", index=False, encoding="utf-8-sig")  # utf-8-sig 避免 Excel 乱码
df.to_excel("output.xlsx", index=False, sheet_name="结果")
df.to_json("output.json", orient="records", force_ascii=False)
```

掌握这些操作，80% 的日常数据分析任务都能应付自如。
