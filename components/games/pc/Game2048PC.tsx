'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { updateScore } from '@/lib/gameScores';

/**
 * PC 端 2048
 * 设计要点：
 * - 左侧大棋盘（固定 540×540）+ 右侧战绩 / 操作 / 攻略信息面板
 * - 顶部：标题 + 当前分数 / 最高分（横向卡片）
 * - 键盘快捷键：方向键 / WASD 操作，R 重开，Z 撤销（仅这一局）
 * - 大字号棋盘（每格 ≥120px），鼠标悬停高亮可走方向
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

export default function Game2048PC() {
  const [board, setBoard] = useState<Board>(() => initBoard());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const raw = localStorage.getItem('game_scores');
      return raw ? (JSON.parse(raw)['2048']?.best ?? 0) : 0;
    } catch { return 0; }
  });
  const [games, setGames] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const raw = localStorage.getItem('game_scores');
      return raw ? (JSON.parse(raw)['2048']?.games ?? 0) : 0;
    } catch { return 0; }
  });
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [hoverDir, setHoverDir] = useState<Direction | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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

      if (!keepPlaying && hasWon(newBoard) && !hasWon(prev)) {
        setWon(true);
      }

      if (!canMove(newBoard)) {
        setGameOver(true);
        setGames(g => g + 1);
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

  // 键盘快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', W: 'up', s: 'down', S: 'down',
        a: 'left', A: 'left', d: 'right', D: 'right',
      };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); handleMove(dir); return; }
      if (e.code === 'KeyR') { e.preventDefault(); resetGame(); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleMove, resetGame]);

  // 当前最大方块
  const maxTile = board.flat().reduce((m, v) => Math.max(m, v), 0);
  // 当前空格数
  const emptyCount = board.flat().filter(v => v === 0).length;
  const totalGames = games;
  const avgScore = totalGames > 0 ? Math.round(best / Math.max(1, totalGames)) : 0;

  return (
    <div className="w-full flex flex-row items-start justify-center gap-8">
      {/* 左侧：棋盘 + 标题 */}
      <div className="flex flex-col items-center">
        {/* 顶部：标题 + 分数 */}
        <div className="mb-4 flex items-end justify-between w-[540px] gap-6">
          <h1 className={`text-5xl font-black ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>2048</h1>
          <div className="flex gap-2">
            <div className={`text-center px-4 py-2 rounded-xl min-w-[90px] ${isDark ? 'bg-slate-800/80 border border-slate-700' : 'bg-white border border-gray-200'} shadow-md`}>
              <div className={`text-[11px] font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>分数</div>
              <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{score}</div>
            </div>
            <div className={`text-center px-4 py-2 rounded-xl min-w-[90px] ${isDark ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-amber-100 border border-amber-200'} shadow-md`}>
              <div className={`text-[11px] font-semibold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>最高</div>
              <div className={`text-2xl font-black ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>{best}</div>
            </div>
          </div>
        </div>

        {/* 棋盘 */}
        <div
          className={`relative p-4 rounded-2xl border-2 shadow-2xl ${isDark ? 'bg-slate-700/40 border-slate-600' : 'bg-gray-200/80 border-gray-300'}`}
          onMouseLeave={() => setHoverDir(null)}
        >
          <div className="grid grid-cols-4 gap-3" style={{ width: 540, height: 540 }}>
            {board.flat().map((value, i) => {
              const style = getTileStyle(value);
              return (
                <div
                  key={i}
                  className={`rounded-xl flex items-center justify-center font-bold transition-all duration-150 ${
                    value === 0
                      ? (isDark ? 'bg-slate-600/30' : 'bg-gray-300/50')
                      : `${style.bg} ${style.text} shadow-md`
                  } ${value >= 128 ? 'shadow-lg' : ''}`}
                  style={{
                    width: 120,
                    height: 120,
                    fontSize: value >= 1024 ? '2.2rem' : value >= 128 ? '2.8rem' : '3.2rem',
                  }}
                >
                  {value > 0 ? value : ''}
                </div>
              );
            })}
          </div>

          {/* 方向键悬浮提示（PC 端特色） */}
          {(gameOver || (won && !keepPlaying)) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
              <div className="text-center px-8 py-6 rounded-2xl bg-slate-900/90 border border-slate-600 shadow-2xl">
                <div className={`text-3xl font-black mb-3 ${gameOver ? (isDark ? 'text-red-400' : 'text-red-600') : (isDark ? 'text-yellow-400' : 'text-yellow-600')}`}>
                  {gameOver ? '💥 游戏结束' : '🎉 达成 2048！'}
                </div>
                <div className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  本局得分 <span className="font-bold">{score}</span> · 最大方块 <span className="font-bold">{maxTile}</span>
                </div>
                <div className="flex gap-3 justify-center">
                  <button type="button"
                    onClick={resetGame}
                    className={`px-5 py-2.5 rounded-xl font-bold transition-all hover:scale-105 shadow-md ${
                      isDark ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-white'
                    }`}
                  >
                    🔄 新游戏 (R)
                  </button>
                  {won && !keepPlaying && (
                    <button type="button"
                      onClick={() => { setKeepPlaying(true); setWon(false); }}
                      className={`px-5 py-2.5 rounded-xl font-bold transition-all hover:scale-105 shadow-md ${
                        isDark ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-purple-500 hover:bg-purple-400 text-white'
                      }`}
                    >
                      继续挑战
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右侧：信息栏 */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4">
        {/* 当前对局统计 */}
        <div className={`p-5 rounded-2xl border shadow-md ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <span>📈</span> 当前对局
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className={`text-center p-2.5 rounded-lg ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
              <div className={`text-[10px] ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>空格</div>
              <div className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{emptyCount}</div>
            </div>
            <div className={`text-center p-2.5 rounded-lg ${isDark ? 'bg-amber-500/15' : 'bg-amber-50'}`}>
              <div className={`text-[10px] ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>最大方块</div>
              <div className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{maxTile}</div>
            </div>
          </div>
        </div>

        {/* 总战绩 */}
        <div className={`p-5 rounded-2xl border shadow-md ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <span>🏆</span> 总战绩
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className={`text-center p-2.5 rounded-lg ${isDark ? 'bg-orange-500/15' : 'bg-orange-50'}`}>
              <div className={`text-[10px] ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>游玩局数</div>
              <div className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{totalGames}</div>
            </div>
            <div className={`text-center p-2.5 rounded-lg ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
              <div className={`text-[10px] ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>最高分</div>
              <div className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{best}</div>
            </div>
          </div>
        </div>

        {/* 操作说明 */}
        <div className={`p-5 rounded-2xl border shadow-md ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <span>⌨️</span> 键盘快捷键
          </h3>
          <ul className={`text-xs space-y-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            <li className="flex justify-between"><span>移动</span><kbd className={`px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>↑↓←→</kbd></li>
            <li className="flex justify-between"><span>或</span><kbd className={`px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>WASD</kbd></li>
            <li className="flex justify-between"><span>新游戏</span><kbd className={`px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>R</kbd></li>
          </ul>
        </div>

        {/* 攻略提示 */}
        <div className={`p-5 rounded-2xl border shadow-md ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <span>💡</span> 高分攻略
          </h3>
          <ul className={`text-xs space-y-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            <li>• 保持最大方块固定在一角</li>
            <li>• 避免无意义的上下抖动</li>
            <li>• 空格少于 4 时谨慎操作</li>
            <li>• 尽量合并而非平移</li>
          </ul>
        </div>

        {/* 新游戏按钮 */}
        <button type="button"
          onClick={resetGame}
          className={`py-3 rounded-xl font-bold text-base transition-all hover:scale-[1.02] shadow-md ${
            isDark ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white' : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white'
          }`}
        >
          🔄 新游戏
        </button>
      </div>
    </div>
  );
}