# Radar API 契约

PARALLAX Radar 是社区的外部信息系统。它负责观察公开互联网信息源，识别值得进入社区视野的变化，形成可追溯、可筛选、可讨论的 Signal。Radar 不直接连接主站数据库，不 import 主站代码，只通过 HTTP API 与主站通信。

## 安全边界

所有写入型 Radar 接口都必须携带共享密钥：

```txt
Authorization: Bearer $RADAR_SHARED_SECRET
```

正式部署统一使用 `RADAR_SHARED_SECRET`。真实密钥只放在运行环境中，不提交到仓库。

## 领域枚举

`domain` 使用主站固定枚举：

```txt
CODE                 编程与开源
AI_MODELS            AI 与模型
GAME_INTERACTION     游戏与交互
HARDWARE_EMBEDDED    硬件与嵌入式
CREATIVE_MEDIA       创作与媒体
SCIENCE_COSMOS       科学与宇宙
GENERAL              兜底领域
```

Radar 可以先按六大领域提交。跨领域关系由 `tags` 表达，例如 `["Vulkan", "游戏技术", "实时渲染"]`。

## POST /api/radar/heartbeat

登记 Radar 实例心跳，并按资源状态返回可执行任务。

请求：

```json
{
  "slug": "local-researcher",
  "name": "PARALLAX Radar",
  "heartbeatSeconds": 60,
  "scopes": {
    "sources": ["github-hot-projects", "ai-research"]
  },
  "telemetry": {
    "fps": 60,
    "cpuLoad": 0.32,
    "memoryPressure": 0.41,
    "gpuLoad": 0.48,
    "batteryLevel": 1
  }
}
```

响应：

```json
{
  "radar": {
    "id": "radar-id",
    "slug": "local-researcher",
    "status": "ACTIVE",
    "heartbeatSeconds": 60,
    "lastSeenAt": "2026-08-30T00:00:00.000Z"
  },
  "resource": {
    "loadScore": 0.42,
    "suggestedMode": "normal"
  },
  "tasks": []
}
```

`suggestedMode` 可为 `normal`、`throttle` 或 `suspend_deep_tasks`。Radar 应把它作为调度建议，用于降低非实时任务优先级。

## POST /api/radar/ingest

写入外部条目。主站会去重、分类、标签落库、计算热度，并生成前端可消费的结构化数据。

请求：

```json
{
  "slug": "local-researcher",
  "source": {
    "url": "https://github.com/example/project",
    "title": "GitHub",
    "type": "github-search",
    "trustScore": 0.82
  },
  "title": "example/project",
  "url": "https://github.com/example/project",
  "externalId": "github:example/project",
  "rawText": "Project title, description, language, stars, topics, release notes...",
  "domain": "CODE",
  "tags": ["GitHub", "开源项目", "Rust"],
  "qualityScore": 0.78,
  "metadata": {
    "summary": "短摘要，禁止全文镜像。",
    "sourceName": "GitHub",
    "publishedAt": "2026-08-30T00:00:00.000Z",
    "stars": 12000
  }
}
```

响应：

```json
{
  "artifact": {
    "id": "artifact-id",
    "title": "example/project",
    "domain": "CODE",
    "interference": "CLEAR",
    "heat": 0.78,
    "streamCount": 3,
    "skeletonCount": 2,
    "tags": ["编程与开源", "GitHub", "开源项目", "Rust"]
  }
}
```

`externalId` 应保持稳定。GitHub 建议使用 `github:owner/repo`，arXiv 建议使用 `arxiv:https://arxiv.org/abs/...`，RSS 建议使用原文链接或源内 GUID。

## GET /api/radar/tasks

Radar 拉取待执行任务。

查询参数：

```txt
slug=local-researcher
take=10
```

响应：

```json
{
  "tasks": [
    {
      "id": "task-id",
      "type": "summarize_artifact",
      "priority": "NORMAL",
      "payload": {},
      "scheduledAt": "2026-08-30T00:00:00.000Z",
      "radarId": "radar-resident-id"
    }
  ]
}
```

`radarId` 用于标识任务当前绑定的 Radar 实例。为空表示任意 Radar 实例都可以领取。

## POST /api/radar/tasks

创建 Radar 任务。主理人、版主或持有 Radar 密钥的服务可以调用。

```json
{
  "slug": "local-researcher",
  "type": "inspect_source",
  "priority": "HIGH",
  "payload": {
    "sourceId": "github-hot-projects"
  },
  "scheduledAt": "2026-08-30T00:00:00.000Z"
}
```

## PATCH /api/radar/tasks

回写任务状态、结论或错误。

```json
{
  "id": "task-id",
  "status": "COMPLETED",
  "conclusion": {
    "artifactIds": ["artifact-id"]
  }
}
```

## GET /api/radar/memory

读取 Radar 的未过期工作记忆。

```txt
/api/radar/memory?slug=local-researcher
/api/radar/memory?slug=local-researcher&key=source:github-hot-projects
```

## POST /api/radar/memory

冻结 Radar 当前工作状态或长期索引锚点。

```json
{
  "slug": "local-researcher",
  "key": "source:github-hot-projects",
  "focus": {
    "cursor": "opaque-source-cursor",
    "lastExternalId": "github:example/project"
  },
  "summary": "该来源最近稳定产出开源工具和图形相关项目。",
  "layer": "WORKING",
  "attentionScore": 0.72,
  "ttlSeconds": 604800
}
```

## GET /api/radar/signals

读取公开 Signal。前端可用于观察台或管理视图。

## POST /api/radar/signals

写入需要显式提示的事件。

```json
{
  "slug": "local-researcher",
  "severity": "NOTICE",
  "title": "新模型发布",
  "body": "来自官方发布源的短说明。",
  "payload": {
    "artifactId": "artifact-id",
    "domain": "AI_MODELS"
  },
  "ttlSeconds": 86400
}
```

## GET /api/radar/config

读取主站本地 Radar 配置轮廓。该接口只返回 provider 字段名，不返回真实 key。

```txt
/api/radar/config?slug=local-researcher
```

响应：

```json
{
  "radar": {
    "slug": "local-researcher",
    "name": "PARALLAX Radar",
    "enabled": true,
    "sources": [],
    "providers": {
      "github": ["tokenEnv"]
    }
  }
}
```

## GET /api/observatory/stream

前端读取公开观测流、热力图、领域时钟和摄入成果。

```txt
/api/observatory/stream?take=36
/api/observatory/stream?deep=true
```

该接口不要求 Radar 密钥，只返回可公开展示的数据。

## 外部内容边界

Radar 只保存标题、来源链接、短摘要、标签、热度、去重 ID、外部缩略图 URL 和必要元数据。不要镜像新闻、博客、论文或视频全文；不要下载并重新分发受版权保护的媒体。外部内容在社区内应作为索引、线索和讨论入口，完整阅读回到原站。
