# PARALLAX Radar

这个目录是 PARALLAX 的独立 Radar 服务。它暂时放在主仓库里，方便一起设计协议和前端需求；架构上必须保持可拆分，后续可以整体迁移到具备 GPU 的 Linux 工作站，或独立成 `parallax-radar` 仓库。

## 定位

主站负责：

- 用户、AURA 身份、内容发布、讨论、媒体和权限
- PostgreSQL 数据模型和公开 API
- 首页、探索、观测台、个人页和创作台
- 对外稳定运行，不被模型推理和抓取任务拖慢

Radar 负责：

- 抓取 GitHub、arXiv、技术博客、游戏圈、AI 圈、宇宙生命和哲学探索资料
- 清洗、去重、摘要、打分、分类和灰色干扰标记
- RAG、embedding、rerank 和本地模型推理
- 把“好玩的项目”“值得读的新论文”“游戏工作室可参考的机制”回写给 PARALLAX

它不是 AI 助手，也不替用户写文章。它更像 PARALLAX Radar：让社区知道外部世界正在发生什么，再由人决定是否讨论、收藏、写作或做成项目。

两者只通过 HTTP API 和共享密钥连接：

```txt
Radar -> PARALLAX Web API
Authorization: Bearer $RADAR_SHARED_SECRET
```

主站不要 import `services/radar/` 下的代码；Radar 也不要直接连主站数据库。这样以后迁移、扩容、换模型都不影响社区本体。

## 推荐部署

```txt
Linux 主机
  - PARALLAX Web
  - PostgreSQL
  - Valkey / Redis
  - data/uploads
  - 1Panel / Nginx / 内网穿透

具备 GPU 的 Linux 工作站
  - PARALLAX Radar
  - 本地 LLM / embedding / rerank 服务
  - RAG 索引
  - 抓取 worker
  - 调用 PARALLAX API 回写结果
```

## 当前阶段

当前先不做训练。第一阶段目标是：

1. 稳定抓取。
2. 可靠去重。
3. 能判断信息是否有趣、有用、过时或噪声。
4. 能把资料拆成语法流、符号流、语义流。
5. 能给首页和观测台输出真实 World Signals。

训练和微调放到后面，等真实数据积累起来再决定是否必要。

## 最小可运行 Radar

`runner.mjs` 是当前阶段的最小采集进程。它不依赖 Next.js 代码，不直接连接数据库，只通过主站 HTTP API 写入真实资料：

```txt
services/radar/runner.mjs -> /api/radar/heartbeat
services/radar/runner.mjs -> /api/radar/ingest
services/radar/runner.mjs -> /api/radar/signals
```

本机试抓但不写库：

```bash
npm run radar:dry-run
```

真实写入前先准备本地配置：

```bash
cp services/radar/config.local.example.json services/radar/config.local.json
```

然后在主站 `.env` 和 Radar 运行环境里使用同一个密钥：

```txt
RADAR_SHARED_SECRET=一段足够长的随机字符串
PARALLAX_BASE_URL=http://127.0.0.1:3000
GITHUB_TOKEN=可选，但建议配置
```

写入一次真实资料：

```bash
npm run radar:once
```

常驻运行：

```bash
npm run radar:run
```

之后迁到具备 GPU 的 Linux 工作站时，只需要复制 `services/radar/` 目录、安装 Node 22+、配置同样的 `RADAR_SHARED_SECRET` 和公网/内网可访问的 `PARALLAX_BASE_URL`。

## 目录

```txt
services/radar/
  README.md
  config.example.json
  config.local.example.json
  runner.mjs
  docs/
    architecture.md
    deployment-workstation.md
    frontend-contract.md
    source-map.md
```

`services/radar/data`、`services/radar/indexes`、`services/radar/models` 和真实 `.env` 都不进入 git。
