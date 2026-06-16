'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/components/ThemeProvider';
import { GAME_SCORES_UPDATED_EVENT, getScores, type GameScores } from '@/lib/gameScores';
import BoomerangGame from '@/components/games/BoomerangGame';
import TicTacToe from '@/components/games/TicTacToe';
import Game2048 from '@/components/games/Game2048';

type GameType = 'select' | 'boomerang' | 'tictactoe' | '2048';

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
  const [mounted, setMounted] = useState(false);
  const [scores, setScores] = useState<GameScores>(getScores());
  const { theme } = useTheme();
  
  const isDark = theme === 'dark';
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // 监听分数更新，同标签页和跨标签页都能实时刷新分数榜
  useEffect(() => {
    const refresh = () => setScores(getScores());
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const onCustomUpdate = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'game_scores') refresh();
    };

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener(GAME_SCORES_UPDATED_EVENT, onCustomUpdate);
    window.addEventListener('storage', onStorage);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener(GAME_SCORES_UPDATED_EVENT, onCustomUpdate);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  
  const selectGame = (game: GameType) => {
    setCurrentGame(game);
  };
  
  const goBack = () => {
    setCurrentGame('select');
    setScores(getScores());
  };
  
  const resetScores = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('game_scores');
    setScores(getScores());
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
        <motion.div
          key="select"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col items-center justify-start min-h-screen px-4 py-12"
        >
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
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
          </motion.div>
          
          {/* 分数榜 */}
          <motion.div
            className={`w-full max-w-6xl mb-10 rounded-2xl border-2 backdrop-blur-xl overflow-hidden ${
              isDark 
                ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700' 
                : 'bg-gradient-to-br from-white/90 to-gray-50/90 border-gray-200'
          } shadow-xl`}>
            <div className={`flex items-center justify-between px-4 sm:px-6 py-3 border-b ${
              isDark ? 'border-white/10' : 'border-gray-200'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <h2 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  游戏分数榜
                </h2>
              </div>
              <button
                onClick={resetScores}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                  isDark 
                    ? 'bg-slate-700 hover:bg-slate-600 text-gray-300' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
                title="清空所有分数"
              >
                清空记录
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200/30">
              {/* 回旋镖小鸟 */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🐦</span>
                  <h3 className={`font-bold text-sm sm:text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    回旋镖小鸟
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-lg p-2.5 ${isDark ? 'bg-yellow-500/15' : 'bg-yellow-50'}`}>
                    <div className={`text-[10px] sm:text-xs ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>最高关卡</div>
                    <div className={`text-lg sm:text-xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {scores.boomerang.bestLevel}<span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}> / 10</span>
                    </div>
                  </div>
                  <div className={`rounded-lg p-2.5 ${isDark ? 'bg-red-500/15' : 'bg-red-50'}`}>
                    <div className={`text-[10px] sm:text-xs ${isDark ? 'text-red-300' : 'text-red-700'}`}>最高得分</div>
                    <div className={`text-lg sm:text-xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {scores.boomerang.totalScore}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 井字棋 */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">⭕</span>
                  <h3 className={`font-bold text-sm sm:text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    井字棋
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className={`rounded-lg p-2 ${isDark ? 'bg-green-500/15' : 'bg-green-50'}`}>
                    <div className={`text-[10px] ${isDark ? 'text-green-300' : 'text-green-700'}`}>胜</div>
                    <div className={`text-base sm:text-lg font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {scores.tictactoe.wins}
                    </div>
                  </div>
                  <div className={`rounded-lg p-2 ${isDark ? 'bg-gray-500/15' : 'bg-gray-100'}`}>
                    <div className={`text-[10px] ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>平</div>
                    <div className={`text-base sm:text-lg font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {scores.tictactoe.draws}
                    </div>
                  </div>
                  <div className={`rounded-lg p-2 ${isDark ? 'bg-red-500/15' : 'bg-red-50'}`}>
                    <div className={`text-[10px] ${isDark ? 'text-red-300' : 'text-red-700'}`}>负</div>
                    <div className={`text-base sm:text-lg font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {scores.tictactoe.losses}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 2048 */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🔢</span>
                  <h3 className={`font-bold text-sm sm:text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    2048
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-lg p-2.5 ${isDark ? 'bg-amber-500/15' : 'bg-amber-50'}`}>
                    <div className={`text-[10px] sm:text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>最高分</div>
                    <div className={`text-lg sm:text-xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {scores['2048'].best}
                    </div>
                  </div>
                  <div className={`rounded-lg p-2.5 ${isDark ? 'bg-orange-500/15' : 'bg-orange-50'}`}>
                    <div className={`text-[10px] sm:text-xs ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>游玩局数</div>
                    <div className={`text-lg sm:text-xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {scores['2048'].games}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl w-full pb-12"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
            }}
          >
            {/* 回旋镖小鸟 */}
            <motion.button
              onClick={() => selectGame('boomerang')}
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
              }}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.97 }}
              className={`group relative p-8 sm:p-10 md:p-12 rounded-3xl border-2 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/25 overflow-hidden ${
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
            </motion.button>
            
            {/* 井字棋 */}
            <motion.button
              onClick={() => selectGame('tictactoe')}
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
              }}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.97 }}
              className={`group relative p-8 sm:p-10 md:p-12 rounded-3xl border-2 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/25 overflow-hidden ${
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
            </motion.button>
            
            {/* 2048 */}
            <motion.button
              onClick={() => selectGame('2048')}
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
              }}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.97 }}
              className={`group relative p-8 sm:p-10 md:p-12 rounded-3xl border-2 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/25 overflow-hidden ${
                isDark 
                  ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700 hover:border-amber-500' 
                  : 'bg-gradient-to-br from-white/90 to-gray-50/90 border-gray-200 hover:border-amber-400'
              } backdrop-blur-xl`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className={`w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto mb-6 rounded-3xl flex items-center justify-center group-hover:rotate-12 transition-all duration-500 shadow-xl ${
                  isDark 
                    ? 'bg-gradient-to-br from-amber-600 to-orange-600' 
                    : 'bg-gradient-to-br from-amber-500 to-orange-500'
                }`}>
                  <span className="text-4xl sm:text-5xl md:text-6xl drop-shadow-2xl">🔢</span>
                </div>
                <h3 className={`text-2xl sm:text-2xl md:text-3xl font-bold mb-3 ${
                  isDark ? 'text-white' : 'text-gray-800'
                }`}>
                  2048
                </h3>
                <p className={`text-base sm:text-lg mb-6 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  合并数字，挑战最高分！
                </p>
                <div className="flex justify-center gap-3 flex-wrap">
                  <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-sm font-semibold ${
                    isDark 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    数字益智
                  </span>
                  <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-sm font-semibold ${
                    isDark 
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' 
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    脑力挑战
                  </span>
                </div>
              </div>
            </motion.button>
          </motion.div>
        </motion.div>
      )}
      
      {/* 游戏界面 */}
      {currentGame !== 'select' && (
        <motion.div
          key={currentGame}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-20 flex items-center justify-center min-h-screen p-4"
        >
          {/* 游戏内容 */}
          <motion.div
            className="relative max-w-5xl w-full"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* 霓虹边框 */}
            <div className={`absolute -inset-1 bg-gradient-to-r ${
              currentGame === 'boomerang' 
                ? 'from-red-500 via-yellow-500 to-red-500' 
                : currentGame === '2048'
                ? 'from-amber-500 via-orange-500 to-amber-500'
                : 'from-blue-500 via-purple-500 to-pink-500'
            } rounded-3xl blur opacity-50 transition-opacity duration-1000`} />
            
            <div className={`relative bg-gradient-to-br rounded-3xl border-2 shadow-2xl overflow-hidden ${
              isDark 
                ? 'from-slate-900 via-slate-800 to-slate-900 border-slate-600' 
                : 'from-white via-gray-50 to-white border-gray-200'
            }`}>
              {/* 顶部工具栏：返回按钮 + 当前分数榜 */}
              <div className={`flex items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b ${
                isDark ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-50/80'
              }`}>
                {/* 返回按钮 */}
                <motion.button
                  onClick={goBack}
                  whileHover={{ scale: 1.05, x: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${
                    isDark 
                      ? 'bg-slate-700/70 hover:bg-slate-600 text-white' 
                      : 'bg-white hover:bg-gray-100 text-gray-800'
                  } shadow-md`}
                  aria-label="返回游戏列表"
                >
                  <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-xs sm:text-sm font-semibold">返回</span>
                </motion.button>
                
                {/* 当前游戏的实时得分摘要 */}
                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs overflow-x-auto">
                  {currentGame === 'boomerang' && (() => {
                    const s = scores.boomerang;
                    return (
                      <>
                        <span className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap ${isDark ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-100 text-yellow-700'}`}>
                          最高关卡 {s.bestLevel}
                        </span>
                        <span className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap ${isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'}`}>
                          最高分 {s.totalScore}
                        </span>
                      </>
                    );
                  })()}
                  {currentGame === 'tictactoe' && (() => {
                    const s = scores.tictactoe;
                    return (
                      <>
                        <span className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap ${isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'}`}>
                          胜 {s.wins}
                        </span>
                        <span className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap ${isDark ? 'bg-gray-500/20 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                          平 {s.draws}
                        </span>
                        <span className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap ${isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'}`}>
                          负 {s.losses}
                        </span>
                      </>
                    );
                  })()}
                  {currentGame === '2048' && (() => {
                    const s = scores['2048'];
                    return (
                      <>
                        <span className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap ${isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
                          最高分 {s.best}
                        </span>
                        <span className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap ${isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>
                          局数 {s.games}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
              
              <motion.div
                className="p-3 sm:p-5"
                key={currentGame}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                {currentGame === 'boomerang' ? <BoomerangGame /> : currentGame === '2048' ? <Game2048 /> : <TicTacToe />}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
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
