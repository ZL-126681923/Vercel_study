'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { updateScore } from '@/lib/gameScores';

/**
 * Mobile 端井字棋
 * 设计要点：
 * - 自适应宽度，最大宽度不超过视口 - 16px
 * - 核心信息（当前回合 / 胜负状态）置顶
 * - 大号触点（44px+，单元格 ≥25vmin）
 * - 单手握持：操作按钮下移至底部，安全区域适配
 * - 滑屏手势：向上/下/左/右滑动可快速落子（取最近空格）
 * - 紧凑战绩栏（两行三列）
 * - 适配 iPhone SE（320px）到 iPad（768px+）
 */

type Player = 'X' | 'O';
type Board = (Player | null)[];
type Winner = Player | 'draw' | null;

const WINNING_LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board: Board): Winner {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(c => c !== null)) return 'draw';
  return null;
}

function getWinningCells(board: Board): number[] {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return [a, b, c];
  }
  return [];
}

function minimax(board: Board, isMaximizing: boolean): number {
  const winner = checkWinner(board);
  if (winner === 'O') return 10;
  if (winner === 'X') return -10;
  if (winner === 'draw') return 0;
  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'O';
        best = Math.max(best, minimax(board, false));
        board[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'X';
        best = Math.min(best, minimax(board, true));
        board[i] = null;
      }
    }
    return best;
  }
}

function getBestMove(board: Board): number {
  if (Math.random() < 0.3) {
    const empty = board.map((v, i) => v === null ? i : -1).filter(i => i >= 0);
    if (empty.length > 0) return empty[Math.floor(Math.random() * empty.length)];
  }
  let bestScore = -Infinity;
  let bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = 'O';
      const score = minimax(board, false);
      board[i] = null;
      if (score > bestScore) { bestScore = score; bestMove = i; }
    }
  }
  return bestMove;
}

type Difficulty = 'easy' | 'normal' | 'hard';
const diffLabels: Record<Difficulty, string> = { easy: '简单', normal: '普通', hard: '困难' };

