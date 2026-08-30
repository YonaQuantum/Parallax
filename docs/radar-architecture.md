# Radar 架构

Radar 的工程定位不是聊天助手，而是“外部世界到社区 New 信息流”的信息系统：观察公开来源，提取真实变化，去重、分类、排序、摘要，然后通过主站 API 写入可追溯的 Signal。

## 目录

```txt
services/radar/
  sources/          GitHub / arXiv / RSS / Hugging Face 等来源适配
  collector/        抓取与速率控制
  normalize/        结构标准化、正文清洗、链接归一化
  dedupe/           去重、相似项合并、历史游标
  fetch/            正文获取、网页清洗、内容边界控制
  llm/              可拔掉的语义理解 provider、prompt 和结构化增强
  pipeline/         collect -> normalize -> dedupe -> enrich -> rank
  schemas/          RadarItem、SignalCandidate 等数据契约
  classify/         领域分类、跨领域标签、质量解释
  rank/             Signal 排序、新鲜度、热度、来源可信度
  summarize/        摘要、可读标题、人工接管建议
  storage/          本地缓存、游标、索引和临时状态
  runner.mjs        第一阶段最小可运行采集进程
  config.example.json
  config.local.example.json
```

当前主站 API 由 `apps/web/src/app/api` 提供，`apps/api` 保留为未来独立 API 服务边界。Radar 不直接连接 PostgreSQL，不依赖 Prisma Client，不读取 Next.js 内部模块。

## 数据流

```txt
互联网
  -> Sources
  -> Collector
  -> Normalize
  -> Exact Dedupe
  -> Pre-filter
  -> Content Fetch
  -> LLM Enrich
  -> Semantic Cluster
  -> Rank
  -> Signal
  -> Parallax 首页
```

程序负责事实，LLM 负责理解。

不使用 LLM 完成 HTTP 获取、RSS 解析、日期解析、URL 归一化、GitHub stars 统计、精确去重、调度、缓存、重试、限流和基础 ranking。LLM 只用于分类、topics、短摘要、关注理由、新颖度、编辑兴趣，以及模糊情况下的同事件判断。

社区内部新内容和 Radar 外部条目在首页 `New` 合流。排序以新鲜度、增长动量、来源质量、新颖度、社区适配度和编辑兴趣为主，并保持六大领域的曝光均衡。

## 核心数据对象

抓到的信息不是 Signal。Radar 先把不同来源统一成 `RadarItem`：

```ts
type RadarItem = {
  id: string;
  source: string;
  sourceType: string;
  title: string;
  url?: string;
  canonicalUrl: string;
  author?: string;
  publishedAt?: string;
  fetchedAt: string;
  excerpt?: string;
  content?: string;
  thumbnailUrl?: string;
  metrics?: {
    stars?: number;
    starsDelta24h?: number;
    downloads?: number;
    comments?: number;
    score?: number;
  };
  rawMetadata: unknown;
  fingerprint: string;
};
```

经过预过滤和语义增强后生成 `SignalCandidate`：

```ts
type SignalCandidate = {
  itemId: string;
  primaryCategory: "code" | "ai" | "game" | "hardware" | "create" | "science";
  topics: string[];
  summary: string;
  whyItMatters: string;
  novelty: number;
  editorialInterest: number;
  confidence: number;
  language: string;
  evidence: string[];
  flags: string[];
  duplicateOf?: string;
};
```

`primaryCategory` 只决定一级入口；跨领域关系通过 `topics` 表达。为了兼容第一阶段主站 ingest 元数据，Radar 运行时也会保留同值的 `category` 字段，但新代码应优先读取 `primaryCategory`。

只有通过去重、预过滤和 ranking 的候选才进入首页展示。

## 透明排序

第一阶段使用可解释公式，不把排序完全交给模型：

```txt
SignalScore =
  0.25 * Recency
+ 0.20 * Momentum
+ 0.15 * SourceQuality
+ 0.15 * Novelty
+ 0.15 * CommunityFit
+ 0.10 * EditorialInterest
```

`Recency`、`Momentum` 和 `SourceQuality` 由程序计算；`Novelty` 和 `EditorialInterest` 可以由 LLM 辅助，但必须保留输入证据和置信度。

## 六大领域

- 编程与开源：语言、框架、操作系统、数据库、Web、Linux、开源项目、开发工具、工程实践。
- AI 与模型：大模型、多模态、智能体、推理、模型发布、开源模型、训练、推理框架、论文。
- 游戏与交互：Godot、Unreal、Unity、独立游戏、XR、交互设计、实时模拟、游戏技术。
- 硬件与嵌入式：MCU、ESP32、STM32、Linux 板卡、机器人、电子、传感器、芯片、Raspberry Pi、FPGA。
- 创作与媒体：音乐、声音设计、数字艺术、3D、动画、图形、摄影、影视、创作工具。
- 科学与宇宙：天文学、航天、物理、数学、生命科学、新材料、科学发现、科研工具、宇宙生命与哲学探索。

## 是否需要大模型

上线第一阶段不把大模型作为硬依赖。基础链路由来源配置、稳定 ID、关键词规则、来源可信度、发布时间、热度和去重策略完成。大模型作为增强层，用于：

- 生成短摘要。
- 提炼“为什么值得看”。
- 补充跨领域标签。
- 判断噪声和重复内容。
- 给出人工接管建议。

这样即使模型服务暂时不可用，Radar 仍能抓取和写入基础 Signal。

LLM provider 使用 OpenAI-compatible 抽象：

```txt
RADAR_LLM_ENABLED=true
RADAR_LLM_PROVIDER=openai-compatible
RADAR_LLM_BASE_URL=https://api.deepseek.com
RADAR_LLM_API_KEY=只放在运行环境
RADAR_LLM_MODEL=deepseek-chat
```

关闭 `RADAR_LLM_ENABLED` 时，Radar 必须继续可运行：来源抓取、URL 归一、日期解析、精确去重、基础分类、摘要 fallback 和 Hybrid Ranking 都由程序完成。LLM 出错、超时或结构化输出校验失败时，只跳过当前语义增强，不停止整轮 pipeline。

缩略图来自来源 feed、GitHub API、网页 `og:image` 或 `twitter:image`。主站只保存图片 URL 作 Signal 展示，不下载、不镜像外部图片，也不把图片当作本站原创素材。

## GitHub 个人页同步

用户绑定 GitHub 后，个人页展示的是用户明确选择公开的项目，不属于公共 Radar 信息流。

推荐流程：

1. 用户通过 OAuth 绑定 GitHub。
2. 后端只申请读取公开资料和仓库列表所需的最小权限。
3. 用户选择要展示的仓库。
4. 同步任务定时刷新仓库名、简介、语言、stars、topics、更新时间。
5. 个人页只展示用户选择过的项目。

公共 Radar 可以同样读取 GitHub Trending 或 Search API，但它写入的是外部公共 Signal；用户项目同步写入 `UserExternalProject`。两条线共享 provider，不共享权限和数据表。

## 合规边界

Radar 更接近研究索引和社区讨论入口，而不是内容搬运平台。对外部来源统一遵守：

- 展示标题、来源、短摘要、标签和原文链接。
- 不镜像全文。
- 不重新分发受版权保护的图片、视频和附件。
- 不伪装成本站原创。
- 不绕过公开 API 的速率限制。

## 部署边界

主站负责用户、内容、讨论、媒体、权限和公开页面。Radar 可以运行在同一台服务器，也可以运行在具备 GPU 的独立工作站。两者通过 `PARALLAX_BASE_URL` 和 `RADAR_SHARED_SECRET` 连接。
