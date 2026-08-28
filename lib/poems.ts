import fs from "fs";
import path from "path";

// 诗歌对象结构
export interface Poem {
  id: string;
  title: string;
  author: string;
  section: string;
  dynasty: string;
  type?: string;
  creationTime?: string;
  background?: string;
  content: string[];
  theme?: string[];
  sourceFile: string;
  likes: number;
  location?: {
    name: string;
    city: string;
    province: string;
    coordinates: [number, number];
  };
}

// 原始数据结构
export interface RawPoem {
  id?: string;
  title: string;
  content?: string[] | string;
  paragraphs?: string[] | string;
  paragraph?: string[] | string;
  text?: string[] | string;
  poet?: string;
  author?: string;
  dynasty?: string;
  type?: string;
  creationTime?: string;
  background?: string;
  section?: string;
  theme?: string[];
  likedCount?: number;
  location?: {
    name: string;
    city: string;
    province: string;
    coordinates: [number, number];
  };
}

let mapPoemsCache: Poem[] | null = null;
let rawMapPoemsCache: RawPoem[] | null = null;

// 朝代别名映射
export const DYNASTY_ALIAS: Record<string, string> = {
  唐: "tang",
  唐代: "tang",
  tang: "tang",
  宋: "song",
  宋代: "song",
  song: "song",
  推荐: "recommend",
  recommend: "recommend",
};

// 反向映射：标准键到中文
export const DYNASTY_DISPLAY: Record<string, string> = {
  tang: "唐代",
  song: "宋代",
  recommend: "推荐",
};

// 数据缓存
let poemsCache: {
  tang: Poem[];
  song: Poem[];
  recommend: Poem[];
  all: Poem[];
} | null = null;

let likesCache: Record<string, { likes: number }> | null = null;

// 规范化内容
function normalizeContent(raw: RawPoem): string[] {
  let content: string[] = [];

  const rawContent = raw.content || raw.paragraphs || raw.paragraph || raw.text;

  if (Array.isArray(rawContent)) {
    content = rawContent.map((s) => String(s).trim()).filter(Boolean);
  } else if (typeof rawContent === "string") {
    // 先按换行切分
    const lines = rawContent.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (lines.length > 1) {
      content = lines;
    } else if (lines.length === 1) {
      // 按中文标点断句
      content = lines[0].split(/(?<=[。！？；])/).map((s) => s.trim()).filter(Boolean);
    }
  }

  return content;
}

// 规范化单首诗
function normalizePoem(raw: RawPoem, dynasty: string, sourceFile: string): Poem {
  const content = normalizeContent(raw);
  const author = raw.poet || raw.author || "佚名";
  const title = raw.title || "无题";
  const id = raw.id || `${dynasty}:${title}:${author}`;

  return {
    id,
    title,
    author,
    section: raw.section || "",
    dynasty,
    type: raw.type,
    creationTime: raw.creationTime,
    background: raw.background,
    content,
    theme: raw.theme || [],
    sourceFile,
    likes: 0,
    location: raw.location,
  };
}

// 加载 JSON 文件
function loadJsonFile<T>(filePath: string): T | null {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    const data = fs.readFileSync(fullPath, "utf-8");
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`加载文件失败: ${filePath}`, error);
    return null;
  }
}

// 加载点赞数据
export function loadLikes(): Record<string, { likes: number }> {
  if (likesCache) return likesCache;

  const likes = loadJsonFile<Record<string, { likes: number }>>("data/likes_state.json");
  likesCache = likes || {};
  return likesCache;
}

// 保存点赞数据
export function saveLikes(likes: Record<string, { likes: number }>): boolean {
  try {
    const filePath = path.join(process.cwd(), "data/likes_state.json");
    const tempPath = filePath + ".tmp";
    fs.writeFileSync(tempPath, JSON.stringify(likes, null, 2), "utf-8");
    fs.renameSync(tempPath, filePath);
    likesCache = likes;
    return true;
  } catch (error) {
    console.error("保存点赞数据失败:", error);
    return false;
  }
}

