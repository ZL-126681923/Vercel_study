'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { updateScore } from '@/lib/gameScores';

const COLS = 10;
const ROWS = 20;
const KINDS = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'] as const;

type Kind = (typeof KINDS)[number];
type Cell = Kind | 'G' | null;
type Board = Cell[][];
type Status = 'playing' | 'paused' | 'levelComplete' | 'over' | 'won';

type Piece = {
  kind: Kind;
  rotation: number;
  x: number;
  y: number;
};

type GameState = {
  board: Board;
  active: Piece;
  queue: Kind[];
  held: Kind | null;
  canHold: boolean;
  score: number;
  totalLines: number;
  stageLines: number;
  level: number;
  status: Status;
};

type Action =
  | { type: 'MOVE'; dx: number }
  | { type: 'ROTATE'; direction: 1 | -1 }
  | { type: 'TICK' }
  | { type: 'SOFT_DROP' }
  | { type: 'HARD_DROP' }
  | { type: 'HOLD' }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'RESTART' }
  | { type: 'NEXT_LEVEL' };

const LEVELS = [
  { target: 6, speed: 820, garbage: 0, name: '热身区' },
  { target: 10, speed: 620, garbage: 1, name: '加速带' },
  { target: 14, speed: 460, garbage: 2, name: '高压层' },
  { target: 18, speed: 310, garbage: 3, name: '极限塔' },
] as const;

const BASE: Record<Kind, string[]> = {
  I: ['....', 'IIII', '....', '....'],
  J: ['J...', 'JJJ.', '....', '....'],
  L: ['..L.', 'LLL', '....', '....'],
  O: ['.OO.', '.OO.', '....', '....'],
  S: ['.SS.', 'SS..', '....', '....'],
  T: ['.T..', 'TTT.', '....', '....'],
  Z: ['ZZ..', '.ZZ.', '....', '....'],
};

const CELL_STYLES: Record<Exclude<Cell, null>, string> = {
  I: 'bg-cyan-400 border-cyan-200 shadow-[inset_0_0_0_2px_rgba(8,145,178,.35)]',
  J: 'bg-blue-500 border-blue-300 shadow-[inset_0_0_0_2px_rgba(30,64,175,.35)]',
  L: 'bg-orange-400 border-orange-200 shadow-[inset_0_0_0_2px_rgba(194,65,12,.35)]',
  O: 'bg-yellow-300 border-yellow-100 shadow-[inset_0_0_0_2px_rgba(202,138,4,.35)]',
  S: 'bg-emerald-400 border-emerald-200 shadow-[inset_0_0_0_2px_rgba(5,150,105,.35)]',
  T: 'bg-fuchsia-500 border-fuchsia-300 shadow-[inset_0_0_0_2px_rgba(162,28,175,.35)]',
  Z: 'bg-rose-500 border-rose-300 shadow-[inset_0_0_0_2px_rgba(190,18,60,.35)]',
  G: 'bg-zinc-600 border-zinc-400 shadow-[inset_0_0_0_2px_rgba(24,24,27,.45)]',
};

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

function shuffledBag(): Kind[] {
  const bag = [...KINDS];
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function ensureQueue(queue: Kind[]): Kind[] {
  let next = [...queue];
  while (next.length < 7) next = [...next, ...shuffledBag()];
  return next;
}

function rotateMatrix(matrix: string[]): string[] {
  return matrix.map((_, y) => matrix.map((row) => row[3 - y]).join(''));
}

function matrixFor(kind: Kind, rotation: number): string[] {
  if (kind === 'O') return BASE.O;
  let matrix = BASE[kind];
  for (let i = 0; i < ((rotation % 4) + 4) % 4; i += 1) matrix = rotateMatrix(matrix);
  return matrix;
}

function cellsFor(piece: Piece): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  matrixFor(piece.kind, piece.rotation).forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell !== '.') cells.push({ x: piece.x + x, y: piece.y + y });
    });
  });
  return cells;
}

function collides(board: Board, piece: Piece): boolean {
  return cellsFor(piece).some(({ x, y }) => x < 0 || x >= COLS || y >= ROWS || (y >= 0 && board[y][x] !== null));
}

function merge(board: Board, piece: Piece): Board {
  const next = board.map((row) => [...row]);
  cellsFor(piece).forEach(({ x, y }) => {
    if (y >= 0) next[y][x] = piece.kind;
  });
  return next;
}

