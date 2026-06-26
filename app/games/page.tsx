'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/components/ThemeProvider';
import { GAME_SCORES_UPDATED_EVENT, getScores, type GameScores } from '@/lib/gameScores';
import BoomerangGame from '@/components/games/BoomerangGame';
import TicTacToe from '@/components/games/TicTacToe';
import Game2048 from '@/components/games/Game2048';
import Snake from '@/components/games/Snake';
import FruitNinja from '@/components/games/FruitNinja';

// PC 端独立布局版本
import TicTacToePC from '@/components/games/pc/TicTacToePC';
import Game2048PC from '@/components/games/pc/Game2048PC';
import SnakePC from '@/components/games/pc/SnakePC';
// FruitNinja / BoomerangGame 的 PC 版本直接复用原组件（已针对大屏优化）

// 移动端独立布局版本
import TicTacToeMobile from '@/components/games/mobile/TicTacToeMobile';
import Game2048Mobile from '@/components/games/mobile/Game2048Mobile';
import SnakeMobile from '@/components/games/mobile/SnakeMobile';
import FruitNinjaMobile from '@/components/games/mobile/FruitNinjaMobile';
import BoomerangGameMobile from '@/components/games/mobile/BoomerangGameMobile';

type GameType = 'select' | 'boomerang' | 'tictactoe' | '2048' | 'snake' | 'fruitninja';

/**
 * UA 检测：是否为移动端
 * - 客户端：navigator.userAgent + navigator.maxTouchPoints
 * - SSR：默认 false（避免水合不匹配），挂载后再校正
 */
// 预定义的随机粒子数据，确保客户端和服务端一致
function detectMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const mql = window.matchMedia('(max-width: 768px)');
  return mql.matches;
}
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

const MOSQUITO_DATA = [
  { id: 1, left: 6, top: 14, driftX: [0, 18, -8, 14, 0], driftY: [0, -12, 8, -10, 0], duration: 7.5, delay: 0.2, scale: 0.95 },
  { id: 2, left: 16, top: 76, driftX: [0, 20, -12, 8, 0], driftY: [0, -18, -4, 10, 0], duration: 8.3, delay: 1.1, scale: 1.05 },
  { id: 3, left: 84, top: 18, driftX: [0, -18, 10, -8, 0], driftY: [0, 12, -8, 10, 0], duration: 7.8, delay: 0.7, scale: 0.9 },
  { id: 4, left: 92, top: 72, driftX: [0, -16, 12, -10, 0], driftY: [0, -14, 6, -8, 0], duration: 9.2, delay: 1.8, scale: 1.1 },
  { id: 5, left: 10, top: 44, driftX: [0, 14, -10, 18, 0], driftY: [0, -10, 12, -6, 0], duration: 6.9, delay: 0.5, scale: 0.88 },
  { id: 6, left: 89, top: 44, driftX: [0, -14, 8, -16, 0], driftY: [0, 10, -12, 6, 0], duration: 8.7, delay: 1.4, scale: 1.02 },
  { id: 7, left: 24, top: 10, driftX: [0, 10, -14, 12, 0], driftY: [0, 8, -10, 12, 0], duration: 7.1, delay: 2.1, scale: 0.92 },
  { id: 8, left: 76, top: 86, driftX: [0, -12, 14, -10, 0], driftY: [0, -8, 10, -12, 0], duration: 8.9, delay: 2.6, scale: 1.08 },
];