// 获取诗歌点赞数
function getPoemLikes(id: string): number {
  const likes = loadLikes();
  return likes[id]?.likes || 0;
}

function loadMapPoems(): Poem[] {
  if (process.env.NODE_ENV === "production" && mapPoemsCache) return mapPoemsCache;

  const result: Poem[] = [];
  const mapData = loadJsonFile<RawPoem[]>("data/map_poems.json");

  if (mapData) {
    rawMapPoemsCache = mapData;
    mapData.forEach((raw) => {
      const poem = normalizePoem(raw, raw.dynasty || "", "data/map_poems.json");
      poem.likes = getPoemLikes(poem.id);
      result.push(poem);
    });
  }

  mapPoemsCache = result;
  return result;
}

export function loadRawMapPoems(): RawPoem[] {
  if (process.env.NODE_ENV === "production" && rawMapPoemsCache) return rawMapPoemsCache;

  const mapData = loadJsonFile<RawPoem[]>("data/map_poems.json") || [];
  rawMapPoemsCache = mapData;
  return mapData;
}

export const STAGE_PREFIX_MAP: Record<string, string | null> = {
  all: null,
  xiao: "xiao",
  primary: "xiao",
  "小学": "xiao",
  chu: "chu",
  junior: "chu",
  "初中": "chu",
  gao: "gao",
  senior: "gao",
  "高中": "gao",
};

export const STAGE_NAME_MAP: Record<string, string> = {
  xiao: "小学",
  chu: "初中",
  gao: "高中",
};

export function resolveStagePrefix(stage: string): string | null {
  return STAGE_PREFIX_MAP[stage.trim()] ?? null;
}

export function getRawMapPoemsByStage(stage: string, count?: number) {
  const stagePrefix = resolveStagePrefix(stage);
  const allPoems = loadRawMapPoems();
  const filteredPoems = stagePrefix
    ? allPoems.filter((poem) => String(poem.id || "").startsWith(stagePrefix))
    : allPoems;
  const normalizedCount = count && count > 0 ? Math.min(count, 500) : null;
  const poems = normalizedCount ? filteredPoems.slice(0, normalizedCount) : filteredPoems;

  return {
    poems,
    stageKey: stagePrefix,
    total: filteredPoems.length,
    returned: poems.length,
  };
}

// 加载所有诗歌数据
export function loadPoems() {
  if (process.env.NODE_ENV === "production" && poemsCache) return poemsCache;

  const tang: Poem[] = [];
  const song: Poem[] = [];
  const recommend: Poem[] = [];

  // 加载唐诗
  const tangData = loadJsonFile<RawPoem[]>("data/tangshi.json");
  if (tangData) {
    tangData.forEach((raw) => {
      const poem = normalizePoem(raw, "tang", "data/tangshi.json");
      poem.likes = getPoemLikes(poem.id);
      tang.push(poem);
    });
  }

  // 加载宋词
  const songData = loadJsonFile<RawPoem[]>("data/songci.json");
  if (songData) {
    songData.forEach((raw) => {
      const poem = normalizePoem(raw, "song", "data/songci.json");
      poem.likes = getPoemLikes(poem.id);
      song.push(poem);
    });
  }

  // 加载推荐
  const likeData = loadJsonFile<RawPoem[]>("data/like.json");
  if (likeData) {
    likeData.forEach((raw) => {
      // 推荐数据保留原始朝代
      const poem = normalizePoem(raw, raw.dynasty || "recommend", "data/like.json");
      poem.likes = getPoemLikes(poem.id);
      recommend.push(poem);
    });
  }

  const all = [...tang, ...song, ...recommend];

  poemsCache = { tang, song, recommend, all };
  return poemsCache;
}

