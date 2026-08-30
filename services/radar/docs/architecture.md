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
  -> collect raw items
  -> normalize RadarItem
  -> exact dedupe by externalId, canonical URL and fingerprint
  -> pre-filter
  -> fetch content within copyright boundaries
  -> optional LLM enrich
  -> semantic cluster
  -> transparent rank
  -> ingest artifact
```

## 模块

- `sources`：GitHub、arXiv、RSS / Atom、Hugging Face feed、普通 Web adapter 边界。
- `collector`：抓取、速率限制、失败重试、来源心跳的后续扩展边界。
- `normalize`：RadarItem 标准化、日期解析、metrics 标准化、链接归一化。
- `dedupe`：source GUID、canonical URL、content fingerprint 精确去重；模糊候选才进入同事件判断。
- `fetch`：正文获取、HTML 到 clean text / Markdown、版权边界控制。
- `llm`：OpenAI-compatible provider、结构化语义增强、同事件判断 prompt。
- `pipeline`：组织 collect、normalize、dedupe、pre-filter、enrich、rank、publish。
- `schemas`：RadarItem、SignalCandidate、EventRelation 等结构契约。
- `classify`：六大领域分类、跨领域标签、质量解释的后续扩展边界。
- `rank`：新颖度、相关性、来源质量、增长动量、社区兴趣、领域多样性。
- `summarize`：短摘要、可读标题、人工接管建议的后续扩展边界。
- `storage`：本地缓存、游标、索引、临时状态和后续 RAG 存储边界。
- `runner.mjs`：不同来源独立心跳，并调用 PARALLAX `/api/radar/*` 接口回写。

## 数据原则

- 不伪造研究成果。
- 不自动发帖，不冒充社区成员。
- 不把抓到的全文全部推给前端。
- 原始资料先在 Radar 本地归档，主站只保存摘要、流、骨架、热力和必要引用。
- 低质内容标记为 `GRAY_NOISE`，严重垃圾标记为 `BLOCKED`。
- 对“好玩”的判断必须可解释：为什么值得看、和哪个板块有关、适合谁继续探索。
- Signal 是外部事件的解释层，不是 PARALLAX 自己编造的信息源。
- 程序负责事实，LLM 负责理解。LLM 不参与 HTTP 获取、精确去重、日期解析、调度、限流和基础 ranking。
- LLM 必须可关闭；关闭后 Radar 仍可用启发式摘要、分类和排序继续运行。
- LLM 失败、超时或输出格式错误时，只跳过语义增强，不中断整轮采集。

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