export default function TicTacToeMobile() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [winner, setWinner] = useState<Winner>(null);
  const [scores, setScores] = useState<{ wins: number; losses: number; draws: number }>(() => {
    if (typeof window === 'undefined') return { wins: 0, losses: 0, draws: 0 };
    try {
      const raw = localStorage.getItem('game_scores');
      return raw ? (JSON.parse(raw).tictactoe ?? { wins: 0, losses: 0, draws: 0 }) : { wins: 0, losses: 0, draws: 0 };
    } catch { return { wins: 0, losses: 0, draws: 0 }; }
  });
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [aiThinking, setAiThinking] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const resetGame = useCallback(() => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
    setAiThinking(false);
  }, []);

  const setDifficultyAndReset = useCallback((d: Difficulty) => {
    setDifficulty(d);
    resetGame();
  }, [resetGame]);

  useEffect(() => {
    if (currentPlayer === 'O' && !winner && !aiThinking) {
      setAiThinking(true);
      const timer = setTimeout(() => {
        setBoard(prev => {
          const newBoard = [...prev];
          let move = -1;
          if (difficulty === 'easy') {
            const empty = newBoard.map((v, i) => v === null ? i : -1).filter(i => i >= 0);
            move = empty[Math.floor(Math.random() * empty.length)];
          } else if (difficulty === 'normal') {
            move = getBestMove(newBoard);
          } else {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
              if (newBoard[i] === null) {
                newBoard[i] = 'O';
                const score = minimax(newBoard, false);
                newBoard[i] = null;
                if (score > bestScore) { bestScore = score; move = i; }
              }
            }
          }
          if (move >= 0) newBoard[move] = 'O';
          const gameWinner = checkWinner(newBoard);
          if (gameWinner) {
            setWinner(gameWinner);
            if (gameWinner === 'O') {
              const ns = updateScore('tictactoe', p => ({ ...p, losses: p.losses + 1 }));
              setScores(ns.tictactoe);
            } else if (gameWinner === 'draw') {
              const ns = updateScore('tictactoe', p => ({ ...p, draws: p.draws + 1 }));
              setScores(ns.tictactoe);
            }
          } else {
            setCurrentPlayer('X');
          }
          setAiThinking(false);
          return newBoard;
        });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, winner, difficulty, aiThinking]);

  const handleCellClick = useCallback((index: number) => {
    if (board[index] !== null || winner !== null || currentPlayer !== 'X' || aiThinking) return;
    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);
    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
      if (gameWinner === 'X') {
        const ns = updateScore('tictactoe', p => ({ ...p, wins: p.wins + 1 }));
        setScores(ns.tictactoe);
      } else if (gameWinner === 'draw') {
        const ns = updateScore('tictactoe', p => ({ ...p, draws: p.draws + 1 }));
        setScores(ns.tictactoe);
      }
    } else {
      setCurrentPlayer('O');
    }
  }, [board, winner, currentPlayer, aiThinking]);

  // 滑屏手势：在棋盘区向上/下/左/右滑动，自动选最近空格
  const onTouchStart = (e: React.TouchEvent) => {
    if (currentPlayer !== 'X' || aiThinking || winner) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dt = Date.now() - start.t;
    if (dt > 600) return;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;

    // 找主方向上距离最近的空格
    let dir: 'L' | 'R' | 'U' | 'D';
    if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'R' : 'L';
    else dir = dy > 0 ? 'D' : 'U';

    let candidates: number[] = [];
    if (dir === 'L') candidates = [0, 3, 6, 1, 4, 7, 2, 5, 8];
    else if (dir === 'R') candidates = [2, 5, 8, 1, 4, 7, 0, 3, 6];
    else if (dir === 'U') candidates = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    else candidates = [6, 7, 8, 3, 4, 5, 0, 1, 2];

    for (const idx of candidates) {
      if (board[idx] === null) {
        handleCellClick(idx);
        return;
      }
    }
  };

  const winningCells = winner && winner !== 'draw' ? getWinningCells(board) : [];
  const totalGames = scores.wins + scores.losses + scores.draws;
  const winRate = totalGames > 0 ? Math.round((scores.wins / totalGames) * 100) : 0;

  return (
    <div
      className="w-full flex flex-col items-stretch px-2 pb-4"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
    >
      {/* 顶部核心信息（置顶） */}
      <div className={`mb-3 px-3 py-2.5 rounded-2xl shadow-md border ${
        isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'
      }`}>
        {winner ? (
          <div className="flex items-center justify-between gap-2">
            <span className={`text-base font-bold ${winner === 'draw' ? 'text-amber-500' : winner === 'X' ? 'text-emerald-500' : 'text-pink-500'}`}>
              {winner === 'draw' ? '🤝 平局' : winner === 'X' ? '🎉 你赢了' : '😤 AI获胜'}
            </span>
            <button type="button"
              onClick={resetGame}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-95 ${
                isDark ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
              }`}
            >
              再来一局
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm font-bold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              {aiThinking ? '🤖 AI 思考中…' : '👤 你的回合（X）'}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
              {diffLabels[difficulty]}
            </span>
          </div>
        )}
      </div>

      {/* 棋盘（核心内容） */}
      <div
        className={`mx-auto grid grid-cols-3 gap-2 p-2 rounded-2xl border-2 shadow-lg touch-manipulation ${
          isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'
        }`}
        style={{
          width: 'min(92vw, 360px)',
          height: 'min(92vw, 360px)',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {board.map((cell, index) => {
          const isWinning = winningCells.includes(index);
          const canTap = cell === null && !winner && !aiThinking && currentPlayer === 'X';
          return (
            <button type="button"
              key={index}
              onClick={() => handleCellClick(index)}
              disabled={!canTap}
              className={`
                rounded-xl flex items-center justify-center
                transition-all duration-150 select-none
                ${cell === null
                  ? isDark
                    ? 'bg-slate-700/60 active:bg-slate-600/80 border border-slate-600'
                    : 'bg-white active:bg-gray-100 border border-gray-200'
                  : isDark ? 'bg-slate-900/70 border border-slate-700' : 'bg-white border border-gray-200'
                }
                ${isWinning ? 'ring-4 ring-emerald-400 animate-pulse' : ''}
              `}
              style={{
                fontSize: 'clamp(2.5rem, 12vmin, 4rem)',
                fontWeight: 800,
              }}
            >
              {cell && (
                <span className={cell === 'X' ? 'text-blue-400' : 'text-pink-400'}>{cell}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 战绩（紧凑） */}
      <div className={`mt-3 mx-auto px-3 py-2 rounded-2xl shadow-sm border w-full max-w-[min(92vw,360px)] ${
        isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-gray-200'
      }`}>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className={`text-center py-1.5 rounded-lg ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
            <div className={`text-[10px] ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>胜</div>
            <div className={`text-base font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{scores.wins}</div>
          </div>
          <div className={`text-center py-1.5 rounded-lg ${isDark ? 'bg-gray-500/15' : 'bg-gray-100'}`}>
            <div className={`text-[10px] ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>平</div>
            <div className={`text-base font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{scores.draws}</div>
          </div>
          <div className={`text-center py-1.5 rounded-lg ${isDark ? 'bg-pink-500/15' : 'bg-pink-50'}`}>
            <div className={`text-[10px] ${isDark ? 'text-pink-300' : 'text-pink-700'}`}>负</div>
            <div className={`text-base font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{scores.losses}</div>
          </div>
        </div>
        <div className={`flex items-center justify-between text-[10px] px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <span>共 {totalGames} 局</span>
          <span className="font-semibold text-emerald-500">胜率 {winRate}%</span>
        </div>
      </div>

      {/* 难度选择 + 重开（拇指可达区） */}
      <div className="mt-3 mx-auto w-full max-w-[min(92vw,360px)] grid grid-cols-3 gap-2">
        {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
          <button type="button"
            key={d}
            onClick={() => setDifficultyAndReset(d)}
            className={`min-h-[44px] py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
              difficulty === d
                ? isDark ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                : isDark ? 'bg-slate-700/60 text-gray-300' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {diffLabels[d]}
          </button>
        ))}
      </div>

      <button type="button"
        onClick={resetGame}
        className={`mt-2 mx-auto min-h-[48px] w-full max-w-[min(92vw,360px)] py-3 rounded-xl font-bold text-base active:scale-95 shadow-md ${
          isDark ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
        }`}
      >
        🔄 重新开始
      </button>

      {/* 操作提示（极小屏时收纳） */}
      <p className={`mt-3 text-center text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        点击格子或滑屏落子（↑↓←→ 快速填子）
      </p>
    </div>
  );
}