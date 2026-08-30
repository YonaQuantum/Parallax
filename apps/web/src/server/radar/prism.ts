import "server-only";

import { createHash } from "node:crypto";
import {
  KnowledgeDomain,
  KnowledgeInterference,
  KnowledgeStreamKind
} from "@prisma/client";

export type ResourceInput = {
  fps?: number;
  cpuLoad?: number;
  memoryPressure?: number;
  gpuLoad?: number;
  batteryLevel?: number;
};

export function digestText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function classifyDomain(input: string): KnowledgeDomain {
  const text = input.toLowerCase();

  if (/(llm|large language model|multimodal|transformer|diffusion|agent|rag|inference|embedding|hugging face|openai|anthropic|gemini|qwen|llama|模型|多模态|智能体|推理|训练|论文)/.test(text)) {
    return KnowledgeDomain.AI_MODELS;
  }

  if (/(game|unity|unreal|godot|xr|vr|ar|simulation|interactive|玩法|关卡|游戏|交互|实时模拟|引擎)/.test(text)) {
    return KnowledgeDomain.GAME_INTERACTION;
  }

  if (/(mcu|esp32|stm32|raspberry|fpga|robot|sensor|embedded|pcb|arduino|硬件|嵌入式|机器人|传感器|芯片|树莓派|电路)/.test(text)) {
    return KnowledgeDomain.HARDWARE_EMBEDDED;
  }

  if (/(shader|render|pipeline|gpu|vulkan|opengl|directx|blender|music|audio|fft|synth|midi|photography|animation|渲染|管线|音乐|音频|频谱|视觉|动画|摄影|影视|数字艺术|创作)/.test(text)) {
    return KnowledgeDomain.CREATIVE_MEDIA;
  }

  if (/(space|cosmos|nasa|planet|telescope|astronomy|physics|biology|material|spectral|spectrum|philosophy|consciousness|fermi|宇宙|航天|天文|物理|数学|生命|材料|光谱|色散|波长|意识|哲学|费米悖论|宇宙生命)/.test(text)) {
    return KnowledgeDomain.SCIENCE_COSMOS;
  }

  if (/(typescript|python|rust|c\\+\\+|linux|kernel|database|postgres|react|vue|cli|github|open source|code|代码|编程|开源|数据库|操作系统|框架|工程)/.test(text)) {
    return KnowledgeDomain.CODE;
  }

  return KnowledgeDomain.GENERAL;
}

export function splitKnowledgeStreams(rawText: string) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const syntax: string[] = [];
  const symbol: string[] = [];
  const semantic: string[] = [];

  for (const line of lines) {
    if (isCodeLine(line)) {
      syntax.push(line);
      continue;
    }

    if (isSymbolLine(line)) {
      symbol.push(line);
      continue;
    }

    semantic.push(line);
  }

  return [
    {
      kind: KnowledgeStreamKind.SYNTAX,
      content: syntax.join("\n"),
      weight: syntax.length ? 1 : 0
    },
    {
      kind: KnowledgeStreamKind.SYMBOL,
      content: symbol.join("\n"),
      weight: symbol.length ? 0.85 : 0
    },
    {
      kind: KnowledgeStreamKind.SEMANTIC,
      content: semantic.join("\n"),
      weight: semantic.length ? 0.7 : 0
    }
  ].filter((stream) => stream.content.length > 0);
}

export function deriveSkeletons(rawText: string) {
  const lines = rawText.split(/\r?\n/).filter(Boolean);
  const peaks = lines
    .map((line, index) => ({ index, weight: Math.min(1, line.length / 160) }))
    .filter((point) => point.weight > 0.4)
    .slice(0, 48);

  return [
    {
      kind: KnowledgeStreamKind.SEMANTIC,
      payload: {
        lineCount: lines.length,
        peaks
      }
    }
  ];
}

export function scoreInterference(rawText: string, qualityScore: number) {
  if (qualityScore < 0.2) {
    return KnowledgeInterference.BLOCKED;
  }

  const noiseSignals = (rawText.match(/转载|广告|spam|低价|破解|标题党/gi) ?? []).length;

  if (qualityScore < 0.42 || noiseSignals >= 2) {
    return KnowledgeInterference.GRAY_NOISE;
  }

  return KnowledgeInterference.CLEAR;
}

export function computeHeat(qualityScore: number, createdAt = new Date()) {
  const ageHours = Math.max(0, (Date.now() - createdAt.getTime()) / 1000 / 60 / 60);
  const freshness = Math.max(0.15, 1 - ageHours / 168);
  return Number(Math.min(1, Math.max(0, qualityScore * 0.72 + freshness * 0.28)).toFixed(4));
}

export function computeResourceMode(sample: ResourceInput) {
  const values = [
    sample.cpuLoad,
    sample.memoryPressure,
    sample.gpuLoad,
    sample.fps !== undefined ? Math.max(0, 1 - sample.fps / 60) : undefined
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  const loadScore =
    values.length > 0
      ? Number((values.reduce((total, value) => total + clamp01(value), 0) / values.length).toFixed(4))
      : 0;

  if (loadScore >= 0.82) {
    return { loadScore, suggestedMode: "suspend_deep_tasks" };
  }

  if (loadScore >= 0.62) {
    return { loadScore, suggestedMode: "throttle" };
  }

  return { loadScore, suggestedMode: "normal" };
}

function isCodeLine(line: string) {
  return /(;|=>|const |let |fn |class |import |export |#include|def |if \(|for \(|while \(|return )/.test(line);
}

function isSymbolLine(line: string) {
  return /(\\\(|\\\[|[∑∫≈≤≥√∞]|[a-zA-Z]\s*=\s*.+|\\frac|\\alpha|\\beta)/.test(line);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