export default function GamesPage() {
  const [currentGame, setCurrentGame] = useState<GameType>('select');
  const [mounted, setMounted] = useState(false);
  const [scores, setScores] = useState<GameScores>(getScores());
  const [squashedMosquitoes, setSquashedMosquitoes] = useState<number[]>([]);
  // 默认与 SSR 一致为 false；mount 后再读实际窗口尺寸
  const [isMobile, setIsMobile] = useState(false);
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  useEffect(() => {
    setMounted(true);
    setIsMobile(detectMobile());
    const onResize = () => setIsMobile(detectMobile());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
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
    setSquashedMosquitoes([]);
  };
  
  const resetScores = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('game_scores');
    setScores(getScores());
  };

  useEffect(() => {
    if (currentGame !== 'select') {
      setSquashedMosquitoes([]);
    }
  }, [currentGame]);

  const squashMosquito = (id: number) => {
    setSquashedMosquitoes(prev => (prev.includes(id) ? prev : [...prev, id]));
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
              <button type="button"
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
            
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-gray-200/30">
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
              
              {/* 贪吃蛇 */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🐍</span>
                  <h3 className={`font-bold text-sm sm:text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    贪吃蛇
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-lg p-2.5 ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
                    <div className={`text-[10px] sm:text-xs ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>最高分</div>
                    <div className={`text-lg sm:text-xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {scores.snake.highScore}
                    </div>
                  </div>
                  <div className={`rounded-lg p-2.5 ${isDark ? 'bg-teal-500/15' : 'bg-teal-50'}`}>
                    <div className={`text-[10px] sm:text-xs ${isDark ? 'text-teal-300' : 'text-teal-700'}`}>游戏局数</div>
                    <div className={`text-lg sm:text-xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {scores.snake.totalGames}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 水果忍者 */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🔪</span>
                  <h3 className={`font-bold text-sm sm:text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    水果忍者
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-lg p-2.5 ${isDark ? 'bg-rose-500/15' : 'bg-rose-50'}`}>
                    <div className={`text-[10px] sm:text-xs ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>最高分</div>
                    <div className={`text-lg sm:text-xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {scores.fruitninja.highScore}
                    </div>
                  </div>
                  <div className={`rounded-lg p-2.5 ${isDark ? 'bg-orange-500/15' : 'bg-orange-50'}`}>
                    <div className={`text-[10px] sm:text-xs ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>最高关卡</div>
                    <div className={`text-lg sm:text-xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {scores.fruitninja.bestLevel}<span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}> / 4</span>
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
            
            {/* 贪吃蛇 */}
            <motion.button
              onClick={() => selectGame('snake')}
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
              }}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.97 }}
              className={`group relative p-8 sm:p-10 md:p-12 rounded-3xl border-2 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/25 overflow-hidden ${
                isDark 
                  ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700 hover:border-emerald-500' 
                  : 'bg-gradient-to-br from-white/90 to-gray-50/90 border-gray-200 hover:border-emerald-400'
              } backdrop-blur-xl`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className={`w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto mb-6 rounded-3xl flex items-center justify-center group-hover:rotate-12 transition-all duration-500 shadow-xl ${
                  isDark 
                    ? 'bg-gradient-to-br from-emerald-600 to-teal-600' 
                    : 'bg-gradient-to-br from-emerald-500 to-teal-500'
                }`}>
                  <span className="text-4xl sm:text-5xl md:text-6xl drop-shadow-2xl">🐍</span>
                </div>
                <h3 className={`text-2xl sm:text-2xl md:text-3xl font-bold mb-3 ${
                  isDark ? 'text-white' : 'text-gray-800'
                }`}>
                  贪吃蛇
                </h3>
                <p className={`text-base sm:text-lg mb-6 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  控制小蛇吃食物，别撞墙！
                </p>
                <div className="flex justify-center gap-3 flex-wrap">
                  <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-sm font-semibold ${
                    isDark 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    键盘/触屏
                  </span>
                  <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-sm font-semibold ${
                    isDark 
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' 
                      : 'bg-teal-100 text-teal-700'
                  }`}>
                    速度递增
                  </span>
                </div>
              </div>
            </motion.button>
            
            {/* 水果忍者 */}
            <motion.button
              onClick={() => selectGame('fruitninja')}
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
              }}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.97 }}
              className={`group relative p-8 sm:p-10 md:p-12 rounded-3xl border-2 transition-all duration-500 hover:shadow-2xl hover:shadow-rose-500/25 overflow-hidden ${
                isDark 
                  ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700 hover:border-rose-500' 
                  : 'bg-gradient-to-br from-white/90 to-gray-50/90 border-gray-200 hover:border-rose-400'
              } backdrop-blur-xl`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br from-rose-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className={`w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto mb-6 rounded-3xl flex items-center justify-center group-hover:rotate-12 transition-all duration-500 shadow-xl ${
                  isDark 
                    ? 'bg-gradient-to-br from-rose-600 to-orange-600' 
                    : 'bg-gradient-to-br from-rose-500 to-orange-500'
                }`}>
                  <span className="text-4xl sm:text-5xl md:text-6xl drop-shadow-2xl">🔪</span>
                </div>
                <h3 className={`text-2xl sm:text-2xl md:text-3xl font-bold mb-3 ${
                  isDark ? 'text-white' : 'text-gray-800'
                }`}>
                  水果忍者
                </h3>
                <p className={`text-base sm:text-lg mb-6 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  挥刀切水果，连击躲炸弹！
                </p>
                <div className="flex justify-center gap-3 flex-wrap">
                  <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-sm font-semibold ${
                    isDark 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    鼠标/触屏
                  </span>
                  <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-sm font-semibold ${
                    isDark 
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' 
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    4 关挑战
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
          {/* 飞蚊子背景：只在游戏界面出现，点击可拍掉，不盖住中间游戏盒子 */}
          <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
            {MOSQUITO_DATA.map((mosquito) => {
              const squashed = squashedMosquitoes.includes(mosquito.id);
              return (
                <motion.button
                  key={`${currentGame}-${mosquito.id}`}
                  type="button"
                  aria-label="拍掉蚊子"
                  onClick={() => squashMosquito(mosquito.id)}
                  className="absolute pointer-events-auto select-none"
                  style={{ left: `${mosquito.left}%`, top: `${mosquito.top}%` }}
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={
                    squashed
                      ? { opacity: 0, scale: 0.2, rotate: 95, x: 0, y: 0 }
                      : {
                          opacity: [0.72, 0.95, 0.8, 0.92],
                          x: mosquito.driftX,
                          y: mosquito.driftY,
                          rotate: [-14, 10, -8, 16, -14],
                          scale: [mosquito.scale, mosquito.scale * 1.08, mosquito.scale * 0.94, mosquito.scale],
                        }
                  }
                  transition={
                    squashed
                      ? { duration: 0.22, ease: 'easeOut' }
                      : { duration: mosquito.duration, ease: 'easeInOut', repeat: Infinity, delay: mosquito.delay }
                  }
                >
                  <span className="relative block w-8 h-8 sm:w-10 sm:h-10">
                    <span className="mosquito-wing mosquito-wing-left" />
                    <span className="mosquito-wing mosquito-wing-right" />
                    <span className="mosquito-body">
                      <span className="mosquito-eye mosquito-eye-left" />
                      <span className="mosquito-eye mosquito-eye-right" />
                    </span>
                    <span className="mosquito-tail" />
                    {squashed && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute -top-1 -right-2 text-[10px] sm:text-xs font-black ${
                          isDark ? 'text-red-300' : 'text-red-600'
                        }`}
                      >
                        啪
                      </motion.span>
                    )}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* 游戏内容 */}
          <motion.div
            className="relative z-20 max-w-5xl w-full"
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
                : currentGame === 'snake'
                ? 'from-emerald-500 via-teal-500 to-cyan-500'
                : currentGame === 'fruitninja'
                ? 'from-rose-500 via-orange-500 to-rose-500'
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
                  {currentGame === 'snake' && (() => {
                    const s = scores.snake;
                    return (
                      <>
                        <span className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap ${isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                          最高分 {s.highScore}
                        </span>
                        <span className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap ${isDark ? 'bg-teal-500/20 text-teal-300' : 'bg-teal-100 text-teal-700'}`}>
                          局数 {s.totalGames}
                        </span>
                      </>
                    );
                  })()}
                  {currentGame === 'fruitninja' && (() => {
                    const s = scores.fruitninja;
                    return (
                      <>
                        <span className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap ${isDark ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-100 text-rose-700'}`}>
                          最高分 {s.highScore}
                        </span>
                        <span className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap ${isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>
                          关卡 {s.bestLevel}/4
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
              
              <motion.div
                className="p-2 sm:p-5 touch-manipulation"
                key={currentGame}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                {currentGame === 'boomerang' 
                  ? (isMobile ? <BoomerangGameMobile /> : <BoomerangGame />) 
                  : currentGame === '2048' 
                  ? (isMobile ? <Game2048Mobile /> : <Game2048PC />)
                  : currentGame === 'snake'
                  ? (isMobile ? <SnakeMobile /> : <SnakePC />)
                  : currentGame === 'fruitninja'
                  ? (isMobile ? <FruitNinjaMobile /> : <FruitNinja />)
                  : (isMobile ? <TicTacToeMobile /> : <TicTacToePC />)}
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
        @keyframes mosquito-flutter-left {
          0%, 100% { transform: rotate(-24deg) scaleY(1); opacity: 0.72; }
          50% { transform: rotate(12deg) scaleY(0.72); opacity: 1; }
        }
        @keyframes mosquito-flutter-right {
          0%, 100% { transform: rotate(24deg) scaleY(1); opacity: 0.72; }
          50% { transform: rotate(-12deg) scaleY(0.72); opacity: 1; }
        }
        .animate-float { animation: float ease-in-out infinite; }
        .animate-text-shimmer { 
          background-size: 200% 200%; 
          animation: text-shimmer 3s ease-in-out infinite; 
        }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        .mosquito-wing {
          position: absolute;
          top: 8px;
          width: 13px;
          height: 8px;
          border-radius: 999px;
          background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.95), rgba(209,213,219,0.65) 60%, rgba(156,163,175,0.12) 100%);
          box-shadow: 0 0 10px rgba(255,255,255,0.2);
          transform-origin: center bottom;
          backdrop-filter: blur(2px);
        }
        .mosquito-wing-left {
          left: 5px;
          animation: mosquito-flutter-left 0.08s linear infinite;
        }
        .mosquito-wing-right {
          right: 5px;
          animation: mosquito-flutter-right 0.08s linear infinite;
        }
        .mosquito-body {
          position: absolute;
          left: 50%;
          top: 9px;
          width: 8px;
          height: 16px;
          transform: translateX(-50%);
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(31,41,55,0.98), rgba(17,24,39,0.98));
          box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 6px 16px rgba(0,0,0,0.28);
        }
        .mosquito-eye {
          position: absolute;
          top: 3px;
          width: 2px;
          height: 2px;
          border-radius: 999px;
          background: #ef4444;
          box-shadow: 0 0 6px rgba(239,68,68,0.85);
        }
        .mosquito-eye-left { left: 1px; }
        .mosquito-eye-right { right: 1px; }
        .mosquito-tail {
          position: absolute;
          left: calc(50% + 3px);
          top: 20px;
          width: 12px;
          height: 1.5px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(31,41,55,0.95), rgba(31,41,55,0.1));
          transform: rotate(36deg);
          transform-origin: left center;
        }
      `}</style>
    </div>
  );
}
