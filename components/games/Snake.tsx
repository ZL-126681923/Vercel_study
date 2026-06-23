'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { getScores, updateScore } from '@/lib/gameScores';

// ============ 类型定义 ============
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Point = { x: number; y: number };
type GameState = 'menu' | 'playing' | 'paused' | 'over' | 'win';
type AISnakeType = 'path' | 'chase' | 'random' | 'fast';

interface AISnake {
  id: number;
  body: Point[];
  direction: Direction;
  type: AISnakeType;
  alive: boolean;
  respawnAt: number | null;
  pathIndex?: number; // path 型 AI 使用
}

interface LevelConfig {
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

// ============ 常量 ============
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

// ============ 关卡配置 ============
const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: '初出茅庐',
    description: '熟悉操作，吃到 10 节过关',
    gridSize: 20,
    targetLength: 10,
    walls: [],
    dynamicWallCount: 0,
    dynamicWallInterval: 0,
    aiSnakes: [],
    initialSpeed: 170,
  },
  {
    id: 2,
    name: '障碍入门',
    description: '小心墙体和敌方蛇！长度 15 过关',
    gridSize: 20,
    targetLength: 15,
    walls: [
      // 四角各一个 3×3 方块（共 28 格，占 7%）
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
    dynamicWallCount: 0,
    dynamicWallInterval: 0,
    aiSnakes: [{ type: 'path', initialPos: { x: 10, y: 10 } }],
    initialSpeed: 160,
  },
  {
    id: 3,
    name: '双重威胁',
    description: '25×25 大地图，动态障碍 + 2 条 AI 蛇！长度 20 过关',
    gridSize: 25,
    targetLength: 20,
    walls: [
      // 四个 L 形障碍
      ...[0, 1, 2].map(i => ({ x: i, y: 8 })),
      ...[22, 23, 24].map(i => ({ x: i, y: 8 })),
      ...[0, 1, 2].map(i => ({ x: i, y: 16 })),
      ...[22, 23, 24].map(i => ({ x: i, y: 16 })),
      ...[0, 1, 2].map(i => ({ x: 8, y: i })),
      ...[0, 1, 2].map(i => ({ x: 16, y: i })),
      ...[0, 1, 2].map(i => ({ x: 8, y: 24 - i })),
      ...[0, 1, 2].map(i => ({ x: 16, y: 24 - i })),
      // 中心小障碍
      { x: 12, y: 12 }, { x: 13, y: 12 }, { x: 12, y: 13 }, { x: 13, y: 13 },
    ],
    dynamicWallCount: 5,
    dynamicWallInterval: 10000,
    aiSnakes: [
      { type: 'chase', initialPos: { x: 5, y: 5 } },
      { type: 'random', initialPos: { x: 19, y: 19 } },
    ],
    initialSpeed: 150,
  },
  {
    id: 4,
    name: '终极挑战',
    description: '30×30 终极战场！2 追踪 + 1 高机动，长度 30 通关！',
    gridSize: 30,
    targetLength: 30,
    walls: [
      // 四角斜线
      ...Array.from({ length: 5 }, (_, i) => ({ x: i, y: i })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 29 - i, y: i })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: i, y: 29 - i })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 29 - i, y: 29 - i })),
      // 中心十字
      ...Array.from({ length: 5 }, (_, i) => ({ x: 15, y: 10 + i })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 13 + i, y: 15 })),
      // 分散小障碍
      { x: 7, y: 15 }, { x: 8, y: 15 }, { x: 9, y: 15 },
      { x: 20, y: 15 }, { x: 21, y: 15 }, { x: 22, y: 15 },
      { x: 15, y: 7 }, { x: 15, y: 8 }, { x: 15, y: 9 },
      { x: 15, y: 20 }, { x: 15, y: 21 }, { x: 15, y: 22 },
    ],
    dynamicWallCount: 6,
    dynamicWallInterval: 8000,
    aiSnakes: [
      { type: 'chase', initialPos: { x: 5, y: 5 } },
      { type: 'chase', initialPos: { x: 24, y: 5 } },
      { type: 'fast', initialPos: { x: 15, y: 25 } },
    ],
    initialSpeed: 140,
  },
];