function clearFullLines(board: Board): { board: Board; cleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === null));
  const cleared = ROWS - remaining.length;
  return {
    board: [...Array.from({ length: cleared }, () => Array<Cell>(COLS).fill(null)), ...remaining],
    cleared,
  };
}

function boardForLevel(level: number): Board {
  const board = emptyBoard();
  const garbageRows = LEVELS[level - 1].garbage;
  for (let i = 0; i < garbageRows; i += 1) {
    const row = ROWS - 1 - i;
    const gap = (level * 2 + i * 3) % COLS;
    board[row] = board[row].map((_, x) => (x === gap ? null : 'G'));
  }
  return board;
}

function spawn(kind: Kind): Piece {
  return { kind, rotation: 0, x: 3, y: -1 };
}

function createState(level = 1, score = 0, totalLines = 0): GameState {
  const queue = ensureQueue([]);
  return {
    board: boardForLevel(level),
    active: spawn(queue[0]),
    queue: ensureQueue(queue.slice(1)),
    held: null,
    canHold: true,
    score,
    totalLines,
    stageLines: 0,
    level,
    status: 'playing',
  };
}

function spawnNext(state: GameState, board: Board, patch: Partial<GameState>): GameState {
  const queue = ensureQueue(state.queue);
  const active = spawn(queue[0]);
  const next = { ...state, ...patch, board, active, queue: ensureQueue(queue.slice(1)), canHold: true };
  return collides(board, active) ? { ...next, status: 'over' } : next;
}

function lockPiece(state: GameState, hardDropBonus = 0): GameState {
  if (cellsFor(state.active).some(({ y }) => y < 0)) return { ...state, status: 'over' };
  const result = clearFullLines(merge(state.board, state.active));
  const lineScore = [0, 100, 300, 500, 800][result.cleared] * state.level;
  const stageLines = state.stageLines + result.cleared;
  const totalLines = state.totalLines + result.cleared;
  const score = state.score + lineScore + hardDropBonus;
  if (stageLines >= LEVELS[state.level - 1].target) {
    return {
      ...state,
      board: result.board,
      stageLines,
      totalLines,
      score,
      status: state.level === 4 ? 'won' : 'levelComplete',
    };
  }
  return spawnNext(state, result.board, { stageLines, totalLines, score });
}

function reducer(state: GameState, action: Action): GameState {
  if (action.type === 'TOGGLE_PAUSE') {
    if (state.status === 'playing') return { ...state, status: 'paused' };
    if (state.status === 'paused') return { ...state, status: 'playing' };
    return state;
  }
  if (action.type === 'RESTART') return createState(1);
  if (action.type === 'NEXT_LEVEL' && state.status === 'levelComplete') {
    return createState(state.level + 1, state.score, state.totalLines);
  }
  if (state.status !== 'playing') return state;

  if (action.type === 'MOVE') {
    const active = { ...state.active, x: state.active.x + action.dx };
    return collides(state.board, active) ? state : { ...state, active };
  }
  if (action.type === 'ROTATE') {
    const rotated = { ...state.active, rotation: state.active.rotation + action.direction };
    for (const dx of [0, -1, 1, -2, 2]) {
      const candidate = { ...rotated, x: rotated.x + dx };
      if (!collides(state.board, candidate)) return { ...state, active: candidate };
    }
    return state;
  }
  if (action.type === 'HOLD') {
    if (!state.canHold) return state;
    if (state.held) {
      const active = spawn(state.held);
      return collides(state.board, active)
        ? { ...state, status: 'over' }
        : { ...state, active, held: state.active.kind, canHold: false };
    }
    const queue = ensureQueue(state.queue);
    const active = spawn(queue[0]);
    return collides(state.board, active)
      ? { ...state, status: 'over' }
      : { ...state, active, held: state.active.kind, queue: ensureQueue(queue.slice(1)), canHold: false };
  }
  if (action.type === 'HARD_DROP') {
    let active = state.active;
    let distance = 0;
    while (!collides(state.board, { ...active, y: active.y + 1 })) {
      active = { ...active, y: active.y + 1 };
      distance += 1;
    }
    return lockPiece({ ...state, active }, distance * 2);
  }
  if (action.type === 'TICK' || action.type === 'SOFT_DROP') {
    const active = { ...state.active, y: state.active.y + 1 };
    if (!collides(state.board, active)) {
      return { ...state, active, score: state.score + (action.type === 'SOFT_DROP' ? 1 : 0) };
    }
    return lockPiece(state);
  }
  return state;
}