// 随机抽样
export function randomSample<T>(arr: T[], count: number): T[] {
  if (count >= arr.length) return [...arr];
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// 根据朝代获取诗歌列表
export function getPoemsByDynasty(dynasty: string): Poem[] {
  const data = loadPoems();
  const key = DYNASTY_ALIAS[dynasty];
  
  if (key === "tang") return data.tang;
  if (key === "song") return data.song;
  if (key === "recommend") return data.recommend;
  
  return data.all;
}

// 根据 ID 获取单首诗
export function getPoemById(id: string): Poem | null {
  const mapPoem = loadMapPoems().find((p) => p.id === id);
  if (mapPoem) return { ...mapPoem, likes: getPoemLikes(mapPoem.id) };

  const poem = loadPoems().all.find((p) => p.id === id);
  if (poem) return { ...poem, likes: getPoemLikes(poem.id) };

  return null;
}

// 按学段获取诗词
export function getPoemsByStage(stage: string, count: number = 5): { poems: Poem[]; stageKey: string; total: number } {
  const stageKey = resolveStagePrefix(stage) ?? stage;

  const filtered = loadMapPoems().filter((p) => p.id.startsWith(stageKey));
  const poems = randomSample(filtered, count).map((p) => ({
    ...p,
    likes: getPoemLikes(p.id),
  }));

  return { poems, stageKey, total: filtered.length };
}

// 按作者搜索
export function searchByAuthor(name: string, dynasty?: string, count: number = 20): Poem[] {
  let poems = dynasty ? getPoemsByDynasty(dynasty) : loadPoems().all;
  const filtered = poems.filter((p) => p.author.includes(name));
  return randomSample(filtered, count).map((p) => ({ ...p, likes: getPoemLikes(p.id) }));
}

// 按主题搜索
export function searchByTheme(themes: string[], dynasty?: string, count: number = 20): Poem[] {
  let poems = dynasty ? getPoemsByDynasty(dynasty) : loadPoems().all;
  
  const filtered = poems.filter((p) => {
    const text = `${p.title} ${p.section} ${p.content.join(" ")} ${(p.theme || []).join(" ")}`;
    return themes.some((theme) => text.includes(theme));
  });
  
  return randomSample(filtered, count).map((p) => ({ ...p, likes: getPoemLikes(p.id) }));
}

// 按标题搜索
export function searchByTitle(title: string, dynasty?: string, count: number = 20): Poem[] {
  let poems = dynasty ? getPoemsByDynasty(dynasty) : loadPoems().all;
  const filtered = poems.filter((p) => p.title.includes(title));
  return randomSample(filtered, count).map((p) => ({ ...p, likes: getPoemLikes(p.id) }));
}

// 综合搜索
export function searchPoems(query: string, count: number = 20): Poem[] {
  const keyword = query.trim();
  if (!keyword) return [];

  const data = loadPoems();

  const filtered = data.all.filter((p) => {
    const titleHit = p.title.includes(keyword);
    const authorHit = p.author.includes(keyword);
    return titleHit || authorHit;
  });

  return randomSample(filtered, count).map((p) => ({ ...p, likes: getPoemLikes(p.id) }));
}

// 更新点赞
export function updateLikes(id: string, action: "like" | "unlike"): { id: string; likes: number } | null {
  const poem = getPoemById(id);
  if (!poem) return null;
  
  const likesData = loadLikes();
  
  if (!likesData[id]) {
    likesData[id] = { likes: 0 };
  }
  
  if (action === "like") {
    likesData[id].likes += 1;
  } else {
    likesData[id].likes = Math.max(0, likesData[id].likes - 1);
  }
  
  saveLikes(likesData);
  
  return { id, likes: likesData[id].likes };
}

// 获取统计信息
export function getStats() {
  const data = loadPoems();
  return {
    tang: data.tang.length,
    song: data.song.length,
    recommend: data.recommend.length,
    total: data.all.length,
  };
}

// 统一响应格式
export function createResponse<T>(code: number, message: string, data: T, meta?: Record<string, unknown>) {
  return {
    code,
    message,
    data,
    meta: {
      ts: Date.now(),
      ...meta,
    },
  };
}
