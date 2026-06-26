'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { updateScore } from '@/lib/gameScores';

type Player = 'X' | 'O';
type Board = (Player | null)[];
type Winner = Player | 'draw' | null;

const WINNING_LINES = [
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

// Minimax AI
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
  // 30%概率随机走，降低难度
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

export default function TicTacToe() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [winner, setWinner] = useState<Winner>(null);
  const [scores, setScores] = useState<{ wins: number; losses: number; draws: number }>(() => {
    if (typeof window === 'undefined') return { wins: 0, losses: 0, draws: 0 };
    try {
      const raw = localStorage.getItem('game_scores');
      return raw ? (JSON.parse(raw).tictactoe ?? { wins: 0, losses: 0, draws: 0 }) : { wins: 0, losses: 0, draws: 0 };
    } catch {
      return { wins: 0, losses: 0, draws: 0 };
    }
  });
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [aiThinking, setAiThinking] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // AI走棋
  useEffect(() => {
    if (currentPlayer === 'O' && !winner && !aiThinking) {
      setAiThinking(true);
      const timer = setTimeout(() => {
        setBoard(prev => {
          const newBoard = [...prev];
          let move: number;
          if (difficulty === 'easy') {
            const empty = newBoard.map((v, i) => v === null ? i : -1).filter(i => i >= 0);
            move = empty[Math.floor(Math.random() * empty.length)];
          } else if (difficulty === 'normal') {
            move = getBestMove(newBoard);
          } else {
            // hard: 纯minimax
            let bestScore = -Infinity;
            move = -1;
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
              const newScores = updateScore('tictactoe', prev => ({ ...prev, losses: prev.losses + 1 }));
              setScores(newScores.tictactoe);
            } else if (gameWinner === 'draw') {
              const newScores = updateScore('tictactoe', prev => ({ ...prev, draws: prev.draws + 1 }));
              setScores(newScores.tictactoe);
            }
          } else {
            setCurrentPlayer('X');
          }
          setAiThinking(false);
          return newBoard;
        });
      }, 400);
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
        const newScores = updateScore('tictactoe', prev => ({ ...prev, wins: prev.wins + 1 }));
        setScores(newScores.tictactoe);
      } else if (gameWinner === 'draw') {
        const newScores = updateScore('tictactoe', prev => ({ ...prev, draws: prev.draws + 1 }));
        setScores(newScores.tictactoe);
      }
    } else {
      setCurrentPlayer('O');
    }
  }, [board, winner, currentPlayer, aiThinking]);

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
    setAiThinking(false);
  };

  const winningCells = winner && winner !== 'draw' ? getWinningCells(board) : [];

  const diffLabels: Record<Difficulty, string> = { easy: '简单', normal: '普通', hard: '困难' };

  return (
    <div className="w-full max-w-md mx-auto px-1 sm:px-0">
      <div className="text-center mb-6">
        {/* 难度选择 */}
        <div className="flex justify-center gap-2 mb-4">
          {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
            <button type="button"
              key={d}
              onClick={() => { setDifficulty(d); resetGame(); }}
              className={`min-w-[3.5rem] min-h-[2.25rem] px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
                difficulty === d
                  ? (isDark ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white')
                  : (isDark ? 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')
              }`}
            >
              {diffLabels[d]}
            </button>
          ))}
        </div>

        {/* 比分板 */}
        <div className="flex justify-center gap-2 sm:gap-4 mb-4">
          <div className={`flex-1 max-w-[7rem] px-3 sm:px-5 py-2 rounded-xl ${isDark ? 'bg-green-500/20' : 'bg-green-100'}`}>
            <div className="text-xs font-semibold text-green-500">胜</div>
            <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{scores.wins}</div>
          </div>
          <div className={`flex-1 max-w-[7rem] px-3 sm:px-5 py-2 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
            <div className="text-xs font-semibold text-gray-400">平</div>
            <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{scores.draws}</div>
          </div>
          <div className={`flex-1 max-w-[7rem] px-3 sm:px-5 py-2 rounded-xl ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
            <div className="text-xs font-semibold text-red-500">负</div>
            <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{scores.losses}</div>
          </div>
        </div>

        {/* 状态 */}
        {winner ? (
          <div className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {winner === 'draw' ? '🤝 平局！' : winner === 'X' ? '🎉 你赢了！' : '😤 AI获胜！'}
          </div>
        ) : (
          <div className={`text-lg mb-4 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
            {aiThinking ? '🤖 AI思考中...' : '👤 你的回合 (X)'}
          </div>
        )}
      </div>

      {/* 棋盘 */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 w-full max-w-[min(28rem,calc(100vw-2rem))] mx-auto">
        {board.map((cell, index) => (
          <button type="button"
            key={index}
            onClick={() => handleCellClick(index)}
            disabled={cell !== null || winner !== null || aiThinking}
            className={`
              aspect-square rounded-2xl text-4xl xs:text-5xl sm:text-6xl font-bold flex items-center justify-center
              touch-manipulation select-none
              transition-all duration-200 active:scale-95
              ${cell === null && !winner && !aiThinking
                ? (isDark ? 'bg-gray-700/50 hover:bg-gray-600/50 border-2 border-gray-600 hover:border-gray-400' : 'bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300')
                : (isDark ? 'bg-gray-800/50 border-2 border-gray-700' : 'bg-gray-50 border-2 border-gray-100')}
              ${winningCells.includes(index) ? 'ring-4 ring-green-400 animate-pulse' : ''}
              ${cell === 'X' ? 'text-blue-400' : cell === 'O' ? 'text-pink-400' : ''}
              disabled:cursor-not-allowed
            `}
          >
            {cell}
          </button>
        ))}
      </div>

      <div className="text-center">
        <button type="button"
          onClick={resetGame}
          className={`min-h-[2.75rem] px-8 py-3 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 hover:scale-105 ${
            isDark
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
              : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
          }`}
        >
          🔄 重新开始
        </button>
      </div>
    </div>
  );
}
