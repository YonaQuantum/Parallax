export const supportedLocales = ["zh-CN", "en-US"] as const;

export type SiteLocale = (typeof supportedLocales)[number];
export type SiteDomainCode =
  | "CODE"
  | "AI_MODELS"
  | "GAME_INTERACTION"
  | "HARDWARE_EMBEDDED"
  | "CREATIVE_MEDIA"
  | "SCIENCE_COSMOS";

type SiteCopy = {
  brand: {
    name: string;
    localName: string;
    logoText: string;
    title: string;
    description: string;
  };
  nav: {
    explore: string;
    signals: string;
    members: string;
    build: string;
    login: string;
    publish: string;
  };
  search: {
    globalPlaceholder: string;
    explorePlaceholder: string;
  };
  hero: {
    eyebrow: string;
    headline: string;
    description: string;
    primaryAction: string;
    secondaryAction: string;
  };
  sections: {
    now: string;
    deck: string;
    deckDescription: string;
    explore: string;
    fromCommunity: string;
    latest: string;
    results: string;
    signals: string;
    tags: string;
    observatory: string;
    all: string;
  };
  explorePage: {
    intro: string;
    noContent: string;
    noQueryResults: string;
    commentCountSuffix: string;
  };
  domains: Record<SiteDomainCode, {
    shortCode: string;
    label: string;
    description: string;
    tags: string[];
    examples: string[];
  }>;
  auth: {
    registerTitle: string;
    loginTitle: string;
    emailSubject: string;
    emailHeading: string;
  };
};

const locale = normalizeLocale(process.env.NEXT_PUBLIC_SITE_LOCALE);
const brandName = readEnv("NEXT_PUBLIC_SITE_NAME", "PARALLAX");
const localName = readEnv("NEXT_PUBLIC_SITE_LOCAL_NAME", "视差社区");
const logoText = readEnv("NEXT_PUBLIC_SITE_LOGO_TEXT", "PX");

