'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { updateScore } from '@/lib/gameScores';

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

export default function Game2048() {
  const [board, setBoard] = useState<Board>(() => initBoard());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const { theme } = useTheme();
  const touchRef = useRef<{ x: number; y: number } | null>(null);

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
        updateScore('2048', prev => ({ ...prev, best: newScore }));
      }

      if (!keepPlaying && hasWon(newBoard) && !hasWon(prev)) {
        setWon(true);
      }

      if (!canMove(newBoard)) {
        setGameOver(true);
        updateScore('2048', prev => ({ ...prev, games: prev.games + 1 }));
      }

      return newBoard;
    });
  }, [score, best, gameOver, won, keepPlaying]);

  const resetGame = () => {
    setBoard(initBoard());
    setScore(0);
    setGameOver(false);
    setWon(false);
    setKeepPlaying(false);
  };

  // 键盘控制
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
      };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); handleMove(dir); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleMove]);

  // 触摸控制
  const handleTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 30) return;

    if (absDx > absDy) {
      handleMove(dx > 0 ? 'right' : 'left');
    } else {
      handleMove(dy > 0 ? 'down' : 'up');
    }
    touchRef.current = null;
  };

  const isDark = theme === 'dark';

  return (
    <div className="max-w-sm mx-auto select-none" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* 比分 */}
      <div className="flex gap-3 mb-4">
        <div className={`flex-1 text-center p-3 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
          <div className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>分数</div>
          <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{score}</div>
        </div>
        <div className={`flex-1 text-center p-3 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
          <div className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>最高</div>
          <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{best}</div>
        </div>
        <button
          onClick={resetGame}
          className={`px-4 py-2 rounded-xl font-semibold transition-all hover:scale-105 ${
            isDark ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-white'
          }`}
        >
          新游戏
        </button>
      </div>

      {/* 棋盘 */}
      <div className={`p-3 rounded-2xl ${isDark ? 'bg-gray-700/40' : 'bg-gray-200/80'}`}>
        <div className="grid grid-cols-4 gap-2.5">
          {board.flat().map((value, i) => {
            const style = getTileStyle(value);
            return (
              <div
                key={i}
                className={`aspect-square rounded-xl flex items-center justify-center font-bold transition-all duration-150 ${
                  value === 0
                    ? (isDark ? 'bg-gray-600/30' : 'bg-gray-300/50')
                    : `${style.bg} ${style.text}`
                } ${value >= 128 ? 'shadow-lg' : ''}`}
                style={{
                  fontSize: value >= 1024 ? '1.2rem' : value >= 128 ? '1.4rem' : '1.6rem',
                }}
              >
                {value > 0 ? value : ''}
              </div>
            );
          })}
        </div>
      </div>

      {/* 游戏结束/胜利覆盖层 */}
      {(gameOver || (won && !keepPlaying)) && (
        <div className="mt-4 text-center">
          <div className={`text-2xl font-bold mb-3 ${gameOver ? (isDark ? 'text-red-400' : 'text-red-600') : (isDark ? 'text-yellow-400' : 'text-yellow-600')}`}>
            {gameOver ? '游戏结束！' : '🎉 恭喜达成 2048！'}
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={resetGame}
              className={`px-6 py-2.5 rounded-xl font-semibold transition-all hover:scale-105 ${
                isDark ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-white'
              }`}
            >
              再来一局
            </button>
            {won && !keepPlaying && (
              <button
                onClick={() => { setKeepPlaying(true); setWon(false); }}
                className={`px-6 py-2.5 rounded-xl font-semibold transition-all hover:scale-105 ${
                  isDark ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-purple-500 hover:bg-purple-400 text-white'
                }`}
              >
                继续挑战
              </button>
            )}
          </div>
        </div>
      )}

      {/* 操作提示 */}
      <div className={`text-center mt-3 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        方向键 / WASD / 滑动操作
      </div>
    </div>
  );
}
