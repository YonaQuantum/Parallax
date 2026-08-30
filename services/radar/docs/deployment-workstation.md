# 具备 GPU 的 Linux 工作站部署设想

独立工作站作为 PARALLAX 的本地研究算力，不直接暴露公网。

## 网络

推荐网络路径：

```txt
GPU 工作站 Radar
  -> HTTPS / 内网地址
  -> PARALLAX Web API
```

如果 GPU 工作站和主站在同一局域网，优先走内网地址；如果不在同一网络，可以让 GPU 工作站访问主站的公网 HTTPS 域名。

## 环境变量

```txt
PARALLAX_BASE_URL=https://你的 PARALLAX 域名
RADAR_SHARED_SECRET=和主站 .env 一致的长随机字符串
RADAR_LLM_ENABLED=true
RADAR_LLM_PROVIDER=openai-compatible
RADAR_LLM_BASE_URL=http://127.0.0.1:11434/v1
RADAR_LLM_API_KEY=可为空或本地服务要求的 key
RADAR_LLM_MODEL=本地服务暴露的模型名
GITHUB_TOKEN=GitHub personal access token
```

## 模型层建议

第一阶段不训练，先使用：

- 本地 LLM：Qwen、Llama、DeepSeek 蒸馏模型或其他适合本地推理的模型。
- Embedding：BGE、Jina、E5 系列本地 embedding。
- Rerank：BGE reranker 或兼容模型。
- 服务方式：Ollama、vLLM、llama.cpp server、text-generation-webui 均可，优先选择稳定和易维护。
- Radar 只要求聊天补全接口兼容 OpenAI `/v1/chat/completions`，模型厂商和运行框架不应写死在业务逻辑里。

## RAG 存储

第一阶段可以在 Radar 机器本地放：

```txt
services/radar/data/raw
services/radar/data/normalized
services/radar/indexes/vector
services/radar/indexes/fulltext
```

后续再决定使用 Qdrant、LanceDB、Milvus 或 PostgreSQL + pgvector。不要把大规模 RAG 索引塞进主站主机，除非数据量很小。

## 守护运行

后续可选：

- systemd service
- Docker Compose
- supervisor

上线前最低要求：

- 自动重启
- 日志轮转
- 失败任务可重试
- 不把 API key 打进日志
- 主站不可达时只本地排队，不丢任务
