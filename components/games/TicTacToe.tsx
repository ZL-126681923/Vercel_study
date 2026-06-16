'use client';

import { useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';

type Player = 'X' | 'O';
type Board = (Player | null)[];
type Winner = Player | 'draw' | null;

export default function TicTacToe() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [winner, setWinner] = useState<Winner>(null);
  const [scores, setScores] = useState({ X: 0, O: 0, draw: 0 });
  const { theme } = useTheme();
  
  const isDark = theme === 'dark';
  
  const winningLines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // 行
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // 列
    [0, 4, 8], [2, 4, 6]             // 对角线
  ];
  
  const checkWinner = (currentBoard: Board): Winner => {
    for (const [a, b, c] of winningLines) {
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return currentBoard[a];
      }
    }
    if (currentBoard.every(cell => cell !== null)) {
      return 'draw';
    }
    return null;
  };
  
  const handleCellClick = (index: number) => {
    if (board[index] !== null || winner !== null) return;
    
    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);
    
    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
      if (gameWinner === 'draw') {
        setScores(prev => ({ ...prev, draw: prev.draw + 1 }));
      } else {
        setScores(prev => ({ ...prev, [gameWinner]: prev[gameWinner] + 1 }));
      }
    } else {
      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    }
  };
  
  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
  };
  
  const getWinningCells = (): number[] => {
    for (const [a, b, c] of winningLines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return [a, b, c];
      }
    }
    return [];
  };
  
  const winningCells = getWinningCells();
  
  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className={`text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
          井字棋
        </h2>
        
        {/* 比分板 */}
        <div className="flex justify-center gap-8 mb-6">
          <div className={`px-6 py-3 rounded-xl ${currentPlayer === 'X' ? (isDark ? 'bg-blue-500/30 ring-2 ring-blue-400' : 'bg-blue-100 ring-2 ring-blue-300') : (isDark ? 'bg-gray-700/50' : 'bg-gray-100')}`}>
            <div className="text-3xl font-bold text-blue-400">X</div>
            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{scores.X}</div>
          </div>
          <div className={`px-6 py-3 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
            <div className="text-3xl font-bold text-gray-400">平</div>
            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{scores.draw}</div>
          </div>
          <div className={`px-6 py-3 rounded-xl ${currentPlayer === 'O' ? (isDark ? 'bg-pink-500/30 ring-2 ring-pink-400' : 'bg-pink-100 ring-2 ring-pink-300') : (isDark ? 'bg-gray-700/50' : 'bg-gray-100')}`}>
            <div className="text-3xl font-bold text-pink-400">O</div>
            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{scores.O}</div>
          </div>
        </div>
        
        {/* 游戏状态 */}
        {winner ? (
          <div className={`text-2xl font-bold mb-4 animate-pulse ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {winner === 'draw' ? '🤝 平局！' : `🎉 ${winner} 获胜！`}
          </div>
        ) : (
          <div className={`text-xl mb-4 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
            轮到 <span className={`font-bold ${currentPlayer === 'X' ? 'text-blue-400' : 'text-pink-400'}`}>{currentPlayer}</span> 下棋
          </div>
        )}
      </div>
      
      {/* 棋盘 */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {board.map((cell, index) => (
          <button
            key={index}
            onClick={() => handleCellClick(index)}
            disabled={cell !== null || winner !== null}
            className={`
              aspect-square rounded-2xl text-6xl font-bold flex items-center justify-center
              transition-all duration-200
              ${cell === null && !winner 
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
      
      {/* 重新开始按钮 */}
      <div className="text-center">
        <button
          onClick={resetGame}
          className={`px-8 py-4 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${
            isDark 
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white' 
              : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white'
          }`}
        >
          {winner ? '🔄 再来一局' : '🔄 重新开始'}
        </button>
      </div>
    </div>
  );
}
