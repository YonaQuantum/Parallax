# Radar 架构

Radar 的工程定位不是聊天助手，而是“外部世界到社区 New 信息流”的信息系统：观察公开来源，提取真实变化，去重、分类、排序、摘要，然后通过主站 API 写入可追溯的 Signal。

## 目录

```txt
services/radar/
  sources/          GitHub / arXiv / RSS / Hugging Face 等来源适配
  collector/        抓取与速率控制
  normalize/        结构标准化、正文清洗、链接归一化
  dedupe/           去重、相似项合并、历史游标
  classify/         领域分类、跨领域标签、质量解释
  rank/             Signal 排序、新鲜度、热度、来源可信度
  summarize/        摘要、可读标题、人工接管建议
  runner.mjs        第一阶段最小可运行采集进程
  config.example.json
  config.local.example.json
```

当前主站 API 由 `apps/web/src/app/api` 提供，`apps/api` 保留为未来独立 API 服务边界。Radar 不直接连接 PostgreSQL，不依赖 Prisma Client，不读取 Next.js 内部模块。

## 数据流

```txt
source schedule
  -> collect raw item
  -> normalize
  -> dedupe by stable externalId
  -> classify domain and tags
  -> rank by freshness, quality, source trust and community fit
  -> summarize without copying full text
  -> POST /api/radar/ingest
  -> optional POST /api/radar/signals
```

社区内部新内容和 Radar 外部条目在首页 `New` 合流。排序以新鲜度和质量为主，并保持六大领域的曝光均衡。

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