function MiniPiece({ kind }: { kind: Kind | null }) {
  if (!kind) return <div className="text-xs font-bold text-white/25">EMPTY</div>;
  const cells = matrixFor(kind, 0);
  return (
    <div className="grid h-16 w-16 grid-cols-4 grid-rows-4 gap-0.5" aria-label={`${kind} 方块`}>
      {cells.flatMap((row, y) => [...row].map((cell, x) => (
        <span key={`${x}-${y}`} className={cell === '.' ? '' : `rounded-[3px] border ${CELL_STYLES[kind]}`} />
      )))}
    </div>
  );
}

export default function TetrisGame() {
  const [game, dispatch] = useReducer(reducer, undefined, () => createState());
  const endSaved = useRef(false);
  const levelConfig = LEVELS[game.level - 1];

  useEffect(() => {
    if (game.status !== 'playing') return;
    const timer = window.setInterval(() => dispatch({ type: 'TICK' }), levelConfig.speed);
    return () => window.clearInterval(timer);
  }, [game.status, levelConfig.speed]);

  useEffect(() => {
    const finished = game.status === 'over' || game.status === 'won';
    updateScore('tetris', (previous) => ({
      highScore: Math.max(previous.highScore, game.score),
      bestLevel: Math.max(previous.bestLevel, game.level),
      totalGames: previous.totalGames + (finished && !endSaved.current ? 1 : 0),
    }));
    if (finished) endSaved.current = true;
    if (game.status === 'playing' && game.level === 1 && game.score === 0) endSaved.current = false;
  }, [game.level, game.score, game.status]);

  const act = useCallback((action: Action) => dispatch(action), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const actions: Record<string, Action> = {
        ArrowLeft: { type: 'MOVE', dx: -1 },
        ArrowRight: { type: 'MOVE', dx: 1 },
        ArrowDown: { type: 'SOFT_DROP' },
        ArrowUp: { type: 'ROTATE', direction: 1 },
        z: { type: 'ROTATE', direction: -1 },
        Z: { type: 'ROTATE', direction: -1 },
        c: { type: 'HOLD' },
        C: { type: 'HOLD' },
        p: { type: 'TOGGLE_PAUSE' },
        P: { type: 'TOGGLE_PAUSE' },
      };
      const action = event.code === 'Space' ? { type: 'HARD_DROP' } as Action : actions[event.key];
      if (action) {
        event.preventDefault();
        act(action);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [act]);

  const ghost = useMemo(() => {
    let piece = game.active;
    while (!collides(game.board, { ...piece, y: piece.y + 1 })) piece = { ...piece, y: piece.y + 1 };
    return piece;
  }, [game.active, game.board]);

  const display = useMemo(() => {
    const cells = game.board.map((row) => row.map((kind) => ({ kind, ghost: false })));
    cellsFor(ghost).forEach(({ x, y }) => {
      if (y >= 0 && cells[y][x].kind === null) cells[y][x] = { kind: game.active.kind, ghost: true };
    });
    cellsFor(game.active).forEach(({ x, y }) => {
      if (y >= 0) cells[y][x] = { kind: game.active.kind, ghost: false };
    });
    return cells;
  }, [game.active, game.board, ghost]);

  const progress = Math.min(100, (game.stageLines / levelConfig.target) * 100);
  const overlay = game.status !== 'playing' ? game.status : null;

  return (
    <div className="mx-auto w-full max-w-4xl select-none border border-cyan-300/15 bg-[#050a14] p-3 text-white shadow-[inset_0_0_80px_rgba(8,145,178,.06)] sm:p-5">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300/80">Block Circuit</div>
          <h2 className="text-2xl font-black sm:text-3xl">俄罗斯方块</h2>
        </div>
        <div className="flex gap-4 font-mono text-right">
          <div><div className="text-[9px] text-white/45">SCORE</div><div className="text-lg font-black text-yellow-300">{game.score}</div></div>
          <div><div className="text-[9px] text-white/45">LINES</div><div className="text-lg font-black text-cyan-300">{game.totalLines}</div></div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-4 gap-1.5" aria-label="四关进度">
        {LEVELS.map((level, index) => (
          <div key={level.name} className={`h-2 rounded-sm ${index + 1 < game.level ? 'bg-emerald-400' : index + 1 === game.level ? 'bg-cyan-300' : 'bg-white/10'}`} />
        ))}
      </div>

      <div className="flex items-start justify-center gap-3 sm:gap-5">
        <div className="relative w-[min(58vw,300px)] min-w-[190px] overflow-hidden border-2 border-cyan-300/50 bg-[#07101f] shadow-[0_0_36px_rgba(34,211,238,.18)]">
          <div className="grid aspect-[1/2] grid-cols-10 grid-rows-20 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:10%_5%]" aria-label="俄罗斯方块棋盘">
            {display.flatMap((row, y) => row.map((cell, x) => (
              <span
                key={`${x}-${y}`}
                className={`border-[0.5px] border-white/[0.035] ${cell.kind ? CELL_STYLES[cell.kind] : ''} ${cell.ghost ? 'opacity-20' : ''}`}
              />
            )))}
          </div>

          {overlay && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#030712]/80 p-5 text-center backdrop-blur-sm">
              <div>
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">LEVEL {game.level}</div>
                <div className="text-2xl font-black">
                  {overlay === 'paused' && '已暂停'}
                  {overlay === 'levelComplete' && '关卡完成'}
                  {overlay === 'over' && '堆叠失控'}
                  {overlay === 'won' && '四关制霸'}
                </div>
                <div className="mt-2 text-xs text-white/60">得分 {game.score} · 消除 {game.totalLines} 行</div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: overlay === 'levelComplete' ? 'NEXT_LEVEL' : overlay === 'paused' ? 'TOGGLE_PAUSE' : 'RESTART' })}
                  className="mt-4 min-h-10 border border-cyan-300/50 bg-cyan-300 px-5 text-sm font-black text-slate-950 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
                >
                  {overlay === 'levelComplete' ? '进入下一关' : overlay === 'paused' ? '继续' : '重新挑战'}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="w-[104px] shrink-0 sm:w-36">
          <div className="border-b border-white/10 pb-3">
            <div className="text-[9px] font-black tracking-[0.2em] text-white/40">LEVEL {game.level}</div>
            <div className="mt-1 text-sm font-black text-cyan-300">{levelConfig.name}</div>
            <div className="mt-2 h-1.5 overflow-hidden bg-white/10"><div className="h-full bg-yellow-300 transition-[width]" style={{ width: `${progress}%` }} /></div>
            <div className="mt-1 text-[10px] text-white/50">{game.stageLines} / {levelConfig.target} 行</div>
          </div>
          <div className="border-b border-white/10 py-3">
            <div className="mb-1 text-[9px] font-black tracking-[0.2em] text-white/40">NEXT</div>
            <MiniPiece kind={game.queue[0]} />
          </div>
          <div className="py-3">
            <div className="mb-1 text-[9px] font-black tracking-[0.2em] text-white/40">HOLD</div>
            <MiniPiece kind={game.held} />
          </div>
        </aside>
      </div>

      <div className="mx-auto mt-4 grid max-w-md grid-cols-6 gap-2">
        {[
          { label: '左移', icon: '←', action: { type: 'MOVE', dx: -1 } as Action },
          { label: '右移', icon: '→', action: { type: 'MOVE', dx: 1 } as Action },
          { label: '旋转', icon: '↻', action: { type: 'ROTATE', direction: 1 } as Action },
          { label: '软降', icon: '↓', action: { type: 'SOFT_DROP' } as Action },
          { label: '直落', icon: '⇊', action: { type: 'HARD_DROP' } as Action },
          { label: '暂存', icon: 'H', action: { type: 'HOLD' } as Action },
        ].map((control) => (
          <button
            key={control.label}
            type="button"
            aria-label={control.label}
            title={control.label}
            onClick={() => dispatch(control.action)}
            className="aspect-square min-h-10 border border-white/15 bg-white/[0.07] text-lg font-black transition hover:border-cyan-300/60 hover:bg-cyan-300/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
          >
            {control.icon}
          </button>
        ))}
      </div>

      <div className="mt-3 flex justify-center gap-2">
        <button type="button" onClick={() => dispatch({ type: 'TOGGLE_PAUSE' })} className="min-h-9 border border-white/10 px-4 text-xs font-bold text-white/65 hover:text-white">{game.status === 'paused' ? '继续' : '暂停'}</button>
        <button type="button" onClick={() => dispatch({ type: 'RESTART' })} className="min-h-9 border border-white/10 px-4 text-xs font-bold text-white/65 hover:text-white">重新开始</button>
      </div>
    </div>
  );
}
