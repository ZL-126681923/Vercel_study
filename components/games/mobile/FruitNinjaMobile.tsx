'use client';

/**
 * Mobile 端水果忍者
 * - 物理/AI/关卡逻辑与 PC 版一致（4 关卡、3 命、连击奖励、炸弹）
 * - 区别仅在 UI 布局：
 *   - 顶部核心信息（关卡/分数/生命/时间）紧凑纵向
 *   - 自适应宽度画布（最大 min(94vw, 360px)）
 *   - 底部操作按钮 ≥44px，env(safe-area-inset) 适配
 *   - 菜单单列纵向卡片（避免小屏过窄）
 *   - 大字号（相对视口）
 *   - 移除 FPS 监测（移动端不需要）
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { getScores, updateScore } from '@/lib/gameScores';

type GameState = 'menu' | 'playing' | 'paused' | 'over' | 'win';

interface Fruit {
  id: number; x: number; y: number; vx: number; vy: number;
  radius: number; rotation: number; rotationSpeed: number;
  type: FruitType; sliced: boolean; color: string; emoji: string;
}
interface FruitHalf {
  id: number; x: number; y: number; vx: number; vy: number;
  rotation: number; rotationSpeed: number; color: string;
  emoji: string; radius: number; life: number; side: 'left' | 'right';
}
interface Bomb {
  id: number; x: number; y: number; vx: number; vy: number;
  radius: number; rotation: number; rotationSpeed: number;
  sliced: boolean; life: number;
}
interface Particle {
  id: number; x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
}
interface SlashSegment { x: number; y: number; t: number; }
interface FloatingScore { id: number; x: number; y: number; text: string; color: string; life: number; vy: number; }
type FruitType = 'apple' | 'orange' | 'watermelon' | 'pineapple' | 'banana' | 'strawberry' | 'kiwi' | 'peach';

interface LevelConfig {
  id: number; name: string; description: string;
  targetScore: number; spawnInterval: number;
  minBatchSize: number; maxBatchSize: number;
  bombChance: number; gravity: number;
  launchPowerMin: number; launchPowerMax: number; timeLimit: number;
}

const LEVELS: LevelConfig[] = [
  { id: 1, name: '苹果园', description: '悠闲入门，切到 50 分过关', targetScore: 50, spawnInterval: 1300, minBatchSize: 1, maxBatchSize: 2, bombChance: 0.05, gravity: 0.32, launchPowerMin: 12, launchPowerMax: 15, timeLimit: 60 },
  { id: 2, name: '柑橘林', description: '节奏加快，小心炸弹，目标 100 分', targetScore: 100, spawnInterval: 1000, minBatchSize: 1, maxBatchSize: 3, bombChance: 0.1, gravity: 0.34, launchPowerMin: 13, launchPowerMax: 16, timeLimit: 60 },
  { id: 3, name: '热带雨林', description: '多水果齐飞，目标 150 分', targetScore: 150, spawnInterval: 750, minBatchSize: 2, maxBatchSize: 4, bombChance: 0.13, gravity: 0.36, launchPowerMin: 14, launchPowerMax: 17, timeLimit: 60 },
  { id: 4, name: '终极考验', description: '极速狂轰，炸弹频现，目标 200 分', targetScore: 200, spawnInterval: 550, minBatchSize: 2, maxBatchSize: 5, bombChance: 0.18, gravity: 0.38, launchPowerMin: 15, launchPowerMax: 18, timeLimit: 70 },
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
const SLICE_CHECK_MIN_INTERVAL = 16;
const MAX_PARTICLES = 220;
const MAX_HALVES = 40;
const MAX_TRAIL_POINTS = 32;

const randRange = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(randRange(min, max + 1));

function pointToSegmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1, lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export default function FruitNinjaMobile() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [unlockedLevel, setUnlockedLevel] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    try {
      const raw = localStorage.getItem('fruitninja_progress');
      return raw ? (JSON.parse(raw).unlockedLevel ?? 1) : 1;
    } catch { return 1; }
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
    } catch { return 0; }
  });

  const fruitsRef = useRef<Fruit[]>([]);
  const halvesRef = useRef<FruitHalf[]>([]);
  const bombsRef = useRef<Bomb[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingScoresRef = useRef<FloatingScore[]>([]);
  const slashTrailRef = useRef<SlashSegment[]>([]);
  const isPointerDownRef = useRef(false);
  const scoreRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const comboRef = useRef(0);
  const timeLeftRef = useRef(60);
  const currentLevelRef = useRef(1);
  const lastSpawnRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const entityIdRef = useRef(0);
  const missGraceRef = useRef(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 移动端画布尺寸：自适应宽度（最大 360），按比例
  const [canvasSize, setCanvasSize] = useState({ w: 360, h: 360 });
  const canvasSizeRef = useRef(canvasSize);
  useEffect(() => { canvasSizeRef.current = canvasSize; }, [canvasSize]);

  const canvasRectRef = useRef<{ rect: DOMRect; w: number; h: number } | null>(null);
  const inputRafScheduledRef = useRef(false);
  const pendingPointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastSliceCheckRef = useRef(0);
  const bgGradientCacheRef = useRef<{ key: string; grad: CanvasGradient } | null>(null);
  const decorCacheRef = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null);

  const level = LEVELS[currentLevel - 1];

  // 保存分数
  useEffect(() => {
    if ((gameState === 'over' || gameState === 'win') && scoreRef.current > 0) {
      const current = getScores().fruitninja;
      const newHigh = Math.max(current.highScore, scoreRef.current);
      const newBestLevel = Math.max(current.bestLevel, gameState === 'win' ? currentLevelRef.current : currentLevelRef.current - 1);
      const wasRecord = scoreRef.current > current.highScore;
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
    }
  }, [gameState]);

  const spawnBatch = useCallback(() => {
    const lv = LEVELS[currentLevelRef.current - 1];
    const { w, h } = canvasSizeRef.current;
    const batchSize = randInt(lv.minBatchSize, lv.maxBatchSize);
    const willSpawnBomb = Math.random() < lv.bombChance;
    const startX = randRange(w * 0.15, w * 0.85);
    const newFruits: Fruit[] = [];
    for (let i = 0; i < batchSize; i++) {
      const fruitDef = FRUIT_TYPES[randInt(0, FRUIT_TYPES.length - 1)];
      const x = startX + randRange(-60, 60);
      const launchAngle = randRange(-Math.PI * 0.42, -Math.PI * 0.58);
      const power = randRange(lv.launchPowerMin, lv.launchPowerMax);
      newFruits.push({
        id: entityIdRef.current++, x: Math.max(30, Math.min(w - 30, x)), y: h + 30,
        vx: Math.cos(launchAngle) * power + (x > w / 2 ? -1 : 1) * randRange(0, 2),
        vy: Math.sin(launchAngle) * power,
        radius: randRange(28, 36), rotation: randRange(0, Math.PI * 2),
        rotationSpeed: randRange(-0.08, 0.08),
        type: fruitDef.type, sliced: false, color: fruitDef.color, emoji: fruitDef.emoji,
      });
    }
    fruitsRef.current = [...fruitsRef.current, ...newFruits];
    if (willSpawnBomb) {
      const bx = startX + randRange(-40, 40);
      const launchAngle = randRange(-Math.PI * 0.42, -Math.PI * 0.58);
      const power = randRange(lv.launchPowerMin, lv.launchPowerMax);
      bombsRef.current = [...bombsRef.current, {
        id: entityIdRef.current++, x: Math.max(30, Math.min(w - 30, bx)), y: h + 30,
        vx: Math.cos(launchAngle) * power, vy: Math.sin(launchAngle) * power,
        radius: 32, rotation: 0, rotationSpeed: randRange(-0.05, 0.05),
        sliced: false, life: 1,
      }];
    }
  }, []);

  const initLevel = useCallback((levelId: number) => {
    const lv = LEVELS[levelId - 1];
    fruitsRef.current = []; halvesRef.current = []; bombsRef.current = [];
    particlesRef.current = []; floatingScoresRef.current = [];
    slashTrailRef.current = []; isPointerDownRef.current = false;
    scoreRef.current = 0; livesRef.current = MAX_LIVES;
    comboRef.current = 0; timeLeftRef.current = lv.timeLimit;
    currentLevelRef.current = levelId; lastSpawnRef.current = 0;
    lastFrameTimeRef.current = 0; missGraceRef.current = 0;
    inputRafScheduledRef.current = false; pendingPointerPosRef.current = null;
    lastSliceCheckRef.current = 0;
    canvasRectRef.current = null;

    setScore(0); setLives(MAX_LIVES); setCombo(0); setTimeLeft(lv.timeLimit);
    setCurrentLevel(levelId); setIsNewRecord(false); setGameState('playing');
  }, []);

  const sliceFruitById = useCallback((fruitId: number, slashDx: number, slashDy: number) => {
    const fruit = fruitsRef.current.find(f => f.id === fruitId && !f.sliced);
    if (!fruit) return;
    const lv = LEVELS[currentLevelRef.current - 1];
    fruitsRef.current = fruitsRef.current.map(f => f.id === fruitId ? { ...f, sliced: true } : f);
    const speed = Math.hypot(slashDx, slashDy);
    const perpX = -slashDy / (speed || 1);
    const perpY = slashDx / (speed || 1);
    const halfSpeed = 3;
    const newHalves: FruitHalf[] = [];
    for (const side of ['left', 'right'] as const) {
      const dir = side === 'left' ? -1 : 1;
      newHalves.push({
        id: entityIdRef.current++, x: fruit.x, y: fruit.y,
        vx: fruit.vx * 0.6 + perpX * dir * halfSpeed,
        vy: fruit.vy * 0.6 + perpY * dir * halfSpeed,
        rotation: fruit.rotation, rotationSpeed: fruit.rotationSpeed + dir * 0.1,
        color: fruit.color, emoji: fruit.emoji, radius: fruit.radius, life: 1, side,
      });
    }
    halvesRef.current = [...halvesRef.current, ...newHalves];
    const fruitDef = FRUIT_TYPES.find(f => f.type === fruit.type)!;
    const newParticles: Particle[] = [];
    for (let i = 0; i < 12; i++) {
      const ang = randRange(0, Math.PI * 2), sp = randRange(1, 5);
      newParticles.push({
        id: entityIdRef.current++, x: fruit.x, y: fruit.y,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1,
        life: 1, maxLife: 1, color: fruitDef.color, size: randRange(2, 5),
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
    comboRef.current += 1;
    const comboCount = comboRef.current;
    const comboBonus = comboCount >= 3 ? Math.min(comboCount - 2, 5) : 0;
    const gained = fruitDef.score + comboBonus;
    scoreRef.current += gained;
    setScore(scoreRef.current);
    setCombo(comboCount);
    floatingScoresRef.current = [...floatingScoresRef.current, {
      id: entityIdRef.current++, x: fruit.x, y: fruit.y,
      text: comboCount >= 3 ? `+${gained} x${comboCount}!` : `+${gained}`,
      color: comboCount >= 3 ? '#fbbf24' : isDark ? '#fff' : '#1f2937',
      life: 1, vy: -1.2,
    }];
    if (scoreRef.current >= lv.targetScore) setGameState('win');
  }, [isDark]);

  const sliceBombById = useCallback((bombId: number) => {
    const bomb = bombsRef.current.find(b => b.id === bombId && !b.sliced);
    if (!bomb) return;
    bombsRef.current = bombsRef.current.map(b => b.id === bombId ? { ...b, sliced: true, life: 1 } : b);
    const newParticles: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      const ang = randRange(0, Math.PI * 2), sp = randRange(2, 8);
      newParticles.push({
        id: entityIdRef.current++, x: bomb.x, y: bomb.y,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        life: 1, maxLife: 1, color: i % 2 === 0 ? '#f59e0b' : '#1f2937', size: randRange(3, 7),
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
    floatingScoresRef.current = [...floatingScoresRef.current, {
      id: entityIdRef.current++, x: bomb.x, y: bomb.y,
      text: '💥', color: '#ef4444', life: 1, vy: -1,
    }];
    livesRef.current -= 1;
    setLives(livesRef.current);
    comboRef.current = 0;
    setCombo(0);
    if (livesRef.current <= 0) setGameState('over');
  }, []);

  const checkSlice = useCallback((fromX: number, fromY: number, toX: number, toY: number) => {
    const dx = toX - fromX, dy = toY - fromY;
    if (Math.hypot(dx, dy) < 4) return;
    for (const fruit of fruitsRef.current) {
      if (fruit.sliced) continue;
      if (pointToSegmentDist(fruit.x, fruit.y, fromX, fromY, toX, toY) < fruit.radius) {
        sliceFruitById(fruit.id, dx, dy);
      }
    }
    for (const bomb of bombsRef.current) {
      if (bomb.sliced) continue;
      if (pointToSegmentDist(bomb.x, bomb.y, fromX, fromY, toX, toY) < bomb.radius) {
        sliceBombById(bomb.id);
      }
    }
  }, [sliceBombById, sliceFruitById]);

  const getCanvasScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const cached = canvasRectRef.current;
    if (cached && cached.w === canvas.width && cached.h === canvas.height) return cached;
    const rect = canvas.getBoundingClientRect();
    const entry = { rect, w: canvas.width, h: canvas.height };
    canvasRectRef.current = entry;
    return entry;
  }, []);

  const getPointerPos = useCallback((clientX: number, clientY: number) => {
    const scale = getCanvasScale();
    if (!scale) return { x: 0, y: 0 };
    return {
      x: (clientX - scale.rect.left) * (scale.w / scale.rect.width),
      y: (clientY - scale.rect.top) * (scale.h / scale.rect.height),
    };
  }, [getCanvasScale]);

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
        if (now - lastSliceCheckRef.current >= SLICE_CHECK_MIN_INTERVAL) {
          checkSlice(last.x, last.y, pos.x, pos.y);
          lastSliceCheckRef.current = now;
        }
      }
      trail.push({ ...pos, t: Date.now() });
      if (trail.length > MAX_TRAIL_POINTS) {
        slashTrailRef.current = trail.slice(trail.length - MAX_TRAIL_POINTS);
      }
      pendingPointerPosRef.current = null;
    });
  }, [checkSlice]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (gameState !== 'playing') return;
    e.preventDefault();
    isPointerDownRef.current = true;
    const pos = getPointerPos(e.clientX, e.clientY);
    slashTrailRef.current = [{ ...pos, t: Date.now() }];
    canvasRectRef.current = null;
  }, [gameState, getPointerPos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (gameState !== 'playing') return;
    pendingPointerPosRef.current = getPointerPos(e.clientX, e.clientY);
    scheduleSliceCheck();
  }, [gameState, getPointerPos, scheduleSliceCheck]);

  const onPointerUp = useCallback(() => {
    isPointerDownRef.current = false;
  }, []);

  // 主循环
  useEffect(() => {
    if (gameState !== 'playing') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const loop = (timestamp: number) => {
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
      const dt = Math.min(50, timestamp - lastFrameTimeRef.current);
      lastFrameTimeRef.current = timestamp;
      const lv = LEVELS[currentLevelRef.current - 1];
      const { h } = canvasSizeRef.current;
      const dtScale = dt / 16.67;

      const prevSec = Math.ceil(timeLeftRef.current);
      timeLeftRef.current -= dt / 1000;
      if (timeLeftRef.current <= 0) {
        timeLeftRef.current = 0;
        setGameState(scoreRef.current >= lv.targetScore ? 'win' : 'over');
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const newSec = Math.ceil(timeLeftRef.current);
      if (newSec !== prevSec) setTimeLeft(newSec);

      lastSpawnRef.current += dt;
      if (lastSpawnRef.current >= lv.spawnInterval) {
        lastSpawnRef.current = 0;
        spawnBatch();
      }

      if (comboRef.current > 0) {
        comboRef.current -= dt / 800;
        if (comboRef.current <= 0) { comboRef.current = 0; setCombo(0); }
      }

      let missed = false;
      const nextFruits: Fruit[] = [];
      for (const fruit of fruitsRef.current) {
        if (fruit.sliced) continue;
        const newVy = fruit.vy + lv.gravity * dtScale;
        const newY = fruit.y + newVy * dtScale;
        if (newY > h + 60 && newVy > 0) { missed = true; continue; }
        nextFruits.push({ ...fruit, vy: newVy, x: fruit.x + fruit.vx * dtScale, y: newY, rotation: fruit.rotation + fruit.rotationSpeed * dtScale });
      }
      fruitsRef.current = nextFruits;
      if (missed) {
        comboRef.current = 0; setCombo(0);
        missGraceRef.current += 1;
        if (missGraceRef.current >= 2) {
          missGraceRef.current = 0;
          livesRef.current -= 1; setLives(livesRef.current);
          if (livesRef.current <= 0) { setGameState('over'); rafRef.current = requestAnimationFrame(loop); return; }
        }
      }

      const nextBombs: Bomb[] = [];
      for (const bomb of bombsRef.current) {
        if (bomb.sliced) {
          const life = bomb.life - dt / 400;
          if (life > 0 && bomb.y < h + 100) nextBombs.push({ ...bomb, life });
          continue;
        }
        const newY = bomb.y + bomb.vy * dtScale;
        if (newY > h + 100) continue;
        nextBombs.push({ ...bomb, vy: bomb.vy + lv.gravity * dtScale, x: bomb.x + bomb.vx * dtScale, y: newY, rotation: bomb.rotation + bomb.rotationSpeed * dtScale });
      }
      bombsRef.current = nextBombs;

      const nextHalves: FruitHalf[] = [];
      for (const half of halvesRef.current) {
        const life = half.life - dt / 1200;
        if (life <= 0) continue;
        const newY = half.y + half.vy * dtScale;
        if (newY > h + 100) continue;
        nextHalves.push({ ...half, vy: half.vy + lv.gravity * dtScale, x: half.x + half.vx * dtScale, y: newY, rotation: half.rotation + half.rotationSpeed * dtScale, life });
      }
      if (nextHalves.length > MAX_HALVES) {
        nextHalves.sort((a, b) => b.life - a.life);
        nextHalves.length = MAX_HALVES;
      }
      halvesRef.current = nextHalves;

      const nextParticles: Particle[] = [];
      for (const p of particlesRef.current) {
        const life = p.life - dt / 700;
        if (life <= 0) continue;
        nextParticles.push({ ...p, vy: p.vy + lv.gravity * 0.3 * dtScale, x: p.x + p.vx * dtScale, y: p.y + p.vy * dtScale, life });
      }
      if (nextParticles.length > MAX_PARTICLES) {
        nextParticles.sort((a, b) => b.life - a.life);
        nextParticles.length = MAX_PARTICLES;
      }
      particlesRef.current = nextParticles;

      const nextFloating: FloatingScore[] = [];
      for (const fs of floatingScoresRef.current) {
        const life = fs.life - dt / 900;
        if (life <= 0) continue;
        nextFloating.push({ ...fs, y: fs.y + fs.vy * dtScale, life });
      }
      floatingScoresRef.current = nextFloating;

      const now = Date.now();
      slashTrailRef.current = slashTrailRef.current.filter(s => now - s.t < SLASH_TRAIL_LIFETIME);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [gameState, spawnBatch]);

  // 绘制
  useEffect(() => {
    if (gameState === 'menu') return;
    if (gameState !== 'playing') draw();
    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { w, h } = canvasSizeRef.current;
      const bgKey = `${w}x${h}-${isDark ? 'd' : 'l'}`;
      let bgGrad = bgGradientCacheRef.current;
      if (!bgGrad || bgGrad.key !== bgKey) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        if (isDark) { g.addColorStop(0, '#1a0b2e'); g.addColorStop(0.5, '#16213e'); g.addColorStop(1, '#0f3460'); }
        else { g.addColorStop(0, '#fef3c7'); g.addColorStop(0.5, '#fdba74'); g.addColorStop(1, '#f97316'); }
        bgGrad = { key: bgKey, grad: g };
        bgGradientCacheRef.current = bgGrad;
      }
      ctx.fillStyle = bgGrad.grad;
      ctx.fillRect(0, 0, w, h);
      const decorKey = `${w}x${h}-${isDark ? 'd' : 'l'}`;
      let decor = decorCacheRef.current;
      if (!decor || decor.key !== decorKey) {
        const off = document.createElement('canvas');
        off.width = w; off.height = h;
        const octx = off.getContext('2d');
        if (octx) {
          octx.globalAlpha = 0.12;
          octx.fillStyle = isDark ? '#a78bfa' : '#fff';
          for (let i = 0; i < 5; i++) {
            octx.beginPath();
            octx.arc((i * 137) % w, (i * 89) % h, 40, 0, Math.PI * 2);
            octx.fill();
          }
        }
        decor = { key: decorKey, canvas: off };
        decorCacheRef.current = decor;
      }
      const offsetX = (Date.now() / 50) % w;
      const offsetY = (Date.now() / 80) % h;
      ctx.drawImage(decor.canvas, offsetX, 0);
      if (offsetX > 0) ctx.drawImage(decor.canvas, offsetX - w, 0);

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
      for (const half of halvesRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, half.life);
        ctx.translate(half.x, half.y);
        ctx.rotate(half.rotation);
        ctx.beginPath();
        ctx.rect(half.side === 'left' ? -half.radius : 0, -half.radius, half.radius, half.radius * 2);
        ctx.clip();
        ctx.font = `${half.radius * 2}px serif`;
        ctx.fillText(half.emoji, 0, 0);
        ctx.restore();
      }
      for (const bomb of bombsRef.current) {
        if (bomb.sliced) continue;
        ctx.save();
        ctx.translate(bomb.x, bomb.y);
        ctx.rotate(bomb.rotation);
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.font = `${bomb.radius * 2}px serif`;
        ctx.fillText('💣', 0, 0);
        ctx.restore();
      }
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
      for (const fs of floatingScoresRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, fs.life);
        ctx.font = `bold ${fs.text.includes('x') ? 22 : 18}px sans-serif`;
        ctx.fillStyle = fs.color;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(fs.text, fs.x, fs.y);
        ctx.restore();
      }
      const trail = slashTrailRef.current;
      if (trail.length >= 2) {
        const now = Date.now();
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = isDark ? '#a78bfa' : '#fff';
        ctx.shadowBlur = 12;
        for (let i = 1; i < trail.length; i++) {
          const seg = trail[i], prev = trail[i - 1];
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
    }
  }, [gameState, isDark]);

  // 自适应尺寸
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      if (!container) return;
      const vw = window.innerWidth;
      const maxW = Math.min(vw - 16, 360);
      const maxH = Math.min(window.innerHeight - 240, 360);
      const aspectW = maxW;
      const aspectH = Math.max(280, Math.min(maxH, aspectW));
      const newSize = { w: Math.floor(aspectW), h: Math.floor(aspectH) };
      setCanvasSize(prev => (prev.w === newSize.w && prev.h === newSize.h ? prev : newSize));
      canvasRectRef.current = null;
      bgGradientCacheRef.current = null;
      decorCacheRef.current = null;
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 菜单
  if (gameState === 'menu') {
    return (
      <div
        ref={containerRef}
        className="w-full flex flex-col items-stretch px-2"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
      >
        <div className="text-center mb-5">
          <h1 className={`text-3xl font-black mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>🔪 水果忍者</h1>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>挥刀切水果，躲开炸弹！</p>
          <div className={`mt-1 text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>🏆 最高分 {bestScore}</div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {LEVELS.map(lv => {
            const unlocked = unlockedLevel >= lv.id;
            const completed = unlockedLevel > lv.id;
            return (
              <button type="button"
                key={lv.id}
                onClick={() => unlocked && initLevel(lv.id)}
                disabled={!unlocked}
                className={`min-h-[64px] p-3 rounded-xl text-left transition-all active:scale-[0.98] ${
                  unlocked
                    ? isDark
                      ? 'bg-gradient-to-br from-rose-600/30 to-orange-600/30 border border-rose-500/40 shadow-md'
                      : 'bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200 shadow-md'
                    : isDark
                      ? 'bg-gray-800/30 border border-gray-700/50 opacity-50'
                      : 'bg-gray-100/50 border border-gray-200/50 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{unlocked ? `第 ${lv.id} 关 · ${lv.name}` : '🔒'}</span>
                  {completed && <span>⭐</span>}
                </div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>目标 {lv.targetScore} 分 · {lv.timeLimit}s</div>
                <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{lv.description}</div>
              </button>
            );
          })}
        </div>
        <p className={`mt-4 text-center text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          手指滑动切割 · 连击 3+ 额外加分 · 💣 扣命
        </p>
      </div>
    );
  }

  // 游戏界面
  return (
    <div
      ref={containerRef}
      className="w-full flex flex-col items-stretch px-2"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
    >
      {/* 顶部核心信息 */}
      <div className="flex gap-2 mb-2">
        <div className={`flex-1 px-3 py-2 rounded-xl ${isDark ? 'bg-rose-500/20' : 'bg-rose-100'}`}>
          <div className={`text-[10px] font-semibold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>第 {currentLevel} 关 · {level.name}</div>
          <div className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{score} / {level.targetScore}</div>
        </div>
        <div className={`flex-1 px-3 py-2 rounded-xl ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
          <div className={`text-[10px] font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}>生命</div>
          <div className={`text-base font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {'❤️'.repeat(Math.max(0, lives))}{'🤍'.repeat(Math.max(0, MAX_LIVES - lives))}
          </div>
        </div>
        <div className={`flex-1 px-3 py-2 rounded-xl ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
          <div className={`text-[10px] font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>时间</div>
          <div className={`text-lg font-black ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : isDark ? 'text-white' : 'text-gray-800'}`}>
            {timeLeft}s
          </div>
        </div>
      </div>

      {/* 进度条 */}
      <div className={`mb-2 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div
          className="h-full bg-gradient-to-r from-rose-400 to-orange-500 transition-all duration-300"
          style={{ width: `${Math.min(100, (score / level.targetScore) * 100)}%` }}
        />
      </div>

      {/* 连击 */}
      {combo >= 3 && gameState === 'playing' && (
        <div className="mb-1 text-center">
          <span className={`inline-block px-3 py-0.5 rounded-full font-bold text-xs animate-pulse ${
            isDark ? 'bg-amber-500/30 text-amber-300' : 'bg-amber-100 text-amber-700'
          }`}>
            🔥 {combo} 连击! +{Math.min(combo - 2, 5)} 奖励
          </span>
        </div>
      )}

      {/* Canvas */}
      <div
        className="mx-auto touch-none select-none rounded-xl overflow-hidden border-2 shadow-xl relative"
        style={{
          width: canvasSize.w, height: canvasSize.h,
          borderColor: isDark ? '#374151' : '#d1d5db',
          cursor: 'crosshair', willChange: 'contents', contain: 'layout paint',
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
        {gameState === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center px-3">
              <div className="text-2xl font-black text-white mb-1">⏸️ 暂停</div>
              <div className="text-xs text-gray-300">点击继续按钮</div>
            </div>
          </div>
        )}
        {gameState === 'over' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center px-3">
              <div className="text-2xl font-black text-red-400 mb-1">{timeLeft <= 0 ? '⏰ 时间到!' : '💥 结束'}</div>
              <div className="text-xs text-gray-300 mb-1">得分 {score} / {level.targetScore}</div>
              {isNewRecord && <div className="text-amber-400 font-bold animate-pulse text-xs">🏆 新纪录!</div>}
            </div>
          </div>
        )}
        {gameState === 'win' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center px-3">
              <div className="text-2xl font-black text-emerald-400 mb-1">🎉 通关!</div>
              <div className="text-xs text-gray-300 mb-1">得分 {score}</div>
              {isNewRecord && <div className="text-amber-400 font-bold animate-pulse text-xs">🏆 新纪录!</div>}
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮（拇指可达区） */}
      <div className="mt-3 grid grid-cols-3 gap-2 max-w-[360px] mx-auto w-full">
        {gameState === 'playing' && (
          <>
            <button type="button" onClick={() => setGameState('paused')} className={`min-h-[44px] py-2.5 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-amber-500/80 text-white' : 'bg-amber-500 text-white'}`}>⏸ 暂停</button>
            <button type="button" onClick={() => initLevel(currentLevel)} className={`min-h-[44px] py-2.5 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-gray-600 text-white' : 'bg-gray-500 text-white'}`}>🔄 重来</button>
            <button type="button" onClick={() => setGameState('menu')} className={`min-h-[44px] py-2.5 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-slate-600 text-white' : 'bg-slate-500 text-white'}`}>📋 菜单</button>
          </>
        )}
        {gameState === 'paused' && (
          <>
            <button type="button" onClick={() => setGameState('playing')} className={`min-h-[44px] py-2.5 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-emerald-500/80 text-white' : 'bg-emerald-500 text-white'}`}>▶️ 继续</button>
            <button type="button" onClick={() => initLevel(currentLevel)} className={`min-h-[44px] py-2.5 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-gray-600 text-white' : 'bg-gray-500 text-white'}`}>🔄</button>
            <button type="button" onClick={() => setGameState('menu')} className={`min-h-[44px] py-2.5 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-slate-600 text-white' : 'bg-slate-500 text-white'}`}>📋</button>
          </>
        )}
        {(gameState === 'over' || gameState === 'win') && (
          <>
            <button type="button" onClick={() => initLevel(currentLevel)} className={`min-h-[44px] py-2.5 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-emerald-500/80 text-white' : 'bg-emerald-500 text-white'}`}>🔄 再来</button>
            {gameState === 'win' && currentLevel < 4 ? (
              <button type="button" onClick={() => initLevel(currentLevel + 1)} className={`min-h-[44px] py-2.5 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-blue-500/80 text-white' : 'bg-blue-500 text-white'}`}>➡️ 下一关</button>
            ) : (<div />)}
            <button type="button" onClick={() => setGameState('menu')} className={`min-h-[44px] py-2.5 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-slate-600 text-white' : 'bg-slate-500 text-white'}`}>📋 菜单</button>
          </>
        )}
      </div>
      <p className={`mt-2 text-center text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>手指在画布上滑动切割水果</p>
    </div>
  );
}