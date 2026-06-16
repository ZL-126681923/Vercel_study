'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import BoomerangGame from '@/components/games/BoomerangGame';
import TicTacToe from '@/components/games/TicTacToe';

type GameType = 'select' | 'boomerang' | 'tictactoe';

// 预定义的随机粒子数据，确保客户端和服务端一致
const PARTICLE_DATA = [
  { width: 4, height: 4, left: 15, top: 20, delay: 1, duration: 8 },
  { width: 5, height: 3, left: 45, top: 55, delay: 2.5, duration: 10 },
  { width: 3, height: 5, left: 75, top: 10, delay: 0.5, duration: 6 },
  { width: 6, height: 4, left: 25, top: 70, delay: 4, duration: 12 },
  { width: 4, height: 6, left: 85, top: 40, delay: 1.5, duration: 9 },
  { width: 3, height: 3, left: 5, top: 45, delay: 3, duration: 11 },
  { width: 5, height: 5, left: 60, top: 80, delay: 2, duration: 7 },
  { width: 4, height: 3, left: 35, top: 5, delay: 4.5, duration: 13 },
  { width: 6, height: 5, left: 70, top: 65, delay: 1, duration: 10 },
  { width: 3, height: 6, left: 90, top: 30, delay: 3.5, duration: 8 },
  { width: 5, height: 4, left: 50, top: 85, delay: 0.8, duration: 11 },
  { width: 4, height: 5, left: 65, top: 45, delay: 2.8, duration: 9 },
  { width: 6, height: 6, left: 10, top: 60, delay: 4.2, duration: 12 },
  { width: 3, height: 4, left: 80, top: 5, delay: 2.2, duration: 7 },
  { width: 5, height: 3, left: 40, top: 35, delay: 1.8, duration: 10 },
];

