'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { getScores, updateScore } from '@/lib/gameScores';

// ============ 类型定义 ============
type GameState = 'menu' | 'playing' | 'paused' | 'over' | 'win';

interface Fruit {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  type: FruitType;
  sliced: boolean;
  color: string;
  emoji: string;
}

interface FruitHalf {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  emoji: string;
  radius: number;
  life: number;
  side: 'left' | 'right';
}

interface Bomb {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  sliced: boolean;
  life: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface SlashSegment {
  x: number;
  y: number;
  t: number;
}

interface FloatingScore {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  vy: number;
}

type FruitType = 'apple' | 'orange' | 'watermelon' | 'pineapple' | 'banana' | 'strawberry' | 'kiwi' | 'peach';

interface LevelConfig {
  id: number;
  name: string;
  description: string;
  targetScore: number;
  spawnInterval: number;
  minBatchSize: number;
  maxBatchSize: number;
  bombChance: number;
  gravity: number;
  launchPowerMin: number;
  launchPowerMax: number;
  timeLimit: number;
}

// ============ 关卡配置 ============
const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: '苹果园',
    description: '悠闲入门，切到 50 分过关',
    targetScore: 50,
    spawnInterval: 1300,
    minBatchSize: 1,
    maxBatchSize: 2,
    bombChance: 0.05,
    gravity: 0.32,
    launchPowerMin: 12,
    launchPowerMax: 15,
    timeLimit: 60,
  },
  {
    id: 2,
    name: '柑橘林',
    description: '节奏加快，小心炸弹，目标 100 分',
    targetScore: 100,
    spawnInterval: 1000,
    minBatchSize: 1,
    maxBatchSize: 3,
    bombChance: 0.1,
    gravity: 0.34,
    launchPowerMin: 13,
    launchPowerMax: 16,
    timeLimit: 60,
  },
  {
    id: 3,
    name: '热带雨林',
    description: '多水果齐飞，目标 150 分',
    targetScore: 150,
    spawnInterval: 750,
    minBatchSize: 2,
    maxBatchSize: 4,
    bombChance: 0.13,
    gravity: 0.36,
    launchPowerMin: 14,
    launchPowerMax: 17,
    timeLimit: 60,
  },
  {
    id: 4,
    name: '终极考验',
    description: '极速狂轰，炸弹频现，目标 200 分',
    targetScore: 200,
    spawnInterval: 550,
    minBatchSize: 2,
    maxBatchSize: 5,
    bombChance: 0.18,
    gravity: 0.38,
    launchPowerMin: 15,
    launchPowerMax: 18,
    timeLimit: 70,
  },
];

const FRUIT_TYPES: { type: FruitType; color: string; emoji: string; score: number }[] = [
  { type: 'apple', color: '#ef4444', emoji: '🍎', score: 1 },
  { type: 'orange', color: '#f97316', emoji: '🍊', score: 1 },
  { type: 'watermelon', color: '#22c55e', emoji: '🍉', score: 2 },
  { type: 'pineapple', color: '#eab308', emoji: '🍍', score: 2 },
  { type: 'banana', color: '#facc15', emoji: '🍌', score: 1 },
  { type: 'strawberry', color: '#ec4899', emoji: '🍓', score: 2 },
  { type: 'kiwi', color: '#84cc16', emoji: '🥝', score: 2 },
  { type: 'peach', color: '#fb7185', emoji: '🍑', score: 1 },
];

const MAX_LIVES = 3;
const SLASH_TRAIL_LIFETIME = 180;
// ===== 性能调优常量 =====
const SLICE_CHECK_MIN_INTERVAL = 16; // 碰撞检测最小间隔(ms),约一帧
const MAX_PARTICLES = 220;            // 粒子数量上限,防止过载
const MAX_HALVES = 40;                // 半片上限
const MAX_TRAIL_POINTS = 32;          // 拖尾点上限,避免线性增长

// ============ 工具函数 ============
const randRange = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(randRange(min, max + 1));