const dictionaries: Record<SiteLocale, SiteCopy> = {
  "zh-CN": {
    brand: {
      name: brandName,
      localName,
      logoText,
      title: `${brandName} · ${localName}`,
      description: readEnv(
        "NEXT_PUBLIC_SITE_DESCRIPTION",
        "开源、自托管的综合技术社区，面向编程与开源、AI 与模型、游戏与交互、硬件与嵌入式、创作与媒体、科学与宇宙。"
      )
    },
    nav: {
      explore: "探索",
      signals: "动态",
      members: "名册",
      build: "共建",
      login: "登录",
      publish: "发布"
    },
    search: {
      globalPlaceholder: "搜索文档、视频、成员、研究线索",
      explorePlaceholder: "搜索内容、标签、作者"
    },
    hero: {
      eyebrow: "自托管 · 开放协作 · 面向未来",
      headline: "探索 · 创造 · 共建",
      description: "一个以视差为方法的开放技术社区。\n在这里，代码、创意与思想相遇，推动未来发生。",
      primaryAction: "发布第一篇",
      secondaryAction: "浏览探索"
    },
    sections: {
      now: "New",
      deck: "Deck",
      deckDescription: "六个板块，按深度轮换。内容来自社区发布与 Radar 摄入。",
      explore: "Explore",
      fromCommunity: `From ${brandName}`,
      latest: "Latest",
      results: "Results",
      signals: "Signals",
      tags: "Tags",
      observatory: "观测台",
      all: "全部"
    },
    explorePage: {
      intro: "编程、AI、游戏、硬件、创作与科学。",
      noContent: "还没有公开内容。",
      noQueryResults: "没有找到匹配的公开内容。",
      commentCountSuffix: "条讨论"
    },
    domains: {
      CODE: {
        shortCode: "CODE",
        label: "编程与开源",
        description: "语言、框架、操作系统、数据库、Web、Linux、开源项目、开发工具与工程实践。",
        tags: ["Rust", "Linux", "开源项目"],
        examples: ["Rust 新版本", "GitHub 爆火项目", "新的 CLI 工具"]
      },
      AI_MODELS: {
        shortCode: "AI",
        label: "AI 与模型",
        description: "大模型、多模态、智能体、推理、模型发布、开源模型、训练框架与论文。",
        tags: ["LLM", "智能体", "Hugging Face"],
        examples: ["新模型发布", "推理框架", "多模态论文"]
      },
      GAME_INTERACTION: {
        shortCode: "GAME",
        label: "游戏与交互",
        description: "游戏开发、Godot、UE、Unity、独立游戏、XR、交互设计与实时模拟。",
        tags: ["Godot", "光谱科学", "实时模拟"],
        examples: ["独立游戏技术", "引擎更新", "交互原型"]
      },
      HARDWARE_EMBEDDED: {
        shortCode: "HARDWARE",
        label: "硬件与嵌入式",
        description: "MCU、ESP32、STM32、Linux 板卡、机器人、传感器、芯片、FPGA 与 DIY Hardware。",
        tags: ["ESP32", "机器人", "FPGA"],
        examples: ["新板卡", "传感器项目", "开源硬件"]
      },
      CREATIVE_MEDIA: {
        shortCode: "MEDIA",
        label: "创作与媒体",
        description: "音乐、声音设计、数字艺术、3D、动画、图形、摄影、影视与创作工具。",
        tags: ["Blender", "Audio", "数字艺术"],
        examples: ["生成艺术", "音频技术", "视觉设计工具"]
      },
      SCIENCE_COSMOS: {
        shortCode: "SCIENCE",
        label: "科学与宇宙",
        description: "天文学、航天、物理、数学、生命科学、新材料、科学发现与科研工具。",
        tags: ["天文", "生命科学", "哲学"],
        examples: ["NASA 任务", "系外行星", "宇宙生命讨论"]
      }
    },
    auth: {
      registerTitle: `注册 ${brandName}`,
      loginTitle: `登录 ${brandName}`,
      emailSubject: `验证你的 ${brandName} 账号`,
      emailHeading: `验证你的 ${brandName} 账号`
    }
  },
  "en-US": {
    brand: {
      name: brandName,
      localName,
      logoText,
      title: `${brandName} · ${localName}`,
      description: readEnv(
        "NEXT_PUBLIC_SITE_DESCRIPTION",
        "An open, self-hosted technical community for open source, AI models, games, hardware, creative media, science, and cosmic inquiry."
      )
    },
    nav: {
      explore: "Explore",
      signals: "Signals",
      members: "Members",
      build: "Build",
      login: "Log in",
      publish: "Publish"
    },
    search: {
      globalPlaceholder: "Search documents, media, members, research signals",
      explorePlaceholder: "Search content, tags, authors"
    },
    hero: {
      eyebrow: "Self-hosted · Open collaboration · Future-facing",
      headline: "Explore · Create · Build",
      description: "An open technical community built around parallax thinking.\nCode, craft, and ideas meet here.",
      primaryAction: "Publish",
      secondaryAction: "Explore"
    },
    sections: {
      now: "New",
      deck: "Deck",
      deckDescription: "Six boards in a rotating depth stack. Content comes from community publishing and Radar ingestion.",
      explore: "Explore",
      fromCommunity: `From ${brandName}`,
      latest: "Latest",
      results: "Results",
      signals: "Signals",
      tags: "Tags",
      observatory: "Observatory",
      all: "All"
    },
    explorePage: {
      intro: "Programming, AI, games, hardware, media, and science.",
      noContent: "No public content yet.",
      noQueryResults: "No matching public content found.",
      commentCountSuffix: "comments"
    },
    domains: {
      CODE: {
        shortCode: "CODE",
        label: "Code & Open Source",
        description: "Languages, frameworks, operating systems, databases, Web, Linux, open source projects, tools, and engineering practice.",
        tags: ["Rust", "Linux", "Open Source"],
        examples: ["Rust releases", "Hot GitHub projects", "New CLI tools"]
      },
      AI_MODELS: {
        shortCode: "AI",
        label: "AI & Models",
        description: "LLMs, multimodal systems, agents, inference, model releases, open models, training frameworks, and papers.",
        tags: ["LLM", "智能体", "Hugging Face"],
        examples: ["Model releases", "Inference frameworks", "Multimodal papers"]
      },
      GAME_INTERACTION: {
        shortCode: "GAME",
        label: "Games & Interaction",
        description: "Game development, Godot, Unreal, Unity, indie games, XR, interaction design, and realtime simulation.",
        tags: ["Godot", "Spectral Science", "Simulation"],
        examples: ["Indie game tech", "Engine updates", "Interaction prototypes"]
      },
      HARDWARE_EMBEDDED: {
        shortCode: "HARDWARE",
        label: "Hardware & Embedded",
        description: "MCUs, ESP32, STM32, Linux boards, robotics, sensors, chips, FPGA, and DIY hardware.",
        tags: ["ESP32", "Robotics", "FPGA"],
        examples: ["New boards", "Sensor projects", "Open hardware"]
      },
      CREATIVE_MEDIA: {
        shortCode: "MEDIA",
        label: "Creative Media",
        description: "Music, sound design, digital art, 3D, animation, graphics, photography, film, and creation tools.",
        tags: ["Blender", "Audio", "Digital Art"],
        examples: ["Generative art", "Audio tech", "Visual tools"]
      },
      SCIENCE_COSMOS: {
        shortCode: "SCIENCE",
        label: "Science & Cosmos",
        description: "Astronomy, aerospace, physics, math, life science, materials, discoveries, research tools, and cosmic philosophy.",
        tags: ["Astronomy", "Life Science", "Philosophy"],
        examples: ["NASA missions", "Exoplanets", "Cosmic life"]
      }
    },
    auth: {
      registerTitle: `Register ${brandName}`,
      loginTitle: `Log in to ${brandName}`,
      emailSubject: `Verify your ${brandName} account`,
      emailHeading: `Verify your ${brandName} account`
    }
  }
};

export const site = {
  locale,
  serviceName: readEnv("SITE_SERVICE_NAME", "parallax-community"),
  radarName: readEnv("NEXT_PUBLIC_RADAR_NAME", `${brandName} Radar`),
  theme: {
    accent: readEnv("NEXT_PUBLIC_SITE_ACCENT", "#ffd400"),
    haloAsset: readEnv("NEXT_PUBLIC_HALO_ASSET", "")
  },
  copy: dictionaries[locale]
};

function normalizeLocale(value: string | undefined): SiteLocale {
  return supportedLocales.includes(value as SiteLocale) ? (value as SiteLocale) : "zh-CN";
}

function readEnv(key: string, fallback: string) {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : fallback;
}