// ============ 工具函数 ============
const pointEq = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

const isInBounds = (p: Point, size: number) =>
  p.x >= 0 && p.x < size && p.y >= 0 && p.y < size;

const manhattanDist = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// 颜色插值：从渐变色中按比例取色
const lerpColor = (c1: [number, number, number], c2: [number, number, number], t: number): string => {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  return `rgb(${r},${g},${b})`;
};

// ============ 主组件 ============
export default function Snake() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // ---- UI 状态 ----
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  // UI 显示用状态（每次 gameStep 后同步）
  const [snakeLength, setSnakeLength] = useState(3);
  const [aliveAiCount, setAliveAiCount] = useState(0);

  // ---- 游戏数据（用 ref 存储实际状态，避免重渲染）----
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
  const lastStepTimeRef = useRef(0);

  // ---- 渲染相关 ----
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const dynamicWallTimerRef = useRef<number | null>(null);
  const foodPulseRef = useRef(0);
  const finalScoreRef = useRef<number | null>(null);
  const touchStartRef = useRef<Point | null>(null);

  const level = LEVELS[currentLevel - 1];
  const GRID_SIZE = level.gridSize;
  // 自适应单元格大小
  const CELL_SIZE = Math.max(12, Math.min(20, Math.floor(560 / GRID_SIZE)));
  const BOARD_PX = GRID_SIZE * CELL_SIZE;

  // ============ 加载存档 ============
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

  // ============ 保存分数 ============
  useEffect(() => {
    if ((gameState === 'over' || gameState === 'win') && finalScoreRef.current !== null) {
      const current = getScores().snake;
      const wasRecord = finalScoreRef.current > current.highScore;
      const newHigh = Math.max(current.highScore, finalScoreRef.current);
      updateScore('snake', () => ({
        highScore: newHigh,
        totalGames: current.totalGames + 1,
      }));
      setHighScore(newHigh);
      setIsNewRecord(wasRecord);
      // 同步到 localStorage
      const raw = localStorage.getItem('snake_progress');
      const data = raw ? JSON.parse(raw) : {};
      localStorage.setItem('snake_progress', JSON.stringify({
        unlockedLevel: data.unlockedLevel || 1,
        highScore: newHigh,
      }));
      finalScoreRef.current = null;
    }
  }, [gameState]);

  // ============ 占位检查 ============
  const isOccupied = useCallback((
    pos: Point,
    snake: Point[],
    wallList: Point[],
    dynWalls: Point[],
    aiList: AISnake[],
    excludeHead = false,
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

  // ============ 安全点生成 ============
  const generateSafePoint = useCallback((
    snake: Point[],
    wallList: Point[],
    dynWalls: Point[],
    aiList: AISnake[],
    avoidEdges = 2,
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
    snake: Point[],
    wallList: Point[],
    dynWalls: Point[],
    aiList: AISnake[],
  ): Point => generateSafePoint(snake, wallList, dynWalls, aiList, 1), [generateSafePoint]);

  const refreshDynamicWalls = useCallback((
    snake: Point[],
    wallList: Point[],
    aiList: AISnake[],
    count: number,
  ): Point[] => {
    const newWalls: Point[] = [];
    for (let i = 0; i < count; i++) {
      const p = generateSafePoint(snake, [...wallList, ...newWalls], [], aiList, 3);
      newWalls.push(p);
    }
    return newWalls;
  }, [generateSafePoint]);

  // ============ AI 决策 ============
  const getAIDirection = useCallback((
    ai: AISnake,
    playerHead: Point,
    wallList: Point[],
    dynWalls: Point[],
    allAiSnakes: AISnake[],
    gridSize: number,
  ): Direction => {
    const head = ai.body[0];
    const possibleDirs: Direction[] = (['UP', 'DOWN', 'LEFT', 'RIGHT'] as Direction[]).filter(
      d => d !== OPPOSITE_DIR[ai.direction],
    );

    // 过滤危险方向
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

    // 追踪型：朝玩家方向移动
    if (ai.type === 'chase') {
      let bestDir = safeDirs[0];
      let bestDist = Infinity;
      for (const dir of safeDirs) {
        const vec = DIR_VECTORS[dir];
        const nextPos = { x: head.x + vec.x, y: head.y + vec.y };
        const dist = manhattanDist(nextPos, playerHead);
        if (dist < bestDist) { bestDist = dist; bestDir = dir; }
      }
      return bestDir;
    }

    // 高机动型：70% 随机 + 30% 追踪（修正：更随机化）
    if (ai.type === 'fast') {
      if (Math.random() < 0.6) {
        return safeDirs[Math.floor(Math.random() * safeDirs.length)];
      }
      let bestDir = safeDirs[0];
      let bestDist = Infinity;
      for (const dir of safeDirs) {
        const vec = DIR_VECTORS[dir];
        const nextPos = { x: head.x + vec.x, y: head.y + vec.y };
        const dist = manhattanDist(nextPos, playerHead);
        if (dist < bestDist) { bestDist = dist; bestDir = dir; }
      }
      return bestDir;
    }

    // 固定路径型：沿预设环路移动
    if (ai.type === 'path') {
      const pathTargets = [
        { x: 10, y: 10 }, { x: 15, y: 10 }, { x: 15, y: 15 }, { x: 10, y: 15 },
      ];
      const target = pathTargets[ai.pathIndex ?? 0];
      if (manhattanDist(head, target) <= 1) {
        ai.pathIndex = ((ai.pathIndex ?? 0) + 1) % pathTargets.length;
      }
      const tgt = pathTargets[ai.pathIndex ?? 0];
      let bestDir = safeDirs[0];
      let bestDist = Infinity;
      for (const dir of safeDirs) {
        const vec = DIR_VECTORS[dir];
        const nextPos = { x: head.x + vec.x, y: head.y + vec.y };
        const dist = manhattanDist(nextPos, tgt);
        if (dist < bestDist) { bestDist = dist; bestDir = dir; }
      }
      return bestDir;
    }

    // 随机游走型
    return safeDirs[Math.floor(Math.random() * safeDirs.length)];
  }, []);

  // ============ 初始化关卡 ============
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
    lastStepTimeRef.current = 0;

    setScore(0);
    setCurrentLevel(levelId);
    setIsNewRecord(false);
    setSnakeLength(initialSnake.length);
    setAliveAiCount(aiList.filter(a => a.alive).length);
    setGameState('playing');
  }, [generateFood, refreshDynamicWalls]);

  // ============ 处理输入 ============
  const enqueueDirection = useCallback((newDir: Direction) => {
    const queue = inputQueueRef.current;
    const lastDir = queue.length > 0 ? queue[queue.length - 1] : directionRef.current;
    if (newDir === lastDir || newDir === OPPOSITE_DIR[lastDir]) return;
    if (queue.length < MAX_INPUT_QUEUE) queue.push(newDir);
  }, []);

  // ============ 游戏单步逻辑 ============
  const gameStep = useCallback(() => {
    const lv = LEVELS[currentLevelRef.current - 1];
    const snake = playerSnakeRef.current;
    const walls = wallsRef.current;
    const dynWalls = dynamicWallsRef.current;
    const ais = aiSnakesRef.current;
    const food = foodRef.current;

    // 从输入队列取方向
    if (inputQueueRef.current.length > 0) {
      directionRef.current = inputQueueRef.current.shift()!;
    }
    const dir = directionRef.current;
    const vec = DIR_VECTORS[dir];
    const head = snake[0];
    const newHead = { x: head.x + vec.x, y: head.y + vec.y };

    // ---- 碰撞检测 ----
    let died = false;
    let hitAiSnake: AISnake | null = null;
    let hitAiHead = false;

    if (!isInBounds(newHead, lv.gridSize)) {
      died = true;
    }
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
        // 吃掉 AI 蛇身段：增长 = AI 蛇身长度（上限 4）
        const gainLength = Math.min(4, hitAiSnake.body.length);
        const newSnake = [newHead, ...snake];
        for (let i = 0; i < gainLength - 1; i++) {
          newSnake.push({ ...snake[snake.length - 1] });
        }
        playerSnakeRef.current = newSnake;
        // 标记 AI 死亡
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

        // 检查胜利
        if (newSnake.length >= lv.targetLength) {
          finalScoreRef.current = newScore;
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
        return;
      }
      // 其他死亡情况
      finalScoreRef.current = scoreRef.current;
      setGameState('over');
      return;
    }

    // ---- 吃食物 ----
    let newSnake: Point[];
    if (pointEq(newHead, food)) {
      newSnake = [newHead, ...snake];
      const newFood = generateFood(newSnake, walls, dynWalls, ais);
      foodRef.current = newFood;
      const newScore = scoreRef.current + 1;
      scoreRef.current = newScore;
      setScore(newScore);
      // 速度递增
      if (newScore > 0 && newScore % SPEED_UP_EVERY === 0) {
        speedRef.current = Math.max(60, speedRef.current - SPEED_UP_AMOUNT);
      }
      // 检查胜利
      if (newSnake.length >= lv.targetLength) {
        playerSnakeRef.current = newSnake;
        finalScoreRef.current = newScore;
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

    // ---- AI 蛇移动 ----
    aiMoveCounterRef.current++;
    const playerHead = newHead;
    aiSnakesRef.current = ais.map(ai => {
      if (!ai.alive) {
        // 重生检查
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

      // 移动频率
      const moveInterval = ai.type === 'fast' ? 1 : 2;
      if (aiMoveCounterRef.current % moveInterval !== 0) return ai;

      const newDir = getAIDirection(ai, playerHead, walls, dynWalls, aiSnakesRef.current, lv.gridSize);
      const v = DIR_VECTORS[newDir];
      const aiHead = ai.body[0];
      const aiNewHead = { x: aiHead.x + v.x, y: aiHead.y + v.y };
      if (!isInBounds(aiNewHead, lv.gridSize)) {
        return { ...ai, direction: newDir };
      }
      // 自身碰撞
      for (let i = 1; i < ai.body.length; i++) {
        if (pointEq(ai.body[i], aiNewHead)) return ai;
      }
      const newBody = ai.body.length < 5
        ? [aiNewHead, ...ai.body]
        : [aiNewHead, ...ai.body.slice(0, -1)];
      return { ...ai, body: newBody, direction: newDir };
    });

    // 同步 UI 显示状态
    setSnakeLength(playerSnakeRef.current.length);
    setAliveAiCount(aiSnakesRef.current.filter(a => a.alive).length);
  }, [generateFood, getAIDirection, isOccupied]);

  // ============ 游戏主循环（RAF + 时间累积）============
  useEffect(() => {
    if (gameState !== 'playing') {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const loop = (timestamp: number) => {
      if (!lastStepTimeRef.current) lastStepTimeRef.current = timestamp;
      const elapsed = timestamp - lastStepTimeRef.current;
      if (elapsed >= speedRef.current) {
        lastStepTimeRef.current = timestamp;
        gameStep();
      }
      foodPulseRef.current = timestamp;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [gameState, gameStep]);

  // ============ Canvas 渲染 ============
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lv = LEVELS[currentLevelRef.current - 1];
    const size = lv.gridSize;
    const cell = CELL_SIZE;
    const w = size * cell;

    // 清空
    ctx.clearRect(0, 0, w, w);

    // 背景渐变
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

    // 网格线
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= size; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, w);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell);
      ctx.lineTo(w, i * cell);
      ctx.stroke();
    }

    // 固定墙（石质纹理）
    const walls = wallsRef.current;
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

    // 动态墙（琥珀色发光）
    const dynWalls = dynamicWallsRef.current;
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

    // 食物（脉冲发光）
    const food = foodRef.current;
    const fx = food.x * cell;
    const fy = food.y * cell;
    const pulse = Math.sin(foodPulseRef.current / 200) * 0.15 + 0.85;
    ctx.save();
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10 * pulse;
    const foodGrad = ctx.createRadialGradient(
      fx + cell / 2, fy + cell / 2, 0,
      fx + cell / 2, fy + cell / 2, cell / 2,
    );
    foodGrad.addColorStop(0, '#fca5a5');
    foodGrad.addColorStop(1, '#dc2626');
    ctx.fillStyle = foodGrad;
    ctx.beginPath();
    ctx.arc(fx + cell / 2, fy + cell / 2, (cell / 2 - 2) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // AI 蛇
    const aiColorMap: Record<AISnakeType, [number, number, number]> = {
      chase: [239, 68, 68],   // 红
      fast: [249, 115, 22],   // 橙
      random: [148, 163, 184], // 灰蓝
      path: [148, 163, 184],
    };
    const ais = aiSnakesRef.current;
    for (const ai of ais) {
      if (!ai.alive) continue;
      const baseColor = aiColorMap[ai.type];
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
          // 眼睛
          ctx.fillStyle = '#fff';
          ctx.fillRect(x + cell * 0.2, y + cell * 0.2, 2, 2);
          ctx.fillRect(x + cell * 0.6, y + cell * 0.2, 2, 2);
        } else {
          ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        }
      }
    }

    // 玩家蛇（渐变身体 + 发光头）
    const snake = playerSnakeRef.current;
    for (let i = snake.length - 1; i >= 0; i--) {
      const p = snake[i];
      const x = p.x * cell;
      const y = p.y * cell;
      if (i === 0) {
        // 蛇头
        ctx.save();
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
        const headGrad = ctx.createLinearGradient(x, y, x + cell, y + cell);
        headGrad.addColorStop(0, isDark ? '#34d399' : '#10b981');
        headGrad.addColorStop(1, isDark ? '#10b981' : '#059669');
        ctx.fillStyle = headGrad;
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        ctx.restore();
        // 眼睛
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + cell * 0.2, y + cell * 0.2, 2, 2);
        ctx.fillRect(x + cell * 0.6, y + cell * 0.2, 2, 2);
        ctx.fillStyle = '#000';
        ctx.fillRect(x + cell * 0.25, y + cell * 0.25, 1, 1);
        ctx.fillRect(x + cell * 0.65, y + cell * 0.25, 1, 1);
      } else {
        // 蛇身：头到尾渐变
        const t = i / Math.max(1, snake.length - 1);
        const bodyColor = isDark
          ? lerpColor([52, 211, 153], [6, 95, 70], t)
          : lerpColor([16, 185, 129], [4, 120, 87], t);
        ctx.fillStyle = bodyColor;
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      }
    }
  }, [CELL_SIZE, isDark]);

  // ============ 渲染循环 ============
  // playing 状态：持续 RAF 渲染（动画）
  // 其他状态：仅渲染一次（静态画面）
  useEffect(() => {
    if (gameState === 'menu') return;
    if (gameState === 'playing') {
      let raf: number;
      const render = () => {
        draw();
        raf = requestAnimationFrame(render);
      };
      raf = requestAnimationFrame(render);
      return () => cancelAnimationFrame(raf);
    }
    // paused / over / win：只绘制一帧
    draw();
  }, [gameState, draw]);

  // ============ 动态墙定时刷新 ============
  useEffect(() => {
    if (gameState === 'playing' && level.dynamicWallCount > 0 && level.dynamicWallInterval > 0) {
      const refresh = () => {
        const newWalls = refreshDynamicWalls(
          playerSnakeRef.current,
          wallsRef.current,
          aiSnakesRef.current,
          level.dynamicWallCount,
        );
        dynamicWallsRef.current = newWalls;
      };
      dynamicWallTimerRef.current = window.setInterval(refresh, level.dynamicWallInterval);
      return () => {
        if (dynamicWallTimerRef.current) {
          clearInterval(dynamicWallTimerRef.current);
          dynamicWallTimerRef.current = null;
        }
      };
    }
  }, [gameState, level.dynamicWallCount, level.dynamicWallInterval, refreshDynamicWalls]);

  // ============ 键盘控制 ============
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'menu') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          initLevel(1);
        }
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'playing') setGameState('paused');
        else if (gameState === 'paused') setGameState('playing');
        else if (gameState === 'over' || gameState === 'win') initLevel(currentLevel);
        return;
      }
      if (e.code === 'Escape') {
        setGameState('menu');
        return;
      }
      if (gameState !== 'playing') return;

      let newDir: Direction | null = null;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') newDir = 'UP';
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') newDir = 'DOWN';
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') newDir = 'LEFT';
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') newDir = 'RIGHT';

      if (newDir) {
        e.preventDefault();
        enqueueDirection(newDir);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, initLevel, currentLevel, enqueueDirection]);

  // ============ 触摸控制 ============
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || gameState !== 'playing') return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    const threshold = 20;
    let newDir: Direction | null = null;
    if (Math.abs(dx) > Math.abs(dy)) {
      newDir = dx > threshold ? 'RIGHT' : dx < -threshold ? 'LEFT' : null;
    } else {
      newDir = dy > threshold ? 'DOWN' : dy < -threshold ? 'UP' : null;
    }
    if (newDir) enqueueDirection(newDir);
    touchStartRef.current = null;
  };

  // 虚拟方向键
  const handleVirtualKey = (dir: Direction) => {
    if (gameState === 'playing') enqueueDirection(dir);
  };

  // ============ 菜单界面 ============
  if (gameState === 'menu') {
    return (
      <div className="w-full max-w-lg mx-auto px-2 sm:px-4 py-6">
        <div className="text-center mb-8">
          <h1 className={`text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            🐍 贪吃蛇大作战
          </h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            完成 4 个关卡，成为真正的蛇王！
          </p>
          <div className={`mt-2 text-sm ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            🏆 最高分: {highScore}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {LEVELS.map((lv) => {
            const unlocked = unlockedLevel >= lv.id;
            const completed = unlockedLevel > lv.id;
            return (
              <button
                key={lv.id}
                onClick={() => unlocked && initLevel(lv.id)}
                disabled={!unlocked}
                className={`p-4 sm:p-6 rounded-2xl text-left transition-all duration-200 touch-manipulation ${
                  unlocked
                    ? isDark
                      ? 'bg-gradient-to-br from-emerald-600/30 to-teal-600/30 hover:from-emerald-500/40 hover:to-teal-500/40 border border-emerald-500/40 hover:scale-[1.02]'
                      : 'bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200 hover:scale-[1.02]'
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
                  {lv.gridSize}×{lv.gridSize} · 目标 {lv.targetLength}
                </div>
                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {lv.description}
                </div>
              </button>
            );
          })}
        </div>

        <div className={`text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <p>方向键 / WASD 控制 · 空格键暂停</p>
          <p className="mt-1">吃掉敌方蛇身可增长，头对头相撞死亡</p>
          <p className="mt-1">🔴 追踪蛇 · 🟠 高机动蛇 · ⚪ 游走蛇</p>
        </div>
      </div>
    );
  }

  // ============ 游戏界面 ============
  return (
    <div className="w-full max-w-xl mx-auto px-1 sm:px-2">
      {/* 顶部信息栏 */}
      <div className="flex justify-between items-center mb-3 px-2 gap-2">
        <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl flex-1 ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
          <div className={`text-[10px] sm:text-xs font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            第 {currentLevel} 关
          </div>
          <div className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {score} / {level.targetLength}
          </div>
        </div>
        <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl flex-1 ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
          <div className={`text-[10px] sm:text-xs font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            长度
          </div>
          <div className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {snakeLength}
          </div>
        </div>
        <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl flex-1 ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
          <div className={`text-[10px] sm:text-xs font-semibold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
            敌蛇
          </div>
          <div className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {aliveAiCount}/{level.aiSnakes.length}
          </div>
        </div>
      </div>

      {/* 进度条 */}
      <div className={`mb-3 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-300"
          style={{ width: `${Math.min(100, (score / level.targetLength) * 100)}%` }}
        />
      </div>

      {/* Canvas 游戏棋盘 */}
      <div
        className="mx-auto touch-none select-none rounded-xl overflow-hidden border-2 shadow-2xl relative"
        style={{
          width: BOARD_PX,
          borderColor: isDark ? '#374151' : '#d1d5db',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <canvas
          ref={canvasRef}
          width={BOARD_PX}
          height={BOARD_PX}
          style={{ display: 'block', width: BOARD_PX, height: BOARD_PX }}
        />

        {/* 暂停遮罩 */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">⏸️ 暂停</div>
              <div className="text-sm text-gray-300">按空格键或点击继续</div>
            </div>
          </div>
        )}

        {/* 游戏结束遮罩 */}
        {gameState === 'over' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400 mb-2">💀 游戏结束</div>
              <div className="text-sm text-gray-300">
                长度 {snakeLength} · 得分 {score}
              </div>
              {isNewRecord && (
                <div className="mt-2 text-amber-400 font-bold animate-pulse">🏆 新纪录！</div>
              )}
            </div>
          </div>
        )}

        {/* 胜利遮罩 */}
        {gameState === 'win' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-2">🎉 通关！</div>
              <div className="text-sm text-gray-300">
                得分 {score} · {currentLevel < 4 ? '下一关已解锁' : '所有关卡完成！'}
              </div>
              {isNewRecord && (
                <div className="mt-2 text-amber-400 font-bold animate-pulse">🏆 新纪录！</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="mt-4 flex justify-center gap-2 sm:gap-3 flex-wrap">
        {gameState === 'playing' && (
          <>
            <button
              onClick={() => setGameState('paused')}
              className={`min-h-[2.5rem] px-5 py-2 font-bold rounded-xl shadow-lg transition-all active:scale-95 hover:scale-105 touch-manipulation ${
                isDark ? 'bg-amber-500/80 hover:bg-amber-400/80 text-white' : 'bg-amber-500 hover:bg-amber-400 text-white'
              }`}
            >
              ⏸️ 暂停
            </button>
            <button
              onClick={() => initLevel(currentLevel)}
              className={`min-h-[2.5rem] px-5 py-2 font-bold rounded-xl shadow-lg transition-all active:scale-95 hover:scale-105 touch-manipulation ${
                isDark ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-500 hover:bg-gray-400 text-white'
              }`}
            >
              🔄 重来
            </button>
            <button
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
            <button
              onClick={() => setGameState('playing')}
              className={`min-h-[2.5rem] px-6 py-2 font-bold rounded-xl shadow-lg transition-all active:scale-95 hover:scale-105 touch-manipulation ${
                isDark ? 'bg-emerald-500/80 hover:bg-emerald-400/80 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-white'
              }`}
            >
              ▶️ 继续
            </button>
            <button
              onClick={() => initLevel(currentLevel)}
              className={`min-h-[2.5rem] px-5 py-2 font-bold rounded-xl shadow-lg transition-all active:scale-95 hover:scale-105 touch-manipulation ${
                isDark ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-500 hover:bg-gray-400 text-white'
              }`}
            >
              🔄 重来
            </button>
            <button
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
            <button
              onClick={() => initLevel(currentLevel)}
              className={`min-h-[2.5rem] px-6 py-2 font-bold rounded-xl shadow-lg transition-all active:scale-95 hover:scale-105 touch-manipulation ${
                isDark ? 'bg-emerald-500/80 hover:bg-emerald-400/80 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-white'
              }`}
            >
              🔄 再来一次
            </button>
            {gameState === 'win' && currentLevel < 4 && (
              <button
                onClick={() => initLevel(currentLevel + 1)}
                className={`min-h-[2.5rem] px-6 py-2 font-bold rounded-xl shadow-lg transition-all active:scale-95 hover:scale-105 touch-manipulation ${
                  isDark ? 'bg-blue-500/80 hover:bg-blue-400/80 text-white' : 'bg-blue-500 hover:bg-blue-400 text-white'
                }`}
              >
                ➡️ 下一关
              </button>
            )}
            <button
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

      {/* 移动端虚拟方向键 */}
      <div className="mt-6 flex justify-center sm:hidden">
        <div className="grid grid-cols-3 gap-2">
          <div />
          <button
            onClick={() => handleVirtualKey('UP')}
            className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold active:scale-90 transition-transform touch-manipulation ${
              isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            ↑
          </button>
          <div />
          <button
            onClick={() => handleVirtualKey('LEFT')}
            className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold active:scale-90 transition-transform touch-manipulation ${
              isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            ←
          </button>
          <button
            onClick={() => handleVirtualKey('DOWN')}
            className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold active:scale-90 transition-transform touch-manipulation ${
              isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            ↓
          </button>
          <button
            onClick={() => handleVirtualKey('RIGHT')}
            className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold active:scale-90 transition-transform touch-manipulation ${
              isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
