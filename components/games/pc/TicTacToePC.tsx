'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { updateScore } from '@/lib/gameScores';

/**
 * PC 端井字棋
 * 设计要点：
 * - 宽屏布局：左侧大棋盘（≥480px 固定尺寸）+ 右侧信息栏（战绩 / 难度 / 提示 / 操作说明）
 * - 鼠标悬停预览落子位置（仅在 X 回合且格子为空时显示半透明 X）
 * - 键盘快捷键：1-9 选择格子，R 重开，1/2/3 切换难度
 * - 固定像素尺寸（非百分比），适配 1920×1080 及以上
 */

type Player = 'X' | 'O';
type Board = (Player | null)[];
type Winner = Player | 'draw' | null;

const WINNING_LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const KEY_TO_INDEX: Record<string, number> = {
  Digit1: 0, Digit2: 1, Digit3: 2,
  Digit4: 3, Digit5: 4, Digit6: 5,
  Digit7: 6, Digit8: 7, Digit9: 8,
  Numpad1: 0, Numpad2: 1, Numpad3: 2,
  Numpad4: 3, Numpad5: 4, Numpad6: 5,
  Numpad7: 6, Numpad8: 7, Numpad9: 8,
};

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

export default function TicTacToePC() {
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
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const resetGame = useCallback(() => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
    setAiThinking(false);
    setHoverIndex(null);
  }, []);

  const setDifficultyAndReset = useCallback((d: Difficulty) => {
    setDifficulty(d);
    resetGame();
  }, [resetGame]);

  // AI 走棋
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

  // 键盘快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') {
        e.preventDefault();
        resetGame();
        return;
      }
      if (e.code === 'Digit1' && e.altKey) { e.preventDefault(); setDifficultyAndReset('easy'); return; }
      if (e.code === 'Digit2' && e.altKey) { e.preventDefault(); setDifficultyAndReset('normal'); return; }
      if (e.code === 'Digit3' && e.altKey) { e.preventDefault(); setDifficultyAndReset('hard'); return; }
      const idx = KEY_TO_INDEX[e.code];
      if (idx !== undefined && currentPlayer === 'X' && !aiThinking && !winner) {
        e.preventDefault();
        handleCellClick(idx);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [resetGame, setDifficultyAndReset, currentPlayer, aiThinking, winner, handleCellClick]);

  const winningCells = winner && winner !== 'draw' ? getWinningCells(board) : [];
  const totalGames = scores.wins + scores.losses + scores.draws;
  const winRate = totalGames > 0 ? Math.round((scores.wins / totalGames) * 100) : 0;

  return (
    <div className="w-full flex flex-row items-start justify-center gap-8">
      {/* 左侧：棋盘区域 */}
      <div className="flex flex-col items-center">
        {/* 状态栏 */}
        <div
          className={`mb-5 px-6 py-3 rounded-xl min-w-[28rem] text-center shadow-md border ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'
          }`}
        >
          {winner ? (
            <div className="flex items-center justify-center gap-3">
              <span className={`text-2xl font-bold ${winner === 'draw' ? 'text-amber-500' : winner === 'X' ? 'text-emerald-500' : 'text-pink-500'}`}>
                {winner === 'draw' ? '🤝 平局' : winner === 'X' ? '🎉 你赢了' : '😤 AI获胜'}
              </span>
              <button type="button"
                onClick={resetGame}
                className={`ml-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all hover:scale-105 ${
                  isDark ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-purple-500 hover:bg-purple-400 text-white'
                }`}
              >
                再来一局 (R)
              </button>
            </div>
          ) : (
            <div className={`text-lg font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              {aiThinking ? '🤖 AI 思考中…' : `👤 你的回合（X）`}
            </div>
          )}
        </div>

        {/* 棋盘 - PC 端固定大尺寸 480×480 */}
        <div
          className={`grid grid-cols-3 gap-3 p-4 rounded-2xl border-2 shadow-xl ${
            isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'
          }`}
          style={{ width: 504, height: 504 }}
        >
          {board.map((cell, index) => {
            const isWinning = winningCells.includes(index);
            const canHover = cell === null && !winner && !aiThinking && currentPlayer === 'X';
            const showHover = canHover && hoverIndex === index;
            return (
              <button type="button"
                key={index}
                onClick={() => handleCellClick(index)}
                onMouseEnter={() => canHover && setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
                disabled={!canHover}
                className={`
                  rounded-xl flex items-center justify-center
                  transition-all duration-150 select-none
                  ${cell === null
                    ? isDark
                      ? 'bg-slate-700/60 hover:bg-slate-600/80 border border-slate-600 hover:border-slate-400'
                      : 'bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-400'
                    : isDark ? 'bg-slate-900/70 border border-slate-700' : 'bg-white border border-gray-200'
                  }
                  ${isWinning ? 'ring-4 ring-emerald-400 animate-pulse' : ''}
                `}
                style={{
                  width: 152,
                  height: 152,
                  fontSize: 96,
                  fontWeight: 800,
                }}
              >
                {cell && (
                  <span className={cell === 'X' ? 'text-blue-400' : 'text-pink-400'}>{cell}</span>
                )}
                {!cell && showHover && (
                  <span className="text-blue-400/30">X</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 右侧：信息栏 */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4">
        {/* 战绩卡片 */}
        <div className={`p-5 rounded-2xl border shadow-md ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <span>📊</span> 战绩
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className={`text-center p-2 rounded-lg ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
              <div className={`text-[11px] ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>胜</div>
              <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{scores.wins}</div>
            </div>
            <div className={`text-center p-2 rounded-lg ${isDark ? 'bg-gray-500/15' : 'bg-gray-100'}`}>
              <div className={`text-[11px] ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>平</div>
              <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{scores.draws}</div>
            </div>
            <div className={`text-center p-2 rounded-lg ${isDark ? 'bg-pink-500/15' : 'bg-pink-50'}`}>
              <div className={`text-[11px] ${isDark ? 'text-pink-300' : 'text-pink-700'}`}>负</div>
              <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{scores.losses}</div>
            </div>
          </div>
          <div className={`flex items-center justify-between text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <span>共 {totalGames} 局</span>
            <span className="font-semibold text-emerald-500">胜率 {winRate}%</span>
          </div>
        </div>

        {/* 难度选择 */}
        <div className={`p-5 rounded-2xl border shadow-md ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <span>⚙️</span> 难度
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'normal', 'hard'] as Difficulty[]).map((d, i) => (
              <button type="button"
                key={d}
                onClick={() => setDifficultyAndReset(d)}
                className={`py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105 ${
                  difficulty === d
                    ? isDark ? 'bg-purple-600 text-white shadow-md' : 'bg-purple-500 text-white shadow-md'
                    : isDark ? 'bg-slate-700/60 text-gray-300 hover:bg-slate-600/80' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {diffLabels[d]}
                <span className="block text-[10px] opacity-70 mt-0.5">Alt+{i + 1}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 操作说明 */}
        <div className={`p-5 rounded-2xl border shadow-md ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <span>⌨️</span> 键盘快捷键
          </h3>
          <ul className={`text-xs space-y-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            <li className="flex justify-between"><span>落子</span><kbd className={`px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>1-9</kbd></li>
            <li className="flex justify-between"><span>重新开始</span><kbd className={`px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>R</kbd></li>
            <li className="flex justify-between"><span>切换难度</span><kbd className={`px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>Alt+1/2/3</kbd></li>
            <li className="flex justify-between"><span>鼠标悬停</span><span className="text-emerald-500">预览落子</span></li>
          </ul>
        </div>

        {/* 重新开始 */}
        <button type="button"
          onClick={resetGame}
          className={`py-3 rounded-xl font-bold text-base transition-all hover:scale-[1.02] shadow-md ${
            isDark ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white' : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white'
          }`}
        >
          🔄 重新开始
        </button>
      </div>
    </div>
  );
}