export default function GamesPage() {
  const [currentGame, setCurrentGame] = useState<GameType>('select');
  const [enterAnimation, setEnterAnimation] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  
  const isDark = theme === 'dark';
  
  useEffect(() => {
    setMounted(true);
    setTimeout(() => setEnterAnimation(true), 100);
  }, []);
  
  const selectGame = (game: GameType) => {
    setCurrentGame(game);
  };
  
  const goBack = () => {
    setCurrentGame('select');
  };
  
  // 避免在mount之前渲染任何内容
  if (!mounted) {
    return null;
  }
  
  return (
    <div className={`min-h-screen overflow-y-auto overflow-x-hidden transition-colors duration-700 ${
      isDark 
        ? 'bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900' 
        : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50'
    }`}>
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* 旋转的光晕 */}
        <div className={`absolute -top-20 -left-20 w-96 h-96 rounded-full blur-3xl opacity-20 animate-spin ${
          isDark ? 'bg-blue-500' : 'bg-blue-400'
        }`} style={{ animationDuration: '20s' }} />
        <div className={`absolute bottom-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-20 animate-pulse ${
          isDark ? 'bg-purple-500' : 'bg-purple-400'
        }`} style={{ animationDuration: '3s' }} />
        
        {/* 漂浮的粒子 */}
        {PARTICLE_DATA.map((data, i) => (
          <div
            key={i}
            className={`absolute rounded-full opacity-30 animate-float ${
              isDark ? 'bg-white' : 'bg-gray-800'
            }`}
            style={{
              width: `${data.width}px`,
              height: `${data.height}px`,
              left: `${data.left}%`,
              top: `${data.top}%`,
              animationDelay: `${data.delay}s`,
              animationDuration: `${data.duration}s`,
            }}
          />
        ))}
        
        {/* 网格背景 */}
        <div className={`absolute inset-0 opacity-10 ${
          isDark 
            ? 'bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px]' 
            : 'bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:50px_50px]'
        }`} />
      </div>
      
      {/* 选择界面 */}
      {currentGame === 'select' && (
        <div className={`relative z-10 flex flex-col items-center justify-start min-h-screen px-4 py-12 ${
          enterAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        } transition-all duration-1000`}>
          <div className="text-center mb-12">
            <h1 className={`text-4xl sm:text-5xl md:text-6xl font-black mb-4 bg-gradient-to-r ${
              isDark 
                ? 'from-blue-400 via-purple-400 to-pink-400' 
                : 'from-blue-600 via-purple-600 to-pink-600'
            } bg-clip-text text-transparent drop-shadow-2xl animate-text-shimmer`}>
              🎮 GAMER ZONE
            </h1>
            <p className={`text-lg sm:text-xl md:text-2xl font-light tracking-wider ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}>
              选择你的冒险
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full pb-12">
            {/* 回旋镖小鸟 */}
            <button
              onClick={() => selectGame('boomerang')}
              className={`group relative p-8 sm:p-10 md:p-12 rounded-3xl border-2 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 overflow-hidden ${
                isDark 
                  ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700 hover:border-purple-500' 
                  : 'bg-gradient-to-br from-white/90 to-gray-50/90 border-gray-200 hover:border-purple-400'
              } backdrop-blur-xl`}
            >
              {/* 卡片背景光晕 */}
              <div className={`absolute inset-0 bg-gradient-to-br from-red-500/10 to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10">
                <div className={`w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto mb-6 rounded-3xl flex items-center justify-center group-hover:rotate-12 transition-all duration-500 shadow-xl ${
                  isDark 
                    ? 'bg-gradient-to-br from-red-600 to-yellow-600' 
                    : 'bg-gradient-to-br from-red-500 to-yellow-500'
                }`}>
                  <span className="text-4xl sm:text-5xl md:text-6xl drop-shadow-2xl">🐦</span>
                </div>
                <h3 className={`text-2xl sm:text-2xl md:text-3xl font-bold mb-3 ${
                  isDark ? 'text-white' : 'text-gray-800'
                }`}>
                  回旋镖小鸟
                </h3>
                <p className={`text-base sm:text-lg mb-6 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  经典物理益智游戏，摧毁猪猪堡垒！
                </p>
                <div className="flex justify-center gap-3 flex-wrap">
                  <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-sm font-semibold ${
                    isDark 
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    6只小鸟
                  </span>
                  <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-sm font-semibold ${
                    isDark 
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    10个关卡
                  </span>
                </div>
              </div>
            </button>
            
            {/* 井字棋 */}
            <button
              onClick={() => selectGame('tictactoe')}
              className={`group relative p-8 sm:p-10 md:p-12 rounded-3xl border-2 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 overflow-hidden ${
                isDark 
                  ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700 hover:border-blue-500' 
                  : 'bg-gradient-to-br from-white/90 to-gray-50/90 border-gray-200 hover:border-blue-400'
              } backdrop-blur-xl`}
            >
              {/* 卡片背景光晕 */}
              <div className={`absolute inset-0 bg-gradient-to-br from-blue-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10">
                <div className={`w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto mb-6 rounded-3xl flex items-center justify-center group-hover:rotate-12 transition-all duration-500 shadow-xl ${
                  isDark 
                    ? 'bg-gradient-to-br from-blue-600 to-green-600' 
                    : 'bg-gradient-to-br from-blue-500 to-green-500'
                }`}>
                  <span className="text-4xl sm:text-5xl md:text-6xl drop-shadow-2xl">⭕</span>
                </div>
                <h3 className={`text-2xl sm:text-2xl md:text-3xl font-bold mb-3 ${
                  isDark ? 'text-white' : 'text-gray-800'
                }`}>
                  井字棋
                </h3>
                <p className={`text-base sm:text-lg mb-6 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  经典双人对战，谁能连成一线？
                </p>
                <div className="flex justify-center gap-3 flex-wrap">
                  <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-sm font-semibold ${
                    isDark 
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    双人对战
                  </span>
                  <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-sm font-semibold ${
                    isDark 
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    简单有趣
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
      
      {/* 游戏界面 */}
      {currentGame !== 'select' && (
        <div className="relative z-20 flex flex-col items-center justify-start min-h-screen px-4 py-8">
          {/* 返回按钮 */}
          <button
            onClick={goBack}
            className={`absolute top-4 left-4 sm:top-6 z-50 group p-3 sm:p-4 rounded-2xl transition-all duration-300 hover:scale-110 ${
              isDark 
                ? 'bg-slate-800/70 hover:bg-slate-700 text-white' 
                : 'bg-white/70 hover:bg-white text-gray-800'
            } backdrop-blur-xl border border-white/10 shadow-2xl`}
          >
            <svg className="w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* 游戏标题 */}
          <div className={`mb-6 sm:mb-8 mt-16 sm:mt-16 ${
            currentGame === 'boomerang' ? 'animate-pulse-slow' : ''
          }`}>
            <h2 className={`text-2xl sm:text-3xl md:text-4xl font-black text-center ${
              isDark ? 'text-white' : 'text-gray-800'
            }`}>
              {currentGame === 'boomerang' ? '🐦 回旋镖小鸟' : '⭕ 井字棋'}
            </h2>
          </div>
          
          {/* 游戏内容 */}
          <div className={`relative max-w-5xl w-full transition-all duration-700 pb-12 ${
            enterAnimation ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}>
            {/* 霓虹边框 */}
            <div className={`absolute -inset-1 bg-gradient-to-r ${
              currentGame === 'boomerang' 
                ? 'from-red-500 via-yellow-500 to-red-500' 
                : 'from-blue-500 via-purple-500 to-pink-500'
            } rounded-3xl blur opacity-50 group-hover:opacity-75 transition-opacity duration-1000`} />
            
            <div className={`relative bg-gradient-to-br rounded-3xl border-2 shadow-2xl overflow-hidden ${
              isDark 
                ? 'from-slate-900 via-slate-800 to-slate-900 border-slate-600' 
                : 'from-white via-gray-50 to-white border-gray-200'
            }`}>
              <div className="p-4 sm:p-6 md:p-8">
                {currentGame === 'boomerang' ? <BoomerangGame /> : <TicTacToe />}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 全局样式 */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes text-shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .animate-float { animation: float ease-in-out infinite; }
        .animate-text-shimmer { 
          background-size: 200% 200%; 
          animation: text-shimmer 3s ease-in-out infinite; 
        }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
