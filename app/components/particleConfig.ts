export interface ParticleConfig {
  preset: "ink" | "stardust" | "firefly";
  maxCount: number;
  speed: number;
  size: number;
  lifespan: number;
  mouseTrail: number;
  burstCount: number;
  linkRadius: number;
  linkOpacity: number;
  glowRadius: number;
  opacity: number;
  drift: number;
}

export const DEFAULT_PARTICLE_CONFIG: ParticleConfig = {
  preset: "ink",
  maxCount: 180,
  speed: 1,
  size: 1,
  lifespan: 1,
  mouseTrail: 0.18,
  burstCount: 18,
  linkRadius: 110,
  linkOpacity: 0.6,
  glowRadius: 220,
  opacity: 1,
  drift: 0,
};

export interface ParticlePreset {
  name: string;
  description: string;
  base: ParticleConfig;
}

export const PARTICLE_PRESETS: ParticlePreset[] = [
  {
    name: "墨韵",
    description: "水墨质感 · 青绿主调 · 笔触沉静",
    base: { ...DEFAULT_PARTICLE_CONFIG, preset: "ink" },
  },
  {
    name: "星尘",
    description: "冷蓝星点 · 明亮短促 · 神秘疏朗",
    base: {
      ...DEFAULT_PARTICLE_CONFIG,
      preset: "stardust",
      maxCount: 240,
      speed: 0.7,
      size: 0.9,
      lifespan: 0.6,
      mouseTrail: 0.12,
      burstCount: 24,
      linkRadius: 90,
      linkOpacity: 0.45,
      glowRadius: 160,
      drift: 0.3,
    },
  },
  {
    name: "萤火",
    description: "暖色微光 · 缓慢漂浮 · 温润生灵",
    base: {
      ...DEFAULT_PARTICLE_CONFIG,
      preset: "firefly",
      maxCount: 140,
      speed: 0.6,
      size: 1.3,
      lifespan: 1.6,
      mouseTrail: 0.22,
      burstCount: 14,
      linkRadius: 70,
      linkOpacity: 0.35,
      glowRadius: 260,
      drift: 0.6,
      opacity: 0.9,
    },
  },
];

export interface TakenParticlesHandle {
  getCount: () => number;
  burst: (x: number, y: number, n?: number) => void;
}