// 点到线段距离
function pointToSegmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// ============ 主组件 ============
export default function FruitNinja() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // ---- UI 状态 ----
  // 从 localStorage 读取初始进度，避免初次渲染后再用 effect 写入导致的二次渲染
  const [unlockedLevel, setUnlockedLevel] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    try {
      const raw = localStorage.getItem('fruitninja_progress');
      return raw ? (JSON.parse(raw).unlockedLevel ?? 1) : 1;
    } catch {
      return 1;
    }
  });
  const [currentLevel, setCurrentLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [bestScore, setBestScore] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const raw = localStorage.getItem('fruitninja_progress');
      return raw ? (JSON.parse(raw).highScore ?? 0) : 0;
    } catch {
      return 0;
    }
  });

  // ---- 游戏数据 ref ----
  const fruitsRef = useRef<Fruit[]>([]);
  const halvesRef = useRef<FruitHalf[]>([]);
  const bombsRef = useRef<Bomb[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingScoresRef = useRef<FloatingScore[]>([]);
  const slashTrailRef = useRef<SlashSegment[]>([]);
  const isPointerDownRef = useRef(false);
  const lastSlashTimeRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const comboRef = useRef(0);
  const comboTimerRef = useRef(0);
  const timeLeftRef = useRef(60);
  const currentLevelRef = useRef(1);
  const lastSpawnRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const entityIdRef = useRef(0);
  const finalScoreRef = useRef<number | null>(null);
  const missGraceRef = useRef(0); // 连击重置宽限

  // ---- 渲染 ----
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 760, h: 560 });
  const canvasSizeRef = useRef(canvasSize);
  // 保持 ref 与 state 同步,供回调读取最新值
  useEffect(() => {
    canvasSizeRef.current = canvasSize;
  }, [canvasSize]);

  // ===== 性能优化缓存 =====
  // Canvas 矩阵缓存:避免 pointermove 中反复触发 getBoundingClientRect 重排
  const canvasRectRef = useRef<{ rect: DOMRect; w: number; h: number } | null>(null);
  // 输入事件 rAF 调度标记
  const inputRafScheduledRef = useRef(false);
  const pendingPointerPosRef = useRef<{ x: number; y: number } | null>(null);
  // 上次碰撞检测时间(节流)
  const lastSliceCheckRef = useRef(0);
  // 渐变缓存:避免每帧重建(按尺寸+主题缓存)
  const bgGradientCacheRef = useRef<{ key: string; grad: CanvasGradient } | null>(null);
  // 离屏 canvas 缓存装饰光斑(静态层)
  const decorCacheRef = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null);
  // FPS 监测
  const fpsRef = useRef({ frames: 0, lastTime: 0, value: 0 });
  const [fps, setFps] = useState(0);
  const gameStateRef = useRef<GameState>('menu');
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const level = LEVELS[currentLevel - 1];

  // ============ 保存分数 ============
  useEffect(() => {
    if ((gameState === 'over' || gameState === 'win') && finalScoreRef.current !== null) {
      const current = getScores().fruitninja;
      const newHigh = Math.max(current.highScore, finalScoreRef.current);
      const newBestLevel = Math.max(current.bestLevel, gameState === 'win' ? currentLevelRef.current : currentLevelRef.current - 1);
      const wasRecord = finalScoreRef.current > current.highScore;
      updateScore('fruitninja', () => ({
        highScore: newHigh,
        bestLevel: newBestLevel,
        totalGames: current.totalGames + 1,
      }));
      setBestScore(newHigh);
      setIsNewRecord(wasRecord);
      const raw = localStorage.getItem('fruitninja_progress');
      const data = raw ? JSON.parse(raw) : {};
      localStorage.setItem('fruitninja_progress', JSON.stringify({
        unlockedLevel: Math.max(data.unlockedLevel || 1, gameState === 'win' ? currentLevelRef.current + 1 : data.unlockedLevel || 1),
        highScore: newHigh,
      }));
      if (gameState === 'win') {
        setUnlockedLevel(u => Math.max(u, currentLevelRef.current + 1));
      }
      finalScoreRef.current = null;
    }
  }, [gameState]);

  // ============ 生成水果/炸弹 ============
  const spawnBatch = useCallback(() => {
    const lv = LEVELS[currentLevelRef.current - 1];
    const { w, h } = canvasSizeRef.current;
    const batchSize = randInt(lv.minBatchSize, lv.maxBatchSize);
    const willSpawnBomb = Math.random() < lv.bombChance;

    const startX = randRange(w * 0.12, w * 0.75);
    const newFruits: Fruit[] = [];

    for (let i = 0; i < batchSize; i++) {
      const fruitDef = FRUIT_TYPES[randInt(0, FRUIT_TYPES.length - 1)];
      const x = startX + randRange(-60, 60);
      const launchAngle = randRange(-Math.PI * 0.42, -Math.PI * 0.58);
      const power = randRange(lv.launchPowerMin, lv.launchPowerMax);
      newFruits.push({
        id: entityIdRef.current++,
        x: Math.max(30, Math.min(w - 30, x)),
        y: h + 30,
        vx: Math.cos(launchAngle) * power + (x > w / 2 ? -1 : 1) * randRange(0, 2),
        vy: Math.sin(launchAngle) * power,
        radius: randRange(28, 36),
        rotation: randRange(0, Math.PI * 2),
        rotationSpeed: randRange(-0.08, 0.08),
        type: fruitDef.type,
        sliced: false,
        color: fruitDef.color,
        emoji: fruitDef.emoji,
      });
    }
    fruitsRef.current = [...fruitsRef.current, ...newFruits];

    if (willSpawnBomb) {
      const bx = startX + randRange(-40, 40);
      const launchAngle = randRange(-Math.PI * 0.42, -Math.PI * 0.58);
      const power = randRange(lv.launchPowerMin, lv.launchPowerMax);
      bombsRef.current = [...bombsRef.current, {
        id: entityIdRef.current++,
        x: Math.max(30, Math.min(w - 30, bx)),
        y: h + 30,
        vx: Math.cos(launchAngle) * power,
        vy: Math.sin(launchAngle) * power,
        radius: 32,
        rotation: 0,
        rotationSpeed: randRange(-0.05, 0.05),
        sliced: false,
        life: 1,
      }];
    }
  }, []);

  // ============ 初始化关卡 ============
  const initLevel = useCallback((levelId: number) => {
    const lv = LEVELS[levelId - 1];
    fruitsRef.current = [];
    halvesRef.current = [];
    bombsRef.current = [];
    particlesRef.current = [];
    floatingScoresRef.current = [];
    slashTrailRef.current = [];
    isPointerDownRef.current = false;
    scoreRef.current = 0;
    livesRef.current = MAX_LIVES;
    comboRef.current = 0;
    comboTimerRef.current = 0;
    timeLeftRef.current = lv.timeLimit;
    currentLevelRef.current = levelId;
    lastSpawnRef.current = 0;
    lastFrameTimeRef.current = 0;
    missGraceRef.current = 0;
    finalScoreRef.current = null;
    // 重置输入调度与 FPS 计数
    inputRafScheduledRef.current = false;
    pendingPointerPosRef.current = null;
    lastSliceCheckRef.current = 0;
    fpsRef.current = { frames: 0, lastTime: 0, value: 0 };
    // 清理渲染缓存
    canvasRectRef.current = null;

    setScore(0);
    setLives(MAX_LIVES);
    setCombo(0);
    setTimeLeft(lv.timeLimit);
    setCurrentLevel(levelId);
    setIsNewRecord(false);
    setGameState('playing');
  }, []);

  // ============ 切水果效果 ============
  const sliceFruitById = useCallback((fruitId: number, slashDx: number, slashDy: number) => {
    const fruit = fruitsRef.current.find(f => f.id === fruitId && !f.sliced);
    if (!fruit) return;
    const lv = LEVELS[currentLevelRef.current - 1];

    // 标记为已切(通过 map 创建新对象)
    fruitsRef.current = fruitsRef.current.map(f =>
      f.id === fruitId ? { ...f, sliced: true } : f,
    );

    // 分成两半
    const speed = Math.hypot(slashDx, slashDy);
    const perpX = -slashDy / (speed || 1);
    const perpY = slashDx / (speed || 1);
    const halfSpeed = 3;
    const newHalves: FruitHalf[] = [];
    for (const side of ['left', 'right'] as const) {
      const dir = side === 'left' ? -1 : 1;
      newHalves.push({
        id: entityIdRef.current++,
        x: fruit.x,
        y: fruit.y,
        vx: fruit.vx * 0.6 + perpX * dir * halfSpeed,
        vy: fruit.vy * 0.6 + perpY * dir * halfSpeed,
        rotation: fruit.rotation,
        rotationSpeed: fruit.rotationSpeed + dir * 0.1,
        color: fruit.color,
        emoji: fruit.emoji,
        radius: fruit.radius,
        life: 1,
        side,
      });
    }
    halvesRef.current = [...halvesRef.current, ...newHalves];

    // 粒子飞溅
    const fruitDef = FRUIT_TYPES.find(f => f.type === fruit.type)!;
    const newParticles: Particle[] = [];
    for (let i = 0; i < 12; i++) {
      const ang = randRange(0, Math.PI * 2);
      const sp = randRange(1, 5);
      newParticles.push({
        id: entityIdRef.current++,
        x: fruit.x,
        y: fruit.y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 1,
        life: 1,
        maxLife: 1,
        color: fruitDef.color,
        size: randRange(2, 5),
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];

    // 连击
    comboRef.current += 1;
    comboTimerRef.current = 800;
    const comboCount = comboRef.current;
    const comboBonus = comboCount >= 3 ? Math.min(comboCount - 2, 5) : 0;
    const gained = fruitDef.score + comboBonus;

    scoreRef.current += gained;
    setScore(scoreRef.current);
    setCombo(comboCount);

    // 浮动得分
    floatingScoresRef.current = [...floatingScoresRef.current, {
      id: entityIdRef.current++,
      x: fruit.x,
      y: fruit.y,
      text: comboCount >= 3 ? `+${gained} x${comboCount}!` : `+${gained}`,
      color: comboCount >= 3 ? '#fbbf24' : isDark ? '#fff' : '#1f2937',
      life: 1,
      vy: -1.2,
    }];

    // 胜利检查
    if (scoreRef.current >= lv.targetScore) {
      finalScoreRef.current = scoreRef.current;
      setGameState('win');
      return;
    }
  }, [isDark]);

  const sliceBombById = useCallback((bombId: number) => {
    const bomb = bombsRef.current.find(b => b.id === bombId && !b.sliced);
    if (!bomb) return;
    bombsRef.current = bombsRef.current.map(b =>
      b.id === bombId ? { ...b, sliced: true, life: 1 } : b,
    );
    // 爆炸粒子
    const newParticles: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      const ang = randRange(0, Math.PI * 2);
      const sp = randRange(2, 8);
      newParticles.push({
        id: entityIdRef.current++,
        x: bomb.x,
        y: bomb.y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 1,
        maxLife: 1,
        color: i % 2 === 0 ? '#f59e0b' : '#1f2937',
        size: randRange(3, 7),
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
    floatingScoresRef.current = [...floatingScoresRef.current, {
      id: entityIdRef.current++,
      x: bomb.x,
      y: bomb.y,
      text: '💥 炸弹!',
      color: '#ef4444',
      life: 1,
      vy: -1,
    }];
    // 扣命并重置连击
    livesRef.current -= 1;
    setLives(livesRef.current);
    comboRef.current = 0;
    setCombo(0);
    if (livesRef.current <= 0) {
      finalScoreRef.current = scoreRef.current;
      setGameState('over');
    }
  }, []);

  // ============ 切割检测 ============
  const checkSlice = useCallback((fromX: number, fromY: number, toX: number, toY: number) => {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return; // 太短不判定

    // 检查水果
    for (const fruit of fruitsRef.current) {
      if (fruit.sliced) continue;
      const d = pointToSegmentDist(fruit.x, fruit.y, fromX, fromY, toX, toY);
      if (d < fruit.radius) {
        sliceFruitById(fruit.id, dx, dy);
      }
    }
    // 检查炸弹
    for (const bomb of bombsRef.current) {
      if (bomb.sliced) continue;
      const d = pointToSegmentDist(bomb.x, bomb.y, fromX, fromY, toX, toY);
      if (d < bomb.radius) {
        sliceBombById(bomb.id);
      }
    }
  }, [sliceBombById, sliceFruitById]);

  // ============ 指针事件 ============
  // 获取缓存的 canvas 矩阵(仅在尺寸变化时刷新),避免每次 move 强制重排
  const getCanvasScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const cached = canvasRectRef.current;
    if (cached && cached.w === canvas.width && cached.h === canvas.height) {
      return cached;
    }
    const rect = canvas.getBoundingClientRect();
    const entry = {
      rect,
      w: canvas.width,
      h: canvas.height,
    };
    canvasRectRef.current = entry;
    return entry;
  }, []);

  const getPointerPos = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const scale = getCanvasScale();
    if (!scale) return { x: 0, y: 0 };
    return {
      x: (clientX - scale.rect.left) * (scale.w / scale.rect.width),
      y: (clientY - scale.rect.top) * (scale.h / scale.rect.height),
    };
  }, [getCanvasScale]);

  // rAF 调度的碰撞检测:把高频 pointermove 的切割判定合并到下一帧执行
  const scheduleSliceCheck = useCallback(() => {
    if (inputRafScheduledRef.current) return;
    inputRafScheduledRef.current = true;
    requestAnimationFrame(() => {
      inputRafScheduledRef.current = false;
      const pos = pendingPointerPosRef.current;
      if (!pos) return;
      const trail = slashTrailRef.current;
      if (trail.length > 0) {
        const last = trail[trail.length - 1];
        const now = performance.now();
        // 节流:距上次检测至少一帧
        if (now - lastSliceCheckRef.current >= SLICE_CHECK_MIN_INTERVAL) {
          checkSlice(last.x, last.y, pos.x, pos.y);
          lastSliceCheckRef.current = now;
        }
      }
      trail.push({ ...pos, t: Date.now() });
      // 拖尾点数上限,避免线性增长
      if (trail.length > MAX_TRAIL_POINTS) {
        slashTrailRef.current = trail.slice(trail.length - MAX_TRAIL_POINTS);
      }
      lastSlashTimeRef.current = Date.now();
      pendingPointerPosRef.current = null;
    });
  }, [checkSlice]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (gameState !== 'playing') return;
    e.preventDefault();
    isPointerDownRef.current = true;
    const pos = getPointerPos(e.clientX, e.clientY);
    slashTrailRef.current = [{ ...pos, t: Date.now() }];
    // 尺寸可能变化,清理缓存
    canvasRectRef.current = null;
  }, [gameState, getPointerPos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (gameState !== 'playing') return;
    // 仅记录坐标,实际切割判定交给 rAF 异步执行,避免阻塞主线程
    pendingPointerPosRef.current = getPointerPos(e.clientX, e.clientY);
    if (isPointerDownRef.current) {
      scheduleSliceCheck();
    } else {
      // PC 端鼠标悬停也允许切割(不按下),更接近原版体验
      scheduleSliceCheck();
    }
  }, [gameState, getPointerPos, scheduleSliceCheck]);

  const onPointerUp = useCallback(() => {
    isPointerDownRef.current = false;
  }, []);

  // ============ 主循环 ============
  const update = useCallback((dt: number) => {
    const lv = LEVELS[currentLevelRef.current - 1];
    const { h } = canvasSizeRef.current;
    const dtScale = dt / 16.67; // 标准化到60fps

    // 计时(仅整数秒变化时才 setState,避免每帧触发 React 重渲染)
    const prevSec = Math.ceil(timeLeftRef.current);
    timeLeftRef.current -= dt / 1000;
    if (timeLeftRef.current <= 0) {
      timeLeftRef.current = 0;
      finalScoreRef.current = scoreRef.current;
      setGameState(scoreRef.current >= lv.targetScore ? 'win' : 'over');
      return;
    }
    const newSec = Math.ceil(timeLeftRef.current);
    if (newSec !== prevSec) setTimeLeft(newSec);

    // FPS 监测(每秒更新一次 state)
    const fpsState = fpsRef.current;
    fpsState.frames++;
    const fpsElapsed = performance.now() - fpsState.lastTime;
    if (fpsElapsed >= 1000) {
      fpsState.value = Math.round((fpsState.frames * 1000) / fpsElapsed);
      fpsState.frames = 0;
      fpsState.lastTime = performance.now();
      setFps(fpsState.value);
    }

    // 生成
    lastSpawnRef.current += dt;
    if (lastSpawnRef.current >= lv.spawnInterval) {
      lastSpawnRef.current = 0;
      spawnBatch();
    }

    // 连击计时
    if (comboRef.current > 0) {
      comboTimerRef.current -= dt;
      if (comboTimerRef.current <= 0) {
        comboRef.current = 0;
        setCombo(0);
      }
    }

    // 水果物理 - 单次遍历完成更新+过滤,避免 map+filter 两次遍历
    let missed = false;
    const nextFruits: Fruit[] = [];
    for (const fruit of fruitsRef.current) {
      if (fruit.sliced) continue;
      const newVy = fruit.vy + lv.gravity * dtScale;
      const newY = fruit.y + newVy * dtScale;
      if (newY > h + 60 && newVy > 0) {
        missed = true;
        continue; // 掉出底部,不再保留
      }
      nextFruits.push({
        ...fruit,
        vy: newVy,
        x: fruit.x + fruit.vx * dtScale,
        y: newY,
        rotation: fruit.rotation + fruit.rotationSpeed * dtScale,
      });
    }
    fruitsRef.current = nextFruits;
    if (missed) {
      comboRef.current = 0;
      setCombo(0);
      missGraceRef.current += 1;
      // 第 2 次起扣命(给点宽容)
      if (missGraceRef.current >= 2) {
        missGraceRef.current = 0;
        livesRef.current -= 1;
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          finalScoreRef.current = scoreRef.current;
          setGameState('over');
          return;
        }
      }
    }

    // 炸弹物理 - 单次遍历
    const nextBombs: Bomb[] = [];
    for (const bomb of bombsRef.current) {
      if (bomb.sliced) {
        const life = bomb.life - dt / 400;
        if (life > 0 && bomb.y < h + 100) nextBombs.push({ ...bomb, life });
        continue;
      }
      const newY = bomb.y + bomb.vy * dtScale;
      if (newY > h + 100) continue;
      nextBombs.push({
        ...bomb,
        vy: bomb.vy + lv.gravity * dtScale,
        x: bomb.x + bomb.vx * dtScale,
        y: newY,
        rotation: bomb.rotation + bomb.rotationSpeed * dtScale,
      });
    }
    bombsRef.current = nextBombs;

    // 半片物理 - 单次遍历 + 数量上限
    const nextHalves: FruitHalf[] = [];
    for (const half of halvesRef.current) {
      const life = half.life - dt / 1200;
      if (life <= 0) continue;
      const newY = half.y + half.vy * dtScale;
      if (newY > h + 100) continue;
      nextHalves.push({
        ...half,
        vy: half.vy + lv.gravity * dtScale,
        x: half.x + half.vx * dtScale,
        y: newY,
        rotation: half.rotation + half.rotationSpeed * dtScale,
        life,
      });
    }
    // 限制半片数量,超出按 life 最低的丢弃
    if (nextHalves.length > MAX_HALVES) {
      nextHalves.sort((a, b) => b.life - a.life);
      nextHalves.length = MAX_HALVES;
    }
    halvesRef.current = nextHalves;

    // 粒子 - 单次遍历 + 数量上限
    const nextParticles: Particle[] = [];
    for (const p of particlesRef.current) {
      const life = p.life - dt / 700;
      if (life <= 0) continue;
      nextParticles.push({
        ...p,
        vy: p.vy + lv.gravity * 0.3 * dtScale,
        x: p.x + p.vx * dtScale,
        y: p.y + p.vy * dtScale,
        life,
      });
    }
    if (nextParticles.length > MAX_PARTICLES) {
      nextParticles.sort((a, b) => b.life - a.life);
      nextParticles.length = MAX_PARTICLES;
    }
    particlesRef.current = nextParticles;

    // 浮动分数
    const nextFloating: FloatingScore[] = [];
    for (const fs of floatingScoresRef.current) {
      const life = fs.life - dt / 900;
      if (life <= 0) continue;
      nextFloating.push({
        ...fs,
        y: fs.y + fs.vy * dtScale,
        life,
      });
    }
    floatingScoresRef.current = nextFloating;

    // 清理拖尾
    const now = Date.now();
    slashTrailRef.current = slashTrailRef.current.filter(s => now - s.t < SLASH_TRAIL_LIFETIME);
  }, [spawnBatch]);

  // ============ Canvas 绘制 ============
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = canvasSizeRef.current;

    // 背景渐变缓存:仅在尺寸/主题变化时重建
    const bgKey = `${w}x${h}-${isDark ? 'd' : 'l'}`;
    let bgGrad = bgGradientCacheRef.current;
    if (!bgGrad || bgGrad.key !== bgKey) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      if (isDark) {
        g.addColorStop(0, '#1a0b2e');
        g.addColorStop(0.5, '#16213e');
        g.addColorStop(1, '#0f3460');
      } else {
        g.addColorStop(0, '#fef3c7');
        g.addColorStop(0.5, '#fdba74');
        g.addColorStop(1, '#f97316');
      }
      bgGrad = { key: bgKey, grad: g };
      bgGradientCacheRef.current = bgGrad;
    }
    ctx.fillStyle = bgGrad.grad;
    ctx.fillRect(0, 0, w, h);

    // 装饰光斑:预渲染到离屏 canvas(静态层),仅位移绘制,避免每帧 5 次 arc
    const decorKey = `${w}x${h}-${isDark ? 'd' : 'l'}`;
    let decor = decorCacheRef.current;
    if (!decor || decor.key !== decorKey) {
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const octx = off.getContext('2d');
      if (octx) {
        octx.globalAlpha = 0.12;
        octx.fillStyle = isDark ? '#a78bfa' : '#fff';
        for (let i = 0; i < 5; i++) {
          const cx = (i * 137) % w;
          const cy = (i * 89) % h;
          octx.beginPath();
          octx.arc(cx, cy, 40, 0, Math.PI * 2);
          octx.fill();
        }
      }
      decor = { key: decorKey, canvas: off };
      decorCacheRef.current = decor;
    }
    // 随时间平移光斑层,产生流动感
    const offsetX = (Date.now() / 50) % w;
    const offsetY = (Date.now() / 80) % h;
    ctx.drawImage(decor.canvas, offsetX, 0);
    if (offsetX > 0) ctx.drawImage(decor.canvas, offsetX - w, 0);
    if (offsetY > 0) {
      ctx.drawImage(decor.canvas, offsetX, offsetY - h);
      if (offsetX > 0) ctx.drawImage(decor.canvas, offsetX - w, offsetY - h);
    }

    // 水果
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const fruit of fruitsRef.current) {
      if (fruit.sliced) continue;
      ctx.save();
      ctx.translate(fruit.x, fruit.y);
      ctx.rotate(fruit.rotation);
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.font = `${fruit.radius * 2}px serif`;
      ctx.fillText(fruit.emoji, 0, 0);
      ctx.restore();
    }

    // 半片
    for (const half of halvesRef.current) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, half.life);
      ctx.translate(half.x, half.y);
      ctx.rotate(half.rotation);
      ctx.beginPath();
      ctx.rect(half.side === 'left' ? -half.radius : 0, -half.radius, half.radius, half.radius * 2);
      ctx.clip();
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 6;
      ctx.font = `${half.radius * 2}px serif`;
      ctx.fillText(half.emoji, 0, 0);
      ctx.shadowBlur = 0;
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)';
      ctx.fillRect(-1, -half.radius, 2, half.radius * 2);
      ctx.restore();
    }

    // 炸弹
    for (const bomb of bombsRef.current) {
      if (bomb.sliced) {
        ctx.save();
        ctx.globalAlpha = bomb.life;
        const r = bomb.radius * (1 + (1 - bomb.life) * 2);
        const grad = ctx.createRadialGradient(bomb.x, bomb.y, 0, bomb.x, bomb.y, r);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.4, '#f59e0b');
        grad.addColorStop(1, 'rgba(239,68,68,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bomb.x, bomb.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }
      ctx.save();
      ctx.translate(bomb.x, bomb.y);
      ctx.rotate(bomb.rotation);
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      ctx.font = `${bomb.radius * 2}px serif`;
      ctx.fillText('💣', 0, 0);
      ctx.restore();
    }

    // 粒子 - 合并相同颜色批量绘制,减少 fillStyle 切换
    ctx.shadowBlur = 0;
    const particlesByColor = new Map<string, { x: number; y: number; r: number; a: number }[]>();
    for (const p of particlesRef.current) {
      const a = Math.max(0, p.life);
      const r = p.size * p.life;
      let arr = particlesByColor.get(p.color);
      if (!arr) { arr = []; particlesByColor.set(p.color, arr); }
      arr.push({ x: p.x, y: p.y, r, a });
    }
    for (const [color, list] of particlesByColor) {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (const item of list) {
        ctx.globalAlpha = item.a;
        ctx.moveTo(item.x + item.r, item.y);
        ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 浮动分数 - 渲染到 canvas 右侧固定区域，避免影响 DOM 布局
    const scoreAreaX = w - 70;
    // 右侧分数区域半透明背景条
    if (floatingScoresRef.current.length > 0 && gameStateRef.current === 'playing') {
      ctx.save();
      ctx.fillStyle = isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.2)';
      ctx.fillRect(w - 120, 0, 120, h);
      ctx.restore();
    }
    for (let i = 0; i < floatingScoresRef.current.length; i++) {
      const fs = floatingScoresRef.current[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, fs.life);
      ctx.font = `bold ${fs.text.includes('x') ? 22 : 18}px sans-serif`;
      ctx.fillStyle = fs.color;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      // 右侧纵向排列，每个条目间隔 32px
      ctx.fillText(fs.text, scoreAreaX, fs.y);
      ctx.restore();
    }

    // 刀光拖尾
    const trail = slashTrailRef.current;
    if (trail.length >= 2) {
      const now = Date.now();
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = isDark ? '#a78bfa' : '#fff';
      ctx.shadowBlur = 12;
      for (let i = 1; i < trail.length; i++) {
        const seg = trail[i];
        const prev = trail[i - 1];
        const age = (now - seg.t) / SLASH_TRAIL_LIFETIME;
        if (age >= 1) continue;
        const alpha = (1 - age) * 0.9;
        const width = (1 - age) * 14 + 2;
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(seg.x, seg.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [isDark]);

  // ============ 主循环 ============
  useEffect(() => {
    if (gameState !== 'playing') {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    const loop = (timestamp: number) => {
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
      const dt = Math.min(50, timestamp - lastFrameTimeRef.current);
      lastFrameTimeRef.current = timestamp;
      update(dt);
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [gameState, update, draw]);

  // 非 playing 状态绘制一帧
  useEffect(() => {
    if (gameState === 'menu') return;
    if (gameState !== 'playing') draw();
  }, [gameState, draw]);

  // ============ Canvas 尺寸响应 ============
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      if (!container) return;
      const maxW = Math.min(container.clientWidth, 860);
      const maxH = Math.min(window.innerHeight - 220, 660);
      const aspectW = maxW;
      const aspectH = Math.max(440, Math.min(maxH, aspectW * 0.78));
      const newSize = { w: Math.floor(aspectW), h: Math.floor(aspectH) };
      setCanvasSize(prev => (prev.w === newSize.w && prev.h === newSize.h ? prev : newSize));
      // 尺寸变化:清理 rect/渐变/装饰缓存,下次 draw 重建
      canvasRectRef.current = null;
      bgGradientCacheRef.current = null;
      decorCacheRef.current = null;
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // ============ 字体预加载 ============
  // 首次进入游戏前预热 serif/emoji 字体,避免首帧绘制时字体加载导致主线程阻塞
  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // 用所有 emoji 触发字体度量缓存
    ctx.font = '64px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const ft of FRUIT_TYPES) {
      ctx.fillText(ft.emoji, -999, -999);
    }
    ctx.fillText('💣', -999, -999);
  }, [gameState]);

  // ============ 菜单界面 ============
  if (gameState === 'menu') {
    return (
      <div ref={containerRef} className="w-full max-w-2xl mx-auto px-2 sm:px-4 py-6">
        <div className="text-center mb-8">
          <h1 className={`text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            🔪 水果忍者
          </h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            挥刀切水果，躲开炸弹！4 关挑战等你
          </p>
          <div className={`mt-2 text-sm ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            🏆 最高分: {bestScore}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {LEVELS.map((lv) => {
            const unlocked = unlockedLevel >= lv.id;
            const completed = unlockedLevel > lv.id;
            return (
              <button type="button"
                key={lv.id}
                onClick={() => unlocked && initLevel(lv.id)}
                disabled={!unlocked}
                className={`p-4 sm:p-6 rounded-2xl text-left transition-all duration-200 touch-manipulation ${
                  unlocked
                    ? isDark
                      ? 'bg-gradient-to-br from-rose-600/30 to-orange-600/30 hover:from-rose-500/40 hover:to-orange-500/40 border border-rose-500/40 hover:scale-[1.02]'
                      : 'bg-gradient-to-br from-rose-50 to-orange-50 hover:from-rose-100 hover:to-orange-100 border border-rose-200 hover:scale-[1.02]'
                    : isDark
                      ? 'bg-gray-800/30 border border-gray-700/50 opacity-50 cursor-not-allowed'
                      : 'bg-gray-100/50 border border-gray-200/50 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {unlocked ? `第 ${lv.id} 关` : '🔒'}
                  </span>
                  {completed && <span className="text-xl">⭐</span>}
                </div>
                <div className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {lv.name}
                </div>
                <div className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  目标 {lv.targetScore} 分 · {lv.timeLimit}s
                </div>
                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {lv.description}
                </div>
              </button>
            );
          })}
        </div>

        <div className={`text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <p>鼠标拖动 / 手指滑动 切割水果</p>
          <p className="mt-1">连击 3+ 获得额外分数，切到炸弹扣命</p>
          <p className="mt-1">🍎🍊🍉 每 1-2 分 · 💣 切到爆炸</p>
        </div>
      </div>
    );
  }

  // ============ 游戏界面 ============
  return (
    <div ref={containerRef} className="w-full max-w-3xl mx-auto px-1 sm:px-2">
      {/* 顶部信息栏 */}
      <div className="flex justify-between items-center mb-3 px-2 gap-2">
        <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl flex-1 ${isDark ? 'bg-rose-500/20' : 'bg-rose-100'}`}>
          <div className={`text-[10px] sm:text-xs font-semibold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
            第 {currentLevel} 关 · {level.name}
          </div>
          <div className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {score} / {level.targetScore}
          </div>
        </div>
        <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl flex-1 ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
          <div className={`text-[10px] sm:text-xs font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
            生命
          </div>
          <div className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {'❤️'.repeat(Math.max(0, lives))}{'🤍'.repeat(Math.max(0, MAX_LIVES - lives))}
          </div>
        </div>
        <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl flex-1 ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
          <div className={`text-[10px] sm:text-xs font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            时间
          </div>
          <div className={`text-lg sm:text-xl font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : isDark ? 'text-white' : 'text-gray-800'}`}>
            {timeLeft}s
          </div>
        </div>
      </div>

      {/* 进度条 */}
      <div className={`mb-3 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div
          className="h-full bg-gradient-to-r from-rose-400 to-orange-500 transition-all duration-300"
          style={{ width: `${Math.min(100, (score / level.targetScore) * 100)}%` }}
        />
      </div>

      {/* 连击提示 - 绝对定位浮层，不影响布局流 */}
      <div className="mb-3 relative" style={{ height: 0 }}>
        {combo >= 3 && gameState === 'playing' && (
          <div className="absolute left-1/2 -translate-x-1/2 top-1 z-20 pointer-events-none">
            <span className={`inline-block px-4 py-1 rounded-full font-bold text-sm animate-pulse ${
              isDark ? 'bg-amber-500/30 text-amber-300' : 'bg-amber-100 text-amber-700'
            }`}>
              🔥 {combo} 连击! +{Math.min(combo - 2, 5)} 奖励
            </span>
          </div>
        )}
      </div>

      {/* Canvas 游戏区 */}
      <div
        className="mx-auto touch-none select-none rounded-xl overflow-hidden border-2 shadow-2xl relative"
        style={{
          width: canvasSize.w,
          height: canvasSize.h,
          borderColor: isDark ? '#374151' : '#d1d5db',
          cursor: 'crosshair',
          willChange: 'contents',
          contain: 'strict',
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />

        {/* FPS 监测(性能验证用,低帧率时高亮) */}
        {gameState === 'playing' && (
          <div className={`absolute top-1 right-2 text-[10px] font-mono z-30 pointer-events-none ${
            fps < 50 ? 'text-red-400' : isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {fps} FPS
          </div>
        )}

        {/* 暂停遮罩 */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">⏸️ 暂停</div>
              <div className="text-sm text-gray-300">点击继续按钮恢复</div>
            </div>
          </div>
        )}

        {/* 游戏结束遮罩 */}
        {gameState === 'over' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400 mb-2">
                {timeLeft <= 0 ? '⏰ 时间到!' : '💥 游戏结束'}
              </div>
              <div className="text-sm text-gray-300">
                得分 {score} / {level.targetScore}
              </div>
              {isNewRecord && (
                <div className="mt-2 text-amber-400 font-bold animate-pulse">🏆 新纪录!</div>
              )}
            </div>
          </div>
        )}

        {/* 胜利遮罩 */}
        {gameState === 'win' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-2">🎉 通关!</div>
              <div className="text-sm text-gray-300">
                得分 {score} · {currentLevel < 4 ? '下一关已解锁' : '所有关卡完成!'}
              </div>
              {isNewRecord && (
                <div className="mt-2 text-amber-400 font-bold animate-pulse">🏆 新纪录!</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="mt-4 flex justify-center gap-2 sm:gap-3 flex-wrap">
        {gameState === 'playing' && (
          <>
            <button type="button"
              onClick={() => setGameState('paused')}
              className={`min-h-[2.5rem] px-5 py-2 font-bold rounded-xl shadow-lg transition-all active:scale-95 hover:scale-105 touch-manipulation ${
                isDark ? 'bg-amber-500/80 hover:bg-amber-400/80 text-white' : 'bg-amber-500 hover:bg-amber-400 text-white'
              }`}
            >
              ⏸️ 暂停
            </button>
            <button type="button"
              onClick={() => initLevel(currentLevel)}
              className={`min-h-[2.5rem] px-5 py-2 font-bold rounded-xl shadow-lg transition-all active:scale-95 hover:scale-105 touch-manipulation ${
                isDark ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-500 hover:bg-gray-400 text-white'
              }`}
            >
              🔄 重来
            </button>
            <button type="button"
              onClick={() => setGameState('menu')}
              className={`min-h-[2.5rem] px-5 py-2 font-bold rounded-xl shadow-lg transition-all active:scale-95 hover:scale-105 touch-manipulation ${
                isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-slate-500 hover:bg-slate-400 text-white'
              }`}
            >
              📋 菜单
            </button>
          </>
        )}
        {gameState === 'paused' && (
          <>
            <button type="button"
              onClick={() => setGameState('playing')}
              className={`min-h-[2.5rem] px-6 py-2 font-bold rounded-xl shadow-lg transition-all active:scale-95 hover:scale-105 touch-manipulation ${
                isDark ? 'bg-emerald-500/80 hover:bg-emerald-400/80 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-white'
              }`}
            >
              ▶️ 继续
            </button>
            <button type="button"
              onClick={() => initLevel(currentLevel)}
              className={`min-h-[2.5rem] px-5 py-2 font-bold rounded-xl shadow-lg transition-all active:scale-95 hover:scale-105 touch-manipulation ${
                isDark ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-500 hover:bg-gray-400 text-white'
              }`}
            >
              🔄 重来
            </button>
            <button type="button"
              onClick={() => setGameState('menu')}
              className={`min-h-[2.5rem] px-5 py-2 font-bold rounded-xl shadow-lg transition-all active:scale-95 hover:scale-105 touch-manipulation ${
                isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-slate-500 hover:bg-slate-400 text-white'
              }`}
            >
              📋 菜单
            </button>
          </>
        )}
        {(gameState === 'over' || gameState === 'win') && (
          <>
            <button type="button"
              onClick={() => initLevel(currentLevel)}
              className={`min-h-[2.5rem] px-6 py-2 font-bold rounded-xl shadow-lg transition-all active:scale-95 hover:scale-105 touch-manipulation ${
                isDark ? 'bg-emerald-500/80 hover:bg-emerald-400/80 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-white'
              }`}
            >
              🔄 再来一次
            </button>
            {gameState === 'win' && currentLevel < 4 && (
              <button type="button"
                onClick={() => initLevel(currentLevel + 1)}
                className={`min-h-[2.5rem] px-6 py-2 font-bold rounded-xl shadow-lg transition-all active:scale-95 hover:scale-105 touch-manipulation ${
                  isDark ? 'bg-blue-500/80 hover:bg-blue-400/80 text-white' : 'bg-blue-500 hover:bg-blue-400 text-white'
                }`}
              >
                ➡️ 下一关
              </button>
            )}
            <button type="button"
              onClick={() => setGameState('menu')}
              className={`min-h-[2.5rem] px-5 py-2 font-bold rounded-xl shadow-lg transition-all active:scale-95 hover:scale-105 touch-manipulation ${
                isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-slate-500 hover:bg-slate-400 text-white'
              }`}
            >
              📋 菜单
            </button>
          </>
        )}
      </div>
    </div>
  );
}
