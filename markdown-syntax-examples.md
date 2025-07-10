# Markdown 语法示例大全

这是一个包含所有标准 Markdown 语法示例的文档。

## 目录

- [标题](#标题)
- [段落和换行](#段落和换行)
- [强调](#强调)
- [列表](#列表)
- [链接](#链接)
- [图片](#图片)
- [代码](#代码)
- [表格](#表格)
- [引用](#引用)
- [分割线](#分割线)
- [其他语法](#其他语法)
  - [Mermaid 图表](#mermaid-图表)

---

## 标题

# 一级标题 (H1)
## 二级标题 (H2)
### 三级标题 (H3)
#### 四级标题 (H4)
##### 五级标题 (H5)
###### 六级标题 (H6)

### 另一种标题语法

一级标题
========

二级标题
--------

---

## 段落和换行

这是一个段落。段落之间用空行分隔。

这是另一个段落。  
如果要在同一段落内换行，在行末添加两个空格。

你也可以用反斜杠换行\
像这样。

---

## 强调

### 斜体

*这是斜体文本*

_这也是斜体文本_

### 粗体

**这是粗体文本**

__这也是粗体文本__

### 粗斜体

***这是粗斜体文本***

___这也是粗斜体文本___

**_混合语法_**

---

## 列表

### 无序列表

- 项目 1
- 项目 2
- 项目 3
  - 嵌套项目 1
  - 嵌套项目 2
    - 更深层嵌套
- 项目 4

或者使用 `*` 或 `+`：

* 星号列表
* 另一项

+ 加号列表
+ 另一项

### 有序列表

1. 第一项
2. 第二项
3. 第三项
   1. 嵌套第一项
   2. 嵌套第二项
4. 第四项

### 任务列表

- [x] 已完成的任务
- [ ] 未完成的任务
- [x] 另一个已完成的任务
- [ ] 待办事项

---

## 链接

### 行内链接

[这是一个链接](https://www.example.com)

[带标题的链接](https://www.example.com "链接标题")

### 引用式链接

[引用式链接][link-ref]

[另一个引用][1]

[link-ref]: https://www.example.com
[1]: https://www.google.com

### 自动链接

<https://www.example.com>

<email@example.com>

### 相对链接

[相对路径链接](./README.md)

---

## 图片

### 行内图片

![Alt 文本](https://via.placeholder.com/150 "图片标题")

### 引用式图片

![Alt 文本][image-ref]

[image-ref]: https://via.placeholder.com/200

### 带链接的图片

[![图片链接](https://via.placeholder.com/100)](https://www.example.com)

---

## 代码

### 行内代码

这是 `行内代码` 示例。

### 代码块

```
这是一个简单的代码块
可以包含多行
```

### 带语法高亮的代码块

```javascript
function greet(name) {
    console.log(`Hello, ${name}!`);
}

greet('World');
```

```python
def greet(name):
    print(f"Hello, {name}!")

greet("World")
```

```html
<!DOCTYPE html>
<html>
<head>
    <title>示例</title>
</head>
<body>
    <h1>Hello World</h1>
</body>
</html>
```

### 缩进代码块

    这是缩进代码块
    使用 4 个空格或 1 个制表符缩进

---

## 表格

### 基本表格

| 姓名 | 年龄 | 城市 |
|------|------|------|
| 张三 | 25   | 北京 |
| 李四 | 30   | 上海 |
| 王五 | 28   | 广州 |

### 对齐表格

| 左对齐 | 居中对齐 | 右对齐 |
|:-------|:--------:|-------:|
| 左     |    中    |     右 |
| 文本   |   文本   |   文本 |

### 复杂表格

| 功能 | 描述 | 状态 |
|------|------|------|
| **粗体** | *斜体* | `代码` |
| [链接](https://example.com) | ![图片](https://via.placeholder.com/20) | ~~删除线~~ |

---

## 引用

### 简单引用

> 这是一个引用块。
> 可以包含多行内容。

### 嵌套引用

> 这是第一层引用
> 
> > 这是嵌套引用
> > 
> > > 更深层的嵌套

### 引用中的其他元素

> ## 引用中的标题
> 
> 1. 引用中的列表
> 2. 第二项
> 
> **粗体文本** 和 *斜体文本*
> 
> ```
> 引用中的代码块
> ```

---

## 分割线

可以使用以下任意一种方式创建分割线：

---

***

___

- - -

* * *

---

## 其他语法

### 删除线

~~这是删除线文本~~

### 下标和上标

H~2~O (下标)

X^2^ (上标)

### 高亮

==高亮文本==

### 脚注

这是一个脚注示例[^1]。

这是另一个脚注[^note]。

[^1]: 这是脚注内容。

[^note]: 
    这是一个更长的脚注。
    可以包含多个段落。
    
    甚至可以包含代码：
    
    ```
    function example() {
        return "脚注中的代码";
    }
    ```

### 缩写

*[HTML]: Hyper Text Markup Language
*[CSS]: Cascading Style Sheets

HTML 和 CSS 是 Web 开发的基础技术。

### 定义列表

Apple
:   水果
:   公司名

Orange
:   水果

### 键盘按键

按 <kbd>Ctrl</kbd> + <kbd>C</kbd> 复制文本。

### 数学公式 (如果支持)

行内公式：$E = mc^2$

块级公式：

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

### Mermaid 图表

Mermaid 是一个基于文本的图表生成工具，支持多种图表类型。

#### 流程图

```mermaid
graph TD
    A[开始] --> B{是否满足条件?}
    B -->|是| C[执行操作A]
    B -->|否| D[执行操作B]
    C --> E[结束]
    D --> E
```

#### 序列图

```mermaid
sequenceDiagram
    participant A as 用户
    participant B as 服务器
    participant C as 数据库
    
    A->>B: 发送请求
    B->>C: 查询数据
    C-->>B: 返回结果
    B-->>A: 响应数据
    
    Note over A,C: 这是一个注释
```

#### 甘特图

```mermaid
gantt
    title 项目时间表
    dateFormat  YYYY-MM-DD
    section 设计阶段
    需求分析           :done,    des1, 2024-01-01,2024-01-05
    UI设计            :done,    des2, 2024-01-06,2024-01-15
    
    section 开发阶段
    前端开发           :active,  dev1, 2024-01-16,2024-02-15
    后端开发           :         dev2, 2024-01-20,2024-02-20
    
    section 测试阶段
    单元测试           :         test1, after dev1, 20d
    集成测试           :         test2, after dev2, 15d
```

#### 饼图

```mermaid
pie title 技术栈分布
    "JavaScript" : 35
    "Python" : 25
    "Java" : 20
    "TypeScript" : 15
    "其他" : 5
```

#### Git图

```mermaid
gitGraph:
    commit id: "Initial"
    branch develop
    checkout develop
    commit id: "Feature-A"
    commit id: "Bugfix"
    checkout main
    merge develop
    commit id: "Release-v1.0"
    branch feature
    checkout feature
    commit id: "New-feature"
    checkout develop
    merge feature
    checkout main
    merge develop
    commit id: "Release-v1.1"
```

#### 用户旅程图

```mermaid
journey
    title 用户购物体验
    section 发现商品
      浏览首页        : 5: 用户
      搜索商品        : 4: 用户
      查看详情        : 3: 用户
    section 购买流程
      添加到购物车     : 4: 用户
      填写订单信息     : 2: 用户
      支付           : 1: 用户
    section 售后服务
      收到商品        : 5: 用户
      评价商品        : 3: 用户
```

#### 状态图

```mermaid
stateDiagram-v2
    [*] --> 空闲
    空闲 --> 运行 : 开始
    运行 --> 暂停 : 暂停
    暂停 --> 运行 : 继续
    运行 --> 完成 : 结束
    完成 --> [*]
    
    运行 --> 错误 : 异常
    错误 --> 空闲 : 重置
```

#### 类图

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +eat()
        +sleep()
    }
    
    class Dog {
        +String breed
        +bark()
    }
    
    class Cat {
        +Boolean indoor
        +meow()
    }
    
    Animal <|-- Dog
    Animal <|-- Cat
    
    class Owner {
        +String name
        +feedPet(Animal pet)
    }
    
    Owner --> Animal : owns
```

#### ER图 (实体关系图)

```mermaid
erDiagram
    CUSTOMER {
        int customer_id PK
        string name
        string email
        date created_at
    }
    
    ORDER {
        int order_id PK
        int customer_id FK
        date order_date
        decimal total_amount
    }
    
    PRODUCT {
        int product_id PK
        string name
        decimal price
        int stock_quantity
    }
    
    ORDER_ITEM {
        int order_id PK,FK
        int product_id PK,FK
        int quantity
        decimal unit_price
    }
    
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--o{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : included_in
```

#### 思维导图

```mermaid
mindmap
  root((项目规划))
    需求分析
      用户调研
      竞品分析
      功能清单
    技术选型
      前端框架
        React
        Vue
        Angular
      后端技术
        Node.js
        Python
        Java
    开发流程
      设计阶段
      编码阶段
      测试阶段
      部署阶段
```

#### 时间线图

```mermaid
timeline
    title 产品发展历程
    
    2020 : 项目启动
         : 团队组建
         
    2021 : MVP发布
         : 用户反馈收集
         : 产品迭代
         
    2022 : 功能扩展
         : 市场推广
         : 用户增长
         
    2023 : 平台优化
         : 国际化
         : 战略合作
         
    2024 : AI集成
         : 移动端优化
         : 生态建设
```

### HTML 标签

你可以在 Markdown 中使用 <mark>HTML 标签</mark>。

<details>
<summary>点击展开详情</summary>

这是隐藏的内容。

- 可以包含任何 Markdown 语法
- **粗体文本**
- `代码`

</details>

### 转义字符

使用反斜杠转义特殊字符：

\*这不是斜体\*

\[这不是链接\]

\`这不是代码\`

---

## 总结

以上就是 Markdown 的主要语法示例。不同的 Markdown 解析器可能支持不同的扩展语法，建议根据你使用的平台（如 GitHub、GitLab、Typora 等）查看相应的文档。

**常用语法速查：**

- `#` 标题
- `**粗体**` 或 `__粗体__`
- `*斜体*` 或 `_斜体_`
- `[链接](URL)`
- `![图片](URL)`
- `` `代码` ``
- `> 引用`
- `- 列表项`
- `1. 有序列表`
- `| 表格 | 列 |`
- ` ```mermaid ` Mermaid图表

**Mermaid 图表类型：**
- `graph` 流程图
- `sequenceDiagram` 序列图
- `gantt` 甘特图
- `pie` 饼图
- `gitgraph` Git图
- `journey` 用户旅程图
- `stateDiagram` 状态图
- `classDiagram` 类图
- `erDiagram` 实体关系图
- `mindmap` 思维导图
- `timeline` 时间线图

---

*最后更新时间：[当前日期]* 