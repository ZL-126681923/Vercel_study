'use client';

/**
 * 贪吃蛇共享游戏逻辑（PC + Mobile 共用）
 * - 暴露所有游戏数据 ref + 单步函数 step + 速度 ref，由调用方驱动 RAF 循环
 * - PC/Mobile 两套 UI 共用此 hook，仅 JSX 不同
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getScores, updateScore } from '@/lib/gameScores';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type Point = { x: number; y: number };
export type GameState = 'menu' | 'playing' | 'paused' | 'over' | 'win';
export type AISnakeType = 'path' | 'chase' | 'random' | 'fast';

export interface AISnake {
  id: number;
  body: Point[];
  direction: Direction;
  type: AISnakeType;
  alive: boolean;
  respawnAt: number | null;
  pathIndex?: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  gridSize: number;
  targetLength: number;
  walls: Point[];
  dynamicWallCount: number;
  dynamicWallInterval: number;
  aiSnakes: { type: AISnakeType; initialPos: Point }[];
  initialSpeed: number;
}

const DIR_VECTORS: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const OPPOSITE_DIR: Record<Direction, Direction> = {
  UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT',
};

const SPEED_UP_EVERY = 3;
const SPEED_UP_AMOUNT = 6;
const RESPAWN_TIME = 15000;
const MAX_INPUT_QUEUE = 2;

export const LEVELS: LevelConfig[] = [
  {
    id: 1, name: '初出茅庐', description: '熟悉操作，吃到 10 节过关',
    gridSize: 20, targetLength: 10, walls: [], dynamicWallCount: 0, dynamicWallInterval: 0,
    aiSnakes: [], initialSpeed: 170,
  },
  {
    id: 2, name: '障碍入门', description: '小心墙体和敌方蛇！长度 15 过关',
    gridSize: 20, targetLength: 15,
    walls: [
      { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 },
      { x: 3, y: 4 }, { x: 5, y: 4 },
      { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 },
      { x: 14, y: 3 }, { x: 15, y: 3 }, { x: 16, y: 3 },
      { x: 14, y: 4 }, { x: 16, y: 4 },
      { x: 14, y: 5 }, { x: 15, y: 5 }, { x: 16, y: 5 },
      { x: 3, y: 14 }, { x: 4, y: 14 }, { x: 5, y: 14 },
      { x: 3, y: 15 }, { x: 5, y: 15 },
      { x: 3, y: 16 }, { x: 4, y: 16 }, { x: 5, y: 16 },
      { x: 14, y: 14 }, { x: 15, y: 14 }, { x: 16, y: 14 },
      { x: 14, y: 15 }, { x: 16, y: 15 },
      { x: 14, y: 16 }, { x: 15, y: 16 }, { x: 16, y: 16 },
    ],
    dynamicWallCount: 0, dynamicWallInterval: 0,
    aiSnakes: [{ type: 'path', initialPos: { x: 10, y: 10 } }],
    initialSpeed: 160,
  },
  {
    id: 3, name: '双重威胁', description: '25×25 大地图，动态障碍 + 2 条 AI 蛇！长度 20 过关',
    gridSize: 25, targetLength: 20,
    walls: [
      ...[0, 1, 2].map(i => ({ x: i, y: 8 })),
      ...[22, 23, 24].map(i => ({ x: i, y: 8 })),
      ...[0, 1, 2].map(i => ({ x: i, y: 16 })),
      ...[22, 23, 24].map(i => ({ x: i, y: 16 })),
      ...[0, 1, 2].map(i => ({ x: i, y: 8 })),
      ...[0, 1, 2].map(i => ({ x: i, y: 16 })),
      ...[0, 1, 2].map(i => ({ x: 8, y: i })),
      ...[0, 1, 2].map(i => ({ x: 16, y: i })),
      ...[0, 1, 2].map(i => ({ x: 8, y: 24 - i })),
      ...[0, 1, 2].map(i => ({ x: 16, y: 24 - i })),
      { x: 12, y: 12 }, { x: 13, y: 12 }, { x: 12, y: 13 }, { x: 13, y: 13 },
    ],
    dynamicWallCount: 5, dynamicWallInterval: 10000,
    aiSnakes: [
      { type: 'chase', initialPos: { x: 5, y: 5 } },
      { type: 'random', initialPos: { x: 19, y: 19 } },
    ],
    initialSpeed: 150,
  },
  {
    id: 4, name: '终极挑战', description: '30×30 终极战场！2 追踪 + 1 高机动，长度 30 通关！',
    gridSize: 30, targetLength: 30,
    walls: [
      ...Array.from({ length: 5 }, (_, i) => ({ x: i, y: i })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 29 - i, y: i })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: i, y: 29 - i })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 29 - i, y: 29 - i })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 15, y: 10 + i })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 13 + i, y: 15 })),
      { x: 7, y: 15 }, { x: 8, y: 15 }, { x: 9, y: 15 },
      { x: 20, y: 15 }, { x: 21, y: 15 }, { x: 22, y: 15 },
      { x: 15, y: 7 }, { x: 15, y: 8 }, { x: 15, y: 9 },
      { x: 15, y: 20 }, { x: 15, y: 21 }, { x: 15, y: 22 },
    ],
    dynamicWallCount: 6, dynamicWallInterval: 8000,
    aiSnakes: [
      { type: 'chase', initialPos: { x: 5, y: 5 } },
      { type: 'chase', initialPos: { x: 24, y: 5 } },
      { type: 'fast', initialPos: { x: 15, y: 25 } },
    ],
    initialSpeed: 140,
  },
];

const pointEq = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const isInBounds = (p: Point, size: number) => p.x >= 0 && p.x < size && p.y >= 0 && p.y < size;
const manhattanDist = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const lerpColor = (c1: [number, number, number], c2: [number, number, number], t: number): string => {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  return `rgb(${r},${g},${b})`;
};

export const SNAKE_AI_COLORS: Record<AISnakeType, [number, number, number]> = {
  chase: [239, 68, 68],
  fast: [249, 115, 22],
  random: [148, 163, 184],
  path: [148, 163, 184],
};

export function drawSnakeCanvas(
  ctx: CanvasRenderingContext2D,
  snake: Point[],
  aiSnakes: AISnake[],
  walls: Point[],
  dynWalls: Point[],
  food: Point,
  cellSize: number,
  gridSize: number,
  isDark: boolean,
  foodPulse: number,
) {
  const cell = cellSize;
  const w = gridSize * cell;

  ctx.clearRect(0, 0, w, w);

  const bgGrad = ctx.createLinearGradient(0, 0, w, w);
  if (isDark) {
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#1e293b');
  } else {
    bgGrad.addColorStop(0, '#f8fafc');
    bgGrad.addColorStop(1, '#e2e8f0');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, w);

  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridSize; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, w);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cell);
    ctx.lineTo(w, i * cell);
    ctx.stroke();
  }

  for (const wall of walls) {
    const x = wall.x * cell;
    const y = wall.y * cell;
    const wallGrad = ctx.createLinearGradient(x, y, x + cell, y + cell);
    if (isDark) {
      wallGrad.addColorStop(0, '#57534e');
      wallGrad.addColorStop(1, '#44403c');
    } else {
      wallGrad.addColorStop(0, '#78716c');
      wallGrad.addColorStop(1, '#57534e');
    }
    ctx.fillStyle = wallGrad;
    ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
  }

  for (const wall of dynWalls) {
    const x = wall.x * cell;
    const y = wall.y * cell;
    ctx.save();
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 6;
    ctx.fillStyle = isDark ? 'rgba(245,158,11,0.7)' : 'rgba(245,158,11,0.8)';
    ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    ctx.restore();
  }

  const fx = food.x * cell;
  const fy = food.y * cell;
  const pulse = Math.sin(foodPulse / 200) * 0.15 + 0.85;
  ctx.save();
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 10 * pulse;
  const foodGrad = ctx.createRadialGradient(fx + cell / 2, fy + cell / 2, 0, fx + cell / 2, fy + cell / 2, cell / 2);
  foodGrad.addColorStop(0, '#fca5a5');
  foodGrad.addColorStop(1, '#dc2626');
  ctx.fillStyle = foodGrad;
  ctx.beginPath();
  ctx.arc(fx + cell / 2, fy + cell / 2, (cell / 2 - 2) * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  for (const ai of aiSnakes) {
    if (!ai.alive) continue;
    const baseColor = SNAKE_AI_COLORS[ai.type];
    for (let i = 0; i < ai.body.length; i++) {
      const p = ai.body[i];
      const x = p.x * cell;
      const y = p.y * cell;
      const t = i / Math.max(1, ai.body.length - 1);
      const color = lerpColor(baseColor, [Math.floor(baseColor[0] * 0.5), Math.floor(baseColor[1] * 0.5), Math.floor(baseColor[2] * 0.5)], t);
      ctx.fillStyle = color;
      if (i === 0) {
        ctx.save();
        ctx.shadowColor = `rgb(${baseColor.join(',')})`;
        ctx.shadowBlur = 5;
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        ctx.restore();
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + cell * 0.2, y + cell * 0.2, 2, 2);
        ctx.fillRect(x + cell * 0.6, y + cell * 0.2, 2, 2);
      } else {
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      }
    }
  }

  for (let i = snake.length - 1; i >= 0; i--) {
    const p = snake[i];
    const x = p.x * cell;
    const y = p.y * cell;
    if (i === 0) {
      ctx.save();
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 8;
      const headGrad = ctx.createLinearGradient(x, y, x + cell, y + cell);
      headGrad.addColorStop(0, isDark ? '#34d399' : '#10b981');
      headGrad.addColorStop(1, isDark ? '#10b981' : '#059669');
      ctx.fillStyle = headGrad;
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + cell * 0.2, y + cell * 0.2, 2, 2);
      ctx.fillRect(x + cell * 0.6, y + cell * 0.2, 2, 2);
      ctx.fillStyle = '#000';
      ctx.fillRect(x + cell * 0.25, y + cell * 0.25, 1, 1);
      ctx.fillRect(x + cell * 0.65, y + cell * 0.25, 1, 1);
    } else {
      const t = i / Math.max(1, snake.length - 1);
      const bodyColor = isDark
        ? lerpColor([52, 211, 153], [6, 95, 70], t)
        : lerpColor([16, 185, 129], [4, 120, 87], t);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    }
  }
}

export interface SnakeGameController {
  // 状态
  gameState: GameState;
  score: number;
  snakeLength: number;
  aliveAiCount: number;
  highScore: number;
  isNewRecord: boolean;
  unlockedLevel: number;
  currentLevel: number;
  level: LevelConfig;

  // refs
  playerSnakeRef: React.MutableRefObject<Point[]>;
  foodRef: React.MutableRefObject<Point>;
  wallsRef: React.MutableRefObject<Point[]>;
  dynamicWallsRef: React.MutableRefObject<Point[]>;
  aiSnakesRef: React.MutableRefObject<AISnake[]>;
  speedRef: React.MutableRefObject<number>;
  foodPulseRef: React.MutableRefObject<number>;

  // 行为
  initLevel: (levelId: number) => void;
  step: () => void;
  enqueueDirection: (d: Direction) => void;
  resetCurrentLevel: () => void;
  pauseToggle: () => void;
  goToMenu: () => void;
}

export function useSnakeGame(): SnakeGameController {
  const [unlockedLevel, setUnlockedLevel] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    try {
      const raw = localStorage.getItem('snake_progress');
      return raw ? (JSON.parse(raw).unlockedLevel ?? 1) : 1;
    } catch { return 1; }
  });
  const [currentLevel, setCurrentLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const raw = localStorage.getItem('snake_progress');
      return raw ? (JSON.parse(raw).highScore ?? 0) : 0;
    } catch { return 0; }
  });
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [snakeLength, setSnakeLength] = useState(3);
  const [aliveAiCount, setAliveAiCount] = useState(0);

  const playerSnakeRef = useRef<Point[]>([{ x: 5, y: 10 }]);
  const foodRef = useRef<Point>({ x: 15, y: 10 });
  const wallsRef = useRef<Point[]>([]);
  const dynamicWallsRef = useRef<Point[]>([]);
  const aiSnakesRef = useRef<AISnake[]>([]);
  const directionRef = useRef<Direction>('RIGHT');
  const inputQueueRef = useRef<Direction[]>([]);
  const scoreRef = useRef(0);
  const speedRef = useRef(170);
  const currentLevelRef = useRef(1);
  const aiMoveCounterRef = useRef(0);
  const foodPulseRef = useRef(0);

  const level = LEVELS[currentLevel - 1];

  useEffect(() => {
    const raw = localStorage.getItem('snake_progress');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data.unlockedLevel) setUnlockedLevel(data.unlockedLevel);
        if (data.highScore) setHighScore(data.highScore);
      } catch { /* ignore */ }
    }
  }, []);

  const isOccupied = useCallback((
    pos: Point, snake: Point[], wallList: Point[], dynWalls: Point[],
    aiList: AISnake[], excludeHead = false,
  ): boolean => {
    for (let i = excludeHead ? 1 : 0; i < snake.length; i++) {
      if (pointEq(snake[i], pos)) return true;
    }
    for (const w of wallList) if (pointEq(w, pos)) return true;
    for (const w of dynWalls) if (pointEq(w, pos)) return true;
    for (const ai of aiList) {
      if (!ai.alive) continue;
      for (const p of ai.body) if (pointEq(p, pos)) return true;
    }
    return false;
  }, []);

  const generateSafePoint = useCallback((
    snake: Point[], wallList: Point[], dynWalls: Point[], aiList: AISnake[], avoidEdges = 2,
  ): Point => {
    let p: Point;
    let attempts = 0;
    const size = LEVELS[currentLevelRef.current - 1].gridSize;
    do {
      p = {
        x: Math.floor(Math.random() * (size - avoidEdges * 2)) + avoidEdges,
        y: Math.floor(Math.random() * (size - avoidEdges * 2)) + avoidEdges,
      };
      attempts++;
    } while (isOccupied(p, snake, wallList, dynWalls, aiList, false) && attempts < 500);
    return p;
  }, [isOccupied]);

  const generateFood = useCallback((
    snake: Point[], wallList: Point[], dynWalls: Point[], aiList: AISnake[],
  ): Point => generateSafePoint(snake, wallList, dynWalls, aiList, 1), [generateSafePoint]);

  const refreshDynamicWalls = useCallback((
    snake: Point[], wallList: Point[], aiList: AISnake[], count: number,
  ): Point[] => {
    const newWalls: Point[] = [];
    for (let i = 0; i < count; i++) {
      const p = generateSafePoint(snake, [...wallList, ...newWalls], [], aiList, 3);
      newWalls.push(p);
    }
    return newWalls;
  }, [generateSafePoint]);

  const getAIDirection = useCallback((
    ai: AISnake, playerHead: Point, wallList: Point[], dynWalls: Point[],
    allAiSnakes: AISnake[], gridSize: number,
  ): Direction => {
    const head = ai.body[0];
    const possibleDirs: Direction[] = (['UP', 'DOWN', 'LEFT', 'RIGHT'] as Direction[]).filter(
      d => d !== OPPOSITE_DIR[ai.direction],
    );
    const safeDirs: Direction[] = [];
    for (const dir of possibleDirs) {
      const vec = DIR_VECTORS[dir];
      const nextPos = { x: head.x + vec.x, y: head.y + vec.y };
      if (!isInBounds(nextPos, gridSize)) continue;
      let collision = false;
      for (const w of wallList) { if (pointEq(w, nextPos)) { collision = true; break; } }
      if (collision) continue;
      for (const w of dynWalls) { if (pointEq(w, nextPos)) { collision = true; break; } }
      if (collision) continue;
      for (let i = 1; i < ai.body.length; i++) {
        if (pointEq(ai.body[i], nextPos)) { collision = true; break; }
      }
      if (collision) continue;
      for (const other of allAiSnakes) {
        if (other.id === ai.id || !other.alive) continue;
        for (const p of other.body) {
          if (pointEq(p, nextPos)) { collision = true; break; }
        }
        if (collision) break;
      }
      if (collision) continue;
      safeDirs.push(dir);
    }
    if (safeDirs.length === 0) return ai.direction;
    if (ai.type === 'chase') {
      let bestDir = safeDirs[0]; let bestDist = Infinity;
      for (const dir of safeDirs) {
        const nextPos = { x: head.x + DIR_VECTORS[dir].x, y: head.y + DIR_VECTORS[dir].y };
        const dist = manhattanDist(nextPos, playerHead);
        if (dist < bestDist) { bestDist = dist; bestDir = dir; }
      }
      return bestDir;
    }
    if (ai.type === 'fast') {
      if (Math.random() < 0.6) return safeDirs[Math.floor(Math.random() * safeDirs.length)];
      let bestDir = safeDirs[0]; let bestDist = Infinity;
      for (const dir of safeDirs) {
        const nextPos = { x: head.x + DIR_VECTORS[dir].x, y: head.y + DIR_VECTORS[dir].y };
        const dist = manhattanDist(nextPos, playerHead);
        if (dist < bestDist) { bestDist = dist; bestDir = dir; }
      }
      return bestDir;
    }
    if (ai.type === 'path') {
      const pathTargets = [
        { x: 10, y: 10 }, { x: 15, y: 10 }, { x: 15, y: 15 }, { x: 10, y: 15 },
      ];
      const target = pathTargets[ai.pathIndex ?? 0];
      if (manhattanDist(head, target) <= 1) {
        ai.pathIndex = ((ai.pathIndex ?? 0) + 1) % pathTargets.length;
      }
      const tgt = pathTargets[ai.pathIndex ?? 0];
      let bestDir = safeDirs[0]; let bestDist = Infinity;
      for (const dir of safeDirs) {
        const nextPos = { x: head.x + DIR_VECTORS[dir].x, y: head.y + DIR_VECTORS[dir].y };
        const dist = manhattanDist(nextPos, tgt);
        if (dist < bestDist) { bestDist = dist; bestDir = dir; }
      }
      return bestDir;
    }
    return safeDirs[Math.floor(Math.random() * safeDirs.length)];
  }, []);

  const initLevel = useCallback((levelId: number) => {
    const lv = LEVELS[levelId - 1];
    const initialSnake = [
      { x: 3, y: Math.floor(lv.gridSize / 2) },
      { x: 2, y: Math.floor(lv.gridSize / 2) },
      { x: 1, y: Math.floor(lv.gridSize / 2) },
    ];
    const aiList: AISnake[] = lv.aiSnakes.map((cfg, idx) => ({
      id: idx,
      body: [{ ...cfg.initialPos }],
      direction: cfg.type === 'path' ? 'RIGHT' : 'DOWN',
      type: cfg.type,
      alive: true,
      respawnAt: null,
      pathIndex: 0,
    }));
    const dynWalls = lv.dynamicWallCount > 0
      ? refreshDynamicWalls(initialSnake, lv.walls, aiList, lv.dynamicWallCount)
      : [];
    playerSnakeRef.current = initialSnake;
    foodRef.current = generateFood(initialSnake, lv.walls, dynWalls, aiList);
    wallsRef.current = lv.walls;
    dynamicWallsRef.current = dynWalls;
    aiSnakesRef.current = aiList;
    directionRef.current = 'RIGHT';
    inputQueueRef.current = [];
    scoreRef.current = 0;
    speedRef.current = lv.initialSpeed;
    currentLevelRef.current = levelId;
    aiMoveCounterRef.current = 0;

    setScore(0);
    setCurrentLevel(levelId);
    setIsNewRecord(false);
    setSnakeLength(initialSnake.length);
    setAliveAiCount(aiList.filter(a => a.alive).length);
    setGameState('playing');
  }, [generateFood, refreshDynamicWalls]);

  const enqueueDirection = useCallback((newDir: Direction) => {
    const queue = inputQueueRef.current;
    const lastDir = queue.length > 0 ? queue[queue.length - 1] : directionRef.current;
    if (newDir === lastDir || newDir === OPPOSITE_DIR[lastDir]) return;
    if (queue.length < MAX_INPUT_QUEUE) queue.push(newDir);
  }, []);

  // 单步游戏逻辑
  const step = useCallback(() => {
    const lv = LEVELS[currentLevelRef.current - 1];
    const snake = playerSnakeRef.current;
    const walls = wallsRef.current;
    const dynWalls = dynamicWallsRef.current;
    const ais = aiSnakesRef.current;
    const food = foodRef.current;

    if (inputQueueRef.current.length > 0) {
      directionRef.current = inputQueueRef.current.shift()!;
    }
    const dir = directionRef.current;
    const vec = DIR_VECTORS[dir];
    const head = snake[0];
    const newHead = { x: head.x + vec.x, y: head.y + vec.y };

    let died = false;
    let hitAiSnake: AISnake | null = null;
    let hitAiHead = false;

    if (!isInBounds(newHead, lv.gridSize)) died = true;
    if (!died) {
      for (let i = 1; i < snake.length; i++) {
        if (pointEq(snake[i], newHead)) { died = true; break; }
      }
    }
    if (!died) {
      for (const w of walls) { if (pointEq(w, newHead)) { died = true; break; } }
    }
    if (!died) {
      for (const w of dynWalls) { if (pointEq(w, newHead)) { died = true; break; } }
    }
    if (!died) {
      for (const ai of ais) {
        if (!ai.alive) continue;
        for (let i = 0; i < ai.body.length; i++) {
          if (pointEq(ai.body[i], newHead)) {
            hitAiSnake = ai;
            hitAiHead = i === 0;
            died = true;
            break;
          }
        }
        if (hitAiSnake) break;
      }
    }

    if (died) {
      if (hitAiSnake && !hitAiHead) {
        const gainLength = Math.min(4, hitAiSnake.body.length);
        const newSnake = [newHead, ...snake];
        for (let i = 0; i < gainLength - 1; i++) {
          newSnake.push({ ...snake[snake.length - 1] });
        }
        playerSnakeRef.current = newSnake;
        aiSnakesRef.current = ais.map(ai =>
          ai.id === hitAiSnake!.id
            ? { ...ai, alive: false, respawnAt: Date.now() + RESPAWN_TIME }
            : ai,
        );
        const newScore = scoreRef.current + gainLength;
        scoreRef.current = newScore;
        setScore(newScore);
        setSnakeLength(newSnake.length);
        setAliveAiCount(aiSnakesRef.current.filter(a => a.alive).length);
        if (newSnake.length >= lv.targetLength) {
          setUnlockedLevel(u => Math.max(u, currentLevelRef.current + 1));
          const wasRecord = newScore > getScores().snake.highScore;
          if (wasRecord) {
            updateScore('snake', p => ({ ...p, highScore: Math.max(p.highScore, newScore), totalGames: p.totalGames + 1 }));
            setHighScore(Math.max(highScore, newScore));
          } else {
            updateScore('snake', p => ({ ...p, totalGames: p.totalGames + 1 }));
          }
          setIsNewRecord(wasRecord);
          const raw = localStorage.getItem('snake_progress');
          const data = raw ? JSON.parse(raw) : {};
          localStorage.setItem('snake_progress', JSON.stringify({
            unlockedLevel: Math.max(data.unlockedLevel || 1, currentLevelRef.current + 1),
            highScore: Math.max(data.highScore || 0, newScore),
          }));
          setGameState('win');
          return;
        }
        return;
      }
      const wasRecord = scoreRef.current > getScores().snake.highScore;
      if (wasRecord) {
        updateScore('snake', p => ({ ...p, highScore: Math.max(p.highScore, scoreRef.current), totalGames: p.totalGames + 1 }));
        setHighScore(Math.max(highScore, scoreRef.current));
      } else {
        updateScore('snake', p => ({ ...p, totalGames: p.totalGames + 1 }));
      }
      setIsNewRecord(wasRecord);
      setGameState('over');
      return;
    }

    let newSnake: Point[];
    if (pointEq(newHead, food)) {
      newSnake = [newHead, ...snake];
      const newFood = generateFood(newSnake, walls, dynWalls, ais);
      foodRef.current = newFood;
      const newScore = scoreRef.current + 1;
      scoreRef.current = newScore;
      setScore(newScore);
      if (newScore > 0 && newScore % SPEED_UP_EVERY === 0) {
        speedRef.current = Math.max(60, speedRef.current - SPEED_UP_AMOUNT);
      }
      if (newSnake.length >= lv.targetLength) {
        playerSnakeRef.current = newSnake;
        const wasRecord = newScore > getScores().snake.highScore;
        if (wasRecord) {
          updateScore('snake', p => ({ ...p, highScore: Math.max(p.highScore, newScore), totalGames: p.totalGames + 1 }));
          setHighScore(Math.max(highScore, newScore));
        } else {
          updateScore('snake', p => ({ ...p, totalGames: p.totalGames + 1 }));
        }
        setIsNewRecord(wasRecord);
        setUnlockedLevel(u => Math.max(u, currentLevelRef.current + 1));
        const raw = localStorage.getItem('snake_progress');
        const data = raw ? JSON.parse(raw) : {};
        localStorage.setItem('snake_progress', JSON.stringify({
          unlockedLevel: Math.max(data.unlockedLevel || 1, currentLevelRef.current + 1),
          highScore: Math.max(data.highScore || 0, newScore),
        }));
        setGameState('win');
        return;
      }
    } else {
      newSnake = [newHead, ...snake.slice(0, -1)];
    }
    playerSnakeRef.current = newSnake;

    aiMoveCounterRef.current++;
    const playerHead = newHead;
    aiSnakesRef.current = ais.map(ai => {
      if (!ai.alive) {
        if (ai.respawnAt && Date.now() >= ai.respawnAt) {
          let newPos: Point | null = null;
          for (let attempt = 0; attempt < 50; attempt++) {
            const candidate = {
              x: Math.floor(Math.random() * (lv.gridSize - 6)) + 3,
              y: Math.floor(Math.random() * (lv.gridSize - 6)) + 3,
            };
            if (manhattanDist(candidate, playerHead) < 6) continue;
            if (isOccupied(candidate, playerSnakeRef.current, walls, dynWalls, aiSnakesRef.current, false)) continue;
            newPos = candidate;
            break;
          }
          if (newPos) {
            return { ...ai, alive: true, body: [newPos], direction: 'DOWN', respawnAt: null };
          }
        }
        return ai;
      }
      const moveInterval = ai.type === 'fast' ? 1 : 2;
      if (aiMoveCounterRef.current % moveInterval !== 0) return ai;
      const newDir = getAIDirection(ai, playerHead, walls, dynWalls, aiSnakesRef.current, lv.gridSize);
      const v = DIR_VECTORS[newDir];
      const aiHead = ai.body[0];
      const aiNewHead = { x: aiHead.x + v.x, y: aiHead.y + v.y };
      if (!isInBounds(aiNewHead, lv.gridSize)) return { ...ai, direction: newDir };
      for (let i = 1; i < ai.body.length; i++) {
        if (pointEq(ai.body[i], aiNewHead)) return ai;
      }
      const newBody = ai.body.length < 5
        ? [aiNewHead, ...ai.body]
        : [aiNewHead, ...ai.body.slice(0, -1)];
      return { ...ai, body: newBody, direction: newDir };
    });

    setSnakeLength(playerSnakeRef.current.length);
    setAliveAiCount(aiSnakesRef.current.filter(a => a.alive).length);
  }, [generateFood, getAIDirection, isOccupied, highScore]);

  const resetCurrentLevel = useCallback(() => initLevel(currentLevel), [initLevel, currentLevel]);
  const pauseToggle = useCallback(() => {
    setGameState(prev => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
  }, []);
  const goToMenu = useCallback(() => setGameState('menu'), []);

  return {
    gameState, score, snakeLength, aliveAiCount, highScore, isNewRecord,
    unlockedLevel, currentLevel, level,
    playerSnakeRef, foodRef, wallsRef, dynamicWallsRef, aiSnakesRef,
    speedRef, foodPulseRef,
    initLevel, step, enqueueDirection, resetCurrentLevel, pauseToggle, goToMenu,
  };
}