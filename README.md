# 提示词工程台（Prompt Lab）

一个本地优先（local-first）的提示词工程工作台，用于解决 Prompt 开发中最常见的三个问题：

- 复用困难：Prompt 只能复制粘贴，难以模板化
- 验证困难：改了一版 Prompt，不知道是变好还是变差
- 迭代困难：缺少版本比较与回归基线

本项目不是“可视化拼接玩具”，而是一个轻量 Prompt QA 工具。

## 项目目标

让团队可以围绕同一个 Prompt 模板完成完整闭环：

1. 模板化（Template + Variables）
2. 批量验证（Test Cases + Checks）
3. 版本化（Version Snapshot + Diff）
4. 持续迭代（Regression-aware）

## 当前功能

- 模板编辑：支持 `{{变量名}}` 占位符
- 变量契约：必填、默认值、说明
- 测试用例：多用例输入、必含短语、禁用短语、长度限制
- 结果评估：逐项校验 + 得分
- 版本管理：保存版本、对比模板变化与变量变化
- 本地持久化：自动存储到浏览器 `localStorage`

## 页面说明

- 模板编辑区：编写 Prompt 模板并查看字数/行数
- 变量契约：管理每个变量的输入规则
- 测试用例：维护不同业务场景的输入与约束
- 运行结果：查看每个用例得分和失败原因，支持复制结果
- 版本管理：保存当前模板并进行版本差异比较

## 快速开始

### 1) 安装依赖

```bash
npm install
```

### 2) 启动开发环境

```bash
npm run dev
```

默认访问地址：

`http://localhost:5173`

### 3) 代码检查与构建

```bash
npm run lint
npm run build
```

## 技术栈

- React 19
- TypeScript
- Vite
- Mantine UI

## 目录结构（核心）

```text
src/
  App.tsx                      # 页面编排与交互入口
  domain/
    template.ts                # 变量提取、模板渲染
    evaluation.ts              # 规则检查、得分计算
    versioning.ts              # 版本快照与差异计算
  storage/
    promptLabStorage.ts        # localStorage 读写
  types/
    promptLab.ts               # 领域类型定义
```

## 协作与交接

请先阅读：

1. `README.md`（本文件）
2. `ENGINEERING_HANDOFF.md`（完整重构待办、实现计划、验收标准）

## 已知边界

- 当前为本地优先，不含后端同步
- 当前不直接调用模型 API
- 校验规则以文本规则为主，后续可扩展为自定义评估器

## 后续规划（简版）

- 引入测试框架并补齐领域层单元测试
- 增加运行历史、基线版本、回归分数对比
- 支持 JSON 导入导出与数据迁移
- 增加团队协作能力（云端存储/共享）

---

如果你是新接手工程师，建议先跑一遍本地流程：

1. 编辑模板
2. 同步变量
3. 新建测试用例
4. 运行验证
5. 保存版本并对比

完成以上 5 步后，再进入下一阶段重构。
