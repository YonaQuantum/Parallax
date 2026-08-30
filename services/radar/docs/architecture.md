# Radar 架构

Radar 是独立进程，不属于 Next.js 主站。它可以和主站在同一台机器开发，也可以运行在具备 GPU 的 Linux 工作站上。

## 边界

- Radar 通过主站 HTTP API 写入数据。
- Radar 不直接访问主站 PostgreSQL。
- Radar 不依赖 Next.js、React 或 Prisma Client。
- 主站不 import Radar 代码。
- 共享协议写在文档和 API schema 里，具体实现可以替换。

## 运行环

```txt
load config
  -> heartbeat
  -> pull tasks
  -> tick sources by independent clocks
  -> fetch raw documents
  -> normalize and dedupe
  -> score novelty, relevance, momentum, quality
  -> split streams
  -> summarize or derive skeletons
  -> ingest artifact
  -> emit world signal
  -> persist local RAG index
```

## 模块

- `sources`：GitHub、arXiv、RSS、Hugging Face、游戏资料源、空间科学资料源。
- `collector`：抓取、速率限制、失败重试、来源心跳。
- `normalize`：正文抽取、语言判断、代码块提取、公式提取、链接归一化。
- `dedupe`：稳定外部 ID、相似项合并、历史游标。
- `classify`：六大领域分类、跨领域标签、质量解释。
- `rank`：新颖度、相关性、来源质量、增长动量、社区兴趣、领域多样性。
- `summarize`：短摘要、可读标题、人工接管建议。
- `publisher`：调用 PARALLAX `/api/radar/*` 接口回写。
- `scheduler`：不同来源独立心跳，不强行统一刷新频率。

## 数据原则

- 不伪造研究成果。
- 不自动发帖，不冒充社区成员。
- 不把抓到的全文全部推给前端。
- 原始资料先在 Radar 本地归档，主站只保存摘要、流、骨架、热力和必要引用。
- 低质内容标记为 `GRAY_NOISE`，严重垃圾标记为 `BLOCKED`。
- 对“好玩”的判断必须可解释：为什么值得看、和哪个板块有关、适合谁继续探索。
- Signal 是外部事件的解释层，不是 PARALLAX 自己编造的信息源。

## GPU 工作站的职责

具备 GPU 的工作站适合长期承担：

- 本地模型推理
- embedding 批处理
- rerank
- 大规模网页正文清洗
- GitHub 项目分析
- 游戏原型资料归纳
- 每日/每周研究简报生成

主机只负责稳定对外服务和保存最终结构化结果。
