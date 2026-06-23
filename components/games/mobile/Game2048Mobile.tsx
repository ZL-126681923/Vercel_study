'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { updateScore } from '@/lib/gameScores';

/**
 * Mobile 端 2048
 * 设计要点：
 * - 自适应宽度棋盘（min(94vw, 360px)）
 * - 核心信息（分数 / 最高分）置顶
 * - 滑屏操作（左右/上下滑屏移动）
 * - 操作按钮下移至拇指可达区
 * - 大字号但紧凑间距
 * - 适配 iPhone SE ~ iPad
 */

type Board = number[][];
type Direction = 'up' | 'down' | 'left' | 'right';

const SIZE = 4;

function createEmpty(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function addRandom(board: Board): Board {
  const newBoard = board.map(row => [...row]);
  const empty: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (newBoard[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return newBoard;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  newBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newBoard;
}

function initBoard(): Board {
  return addRandom(addRandom(createEmpty()));
}

function slide(row: number[]): { result: number[]; score: number } {
  let score = 0;
  const filtered = row.filter(v => v !== 0);
  const result: number[] = [];
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      result.push(merged);
      score += merged;
      i += 2;
    } else {
      result.push(filtered[i]);
      i++;
    }
  }
  while (result.length < SIZE) result.push(0);
  return { result, score };
}

function move(board: Board, dir: Direction): { board: Board; score: number; moved: boolean } {
  let totalScore = 0;
  let moved = false;
  const newBoard = board.map(row => [...row]);

  if (dir === 'left') {
    for (let r = 0; r < SIZE; r++) {
      const { result, score } = slide(newBoard[r]);
      totalScore += score;
      if (result.some((v, i) => v !== newBoard[r][i])) moved = true;
      newBoard[r] = result;
    }
  } else if (dir === 'right') {
    for (let r = 0; r < SIZE; r++) {
      const { result, score } = slide([...newBoard[r]].reverse());
      totalScore += score;
      const reversed = [...result].reverse();
      if (reversed.some((v, i) => v !== newBoard[r][i])) moved = true;
      newBoard[r] = reversed;
    }
  } else if (dir === 'up') {
    for (let c = 0; c < SIZE; c++) {
      const col = newBoard.map(row => row[c]);
      const { result, score } = slide(col);
      totalScore += score;
      if (result.some((v, i) => v !== newBoard[i][c])) moved = true;
      result.forEach((v, i) => { newBoard[i][c] = v; });
    }
  } else {
    for (let c = 0; c < SIZE; c++) {
      const col = newBoard.map(row => row[c]).reverse();
      const { result, score } = slide(col);
      totalScore += score;
      const reversed = [...result].reverse();
      if (reversed.some((v, i) => v !== newBoard[i][c])) moved = true;
      reversed.forEach((v, i) => { newBoard[i][c] = v; });
    }
  }

  return { board: newBoard, score: totalScore, moved };
}

function canMove(board: Board): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) return true;
      if (c + 1 < SIZE && board[r][c] === board[r][c + 1]) return true;
      if (r + 1 < SIZE && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

function hasWon(board: Board): boolean {
  return board.some(row => row.some(v => v >= 2048));
}

const TILE_COLORS: Record<number, { bg: string; text: string }> = {
  0: { bg: 'bg-gray-700/30 dark:bg-gray-600/30', text: '' },
  2: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-900 dark:text-amber-100' },
  4: { bg: 'bg-amber-200 dark:bg-amber-800/50', text: 'text-amber-900 dark:text-amber-100' },
  8: { bg: 'bg-orange-300 dark:bg-orange-700/60', text: 'text-white' },
  16: { bg: 'bg-orange-400 dark:bg-orange-600/70', text: 'text-white' },
  32: { bg: 'bg-red-400 dark:bg-red-600/70', text: 'text-white' },
  64: { bg: 'bg-red-500 dark:bg-red-500/80', text: 'text-white' },
  128: { bg: 'bg-yellow-300 dark:bg-yellow-600/70', text: 'text-yellow-900 dark:text-yellow-100' },
  256: { bg: 'bg-yellow-400 dark:bg-yellow-500/80', text: 'text-yellow-900 dark:text-yellow-100' },
  512: { bg: 'bg-yellow-500 dark:bg-yellow-400/80', text: 'text-white' },
  1024: { bg: 'bg-yellow-600 dark:bg-yellow-300/80', text: 'text-white' },
  2048: { bg: 'bg-yellow-400 dark:bg-yellow-200/90', text: 'text-yellow-900' },
};

function getTileStyle(value: number) {
  if (value > 2048) return { bg: 'bg-purple-500 dark:bg-purple-400/80', text: 'text-white' };
  return TILE_COLORS[value] || TILE_COLORS[0];
}

export default function Game2048Mobile() {
  const [board, setBoard] = useState<Board>(() => initBoard());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('game_scores');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data['2048']?.best) setBest(data['2048'].best);
      } catch { /* ignore */ }
    }
  }, []);

  const handleMove = useCallback((dir: Direction) => {
    if (gameOver) return;
    if (won && !keepPlaying) return;
    setBoard(prev => {
      const result = move(prev, dir);
      if (!result.moved) return prev;
      const newBoard = addRandom(result.board);
      const newScore = score + result.score;
      setScore(newScore);
      if (newScore > best) {
        setBest(newScore);
        updateScore('2048', p => ({ ...p, best: newScore }));
      }
      if (!keepPlaying && hasWon(newBoard) && !hasWon(prev)) setWon(true);
      if (!canMove(newBoard)) {
        setGameOver(true);
        updateScore('2048', p => ({ ...p, games: p.games + 1 }));
      }
      return newBoard;
    });
  }, [score, best, gameOver, won, keepPlaying]);

  const resetGame = useCallback(() => {
    setBoard(initBoard());
    setScore(0);
    setGameOver(false);
    setWon(false);
    setKeepPlaying(false);
  }, []);

  // 滑屏手势
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) < 30) return;
    if (ax > ay) handleMove(dx > 0 ? 'right' : 'left');
    else handleMove(dy > 0 ? 'down' : 'up');
  };

  const maxTile = board.flat().reduce((m, v) => Math.max(m, v), 0);

  return (
    <div
      className="w-full flex flex-col items-stretch px-2"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* 顶部：标题 + 分数（置顶） */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h1 className={`text-3xl font-black ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>2048</h1>
        <div className="flex gap-2">
          <div className={`text-center px-3 py-1.5 rounded-xl min-w-[68px] ${isDark ? 'bg-slate-800/80 border border-slate-700' : 'bg-white border border-gray-200'} shadow-sm`}>
            <div className={`text-[10px] font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>分数</div>
            <div className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{score}</div>
          </div>
          <div className={`text-center px-3 py-1.5 rounded-xl min-w-[68px] ${isDark ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-amber-100 border border-amber-200'} shadow-sm`}>
            <div className={`text-[10px] font-semibold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>最高</div>
            <div className={`text-lg font-black ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>{best}</div>
          </div>
        </div>
      </div>

      {/* 棋盘（核心） */}
      <div
        className={`relative mx-auto p-2.5 rounded-2xl border-2 shadow-lg touch-none ${
          isDark ? 'bg-slate-700/40 border-slate-600' : 'bg-gray-200/80 border-gray-300'
        }`}
        style={{
          width: 'min(94vw, 360px)',
          height: 'min(94vw, 360px)',
        }}
      >
        <div className="grid grid-cols-4 gap-2 w-full h-full">
          {board.flat().map((value, i) => {
            const style = getTileStyle(value);
            return (
              <div
                key={i}
                className={`rounded-lg flex items-center justify-center font-bold transition-all duration-150 ${
                  value === 0
                    ? (isDark ? 'bg-slate-600/30' : 'bg-gray-300/50')
                    : `${style.bg} ${style.text} shadow-md`
                }`}
                style={{
                  fontSize: 'clamp(1.1rem, 7vw, 2.2rem)',
                }}
              >
                {value > 0 ? value : ''}
              </div>
            );
          })}
        </div>

        {(gameOver || (won && !keepPlaying)) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
            <div className="text-center px-4 py-4 rounded-2xl bg-slate-900/90 border border-slate-600 shadow-2xl mx-3">
              <div className={`text-2xl font-black mb-2 ${gameOver ? (isDark ? 'text-red-400' : 'text-red-600') : (isDark ? 'text-yellow-400' : 'text-yellow-600')}`}>
                {gameOver ? '💥 游戏结束' : '🎉 达成 2048！'}
              </div>
              <div className={`text-xs mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                本局 <span className="font-bold">{score}</span> · 最大 <span className="font-bold">{maxTile}</span>
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={resetGame}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold active:scale-95 shadow-md ${
                    isDark ? 'bg-amber-600 text-white' : 'bg-amber-500 text-white'
                  }`}
                >
                  🔄 新游戏
                </button>
                {won && !keepPlaying && (
                  <button
                    onClick={() => { setKeepPlaying(true); setWon(false); }}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold active:scale-95 shadow-md ${
                      isDark ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                    }`}
                  >
                    继续
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 当前最大方块提示 */}
      <div className={`mt-3 mx-auto text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        最大方块 <span className="font-bold text-amber-500">{maxTile}</span>
      </div>

      {/* 新游戏按钮（拇指可达） */}
      <button
        onClick={resetGame}
        className={`mt-3 mx-auto min-h-[48px] w-full max-w-[min(94vw,360px)] py-3 rounded-xl font-bold text-base active:scale-95 shadow-md ${
          isDark ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white' : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
        }`}
      >
        🔄 新游戏
      </button>

      <p className={`mt-2 text-center text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        滑动棋盘合并数字，达成 2048
      </p>
    </div>
  );
}