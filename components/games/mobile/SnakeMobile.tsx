'use client';

/**
 * Mobile 端贪吃蛇
 * - 自适应宽度棋盘
 * - 顶部分数 / 关卡置顶
 * - 底部大号虚拟方向键（拇指可达，44px+ 热区）
 * - 滑屏手势（↑↓←→ 自动入队方向）
 * - 紧凑按钮
 */

import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import {
  useSnakeGame, drawSnakeCanvas,
  type Direction,
} from '@/components/games/shared/useSnakeGame';

export default function SnakeMobile() {
  const game = useSnakeGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastStepTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const dynamicWallTimerRef = useRef<number | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // 同步速度
  useEffect(() => {
    game.speedRef.current = game.level.initialSpeed;
  }, [game.level.initialSpeed, game.gameState]);

  // RAF
  useEffect(() => {
    if (game.gameState !== 'playing') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const loop = (ts: number) => {
      if (!lastStepTimeRef.current) lastStepTimeRef.current = ts;
      const elapsed = ts - lastStepTimeRef.current;
      if (elapsed >= game.speedRef.current) {
        lastStepTimeRef.current = ts;
        game.step();
      }
      game.foodPulseRef.current = ts;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [game.gameState]);

  // 自适应单元格
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 375);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const containerSize = Math.min(vw - 24, 360);
  const cellSize = Math.max(12, Math.floor(containerSize / game.level.gridSize));
  const boardPx = game.level.gridSize * cellSize;

  // 渲染循环
  useEffect(() => {
    if (game.gameState === 'menu') return;
    if (game.gameState === 'playing') {
      let raf: number;
      const render = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            drawSnakeCanvas(
              ctx,
              game.playerSnakeRef.current,
              game.aiSnakesRef.current,
              game.wallsRef.current,
              game.dynamicWallsRef.current,
              game.foodRef.current,
              cellSize,
              game.level.gridSize,
              isDark,
              game.foodPulseRef.current,
            );
          }
        }
        raf = requestAnimationFrame(render);
      };
      raf = requestAnimationFrame(render);
      return () => cancelAnimationFrame(raf);
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawSnakeCanvas(
          ctx,
          game.playerSnakeRef.current,
          game.aiSnakesRef.current,
          game.wallsRef.current,
          game.dynamicWallsRef.current,
          game.foodRef.current,
          cellSize,
          game.level.gridSize,
          isDark,
          game.foodPulseRef.current,
        );
      }
    }
  }, [game.gameState, game.level.gridSize, isDark, cellSize]);

  // 动态墙刷新
  useEffect(() => {
    if (game.gameState === 'playing' && game.level.dynamicWallCount > 0 && game.level.dynamicWallInterval > 0) {
      const t = window.setInterval(() => {
        game.dynamicWallsRef.current = [];
      }, game.level.dynamicWallInterval);
      dynamicWallTimerRef.current = t;
      return () => clearInterval(t);
    }
  }, [game.gameState, game.level.dynamicWallCount, game.level.dynamicWallInterval]);

  // 滑屏手势
  const onTouchStart = (e: React.TouchEvent) => {
    if (game.gameState !== 'playing') return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (game.gameState !== 'playing') return;
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    let dir: Direction;
    if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'RIGHT' : 'LEFT';
    else dir = dy > 0 ? 'DOWN' : 'UP';
    game.enqueueDirection(dir);
  };

  // 菜单界面
  if (game.gameState === 'menu') {
    return (
      <div
        className="w-full flex flex-col items-stretch px-2"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
      >
        <div className="text-center mb-5">
          <h1 className={`text-3xl font-black mb-1 ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>🐍 贪吃蛇</h1>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>4 个关卡，等你来战！</p>
          <div className={`mt-1 text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>🏆 最高分 {game.highScore}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(id => {
            const lv = { 1: '初出茅庐', 2: '障碍入门', 3: '双重威胁', 4: '终极挑战' }[id];
            const desc = { 1: '熟悉操作', 2: '墙体+敌方蛇', 3: '大地图+2 AI', 4: '终极 30×30' }[id];
            const grid = [20, 20, 25, 30][id - 1];
            const target = [10, 15, 20, 30][id - 1];
            const unlocked = game.unlockedLevel >= id;
            const completed = game.unlockedLevel > id;
            return (
              <button
                key={id}
                onClick={() => unlocked && game.initLevel(id)}
                disabled={!unlocked}
                className={`min-h-[88px] p-3 rounded-xl text-left transition-all active:scale-95 ${
                  unlocked
                    ? isDark
                      ? 'bg-gradient-to-br from-emerald-600/30 to-teal-600/30 border border-emerald-500/40 shadow-md'
                      : 'bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 shadow-md'
                    : isDark
                      ? 'bg-gray-800/30 border border-gray-700/50 opacity-50'
                      : 'bg-gray-100/50 border border-gray-200/50 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{unlocked ? `第 ${id} 关` : '🔒'}</span>
                  {completed && <span>⭐</span>}
                </div>
                <div className={`text-sm font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>{lv}</div>
                <div className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{grid}×{grid} · 目标 {target}</div>
                <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{desc}</div>
              </button>
            );
          })}
        </div>

        <p className={`mt-4 text-center text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          滑屏或使用方向键控制 · 空格暂停 · R 重开
        </p>
      </div>
    );
  }

  // 游戏界面
  return (
    <div
      className="w-full flex flex-col items-stretch px-2"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
    >
      {/* 顶部核心信息（置顶） */}
      <div className={`mb-2 px-3 py-2 rounded-2xl shadow-md border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[11px] font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            第 {game.currentLevel} 关 · {game.level.name}
          </span>
          <span className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            🏆 {game.highScore}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {game.score} / {game.level.targetLength}
            </div>
          </div>
          <div className={`px-2 py-0.5 rounded-md text-[10px] ${isDark ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
            长度 {game.snakeLength}
          </div>
          <div className={`px-2 py-0.5 rounded-md text-[10px] ${isDark ? 'bg-purple-500/15 text-purple-300' : 'bg-purple-50 text-purple-700'}`}>
            敌蛇 {game.aliveAiCount}/{game.level.aiSnakes.length}
          </div>
        </div>
        {/* 进度条 */}
        <div className={`mt-1.5 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-300"
            style={{ width: `${Math.min(100, (game.score / game.level.targetLength) * 100)}%` }}
          />
        </div>
      </div>

      {/* 棋盘（核心内容） */}
      <div
        className={`relative mx-auto rounded-2xl overflow-hidden border-2 shadow-lg touch-none ${isDark ? 'border-gray-700' : 'border-gray-300'}`}
        style={{ width: boardPx, height: boardPx }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <canvas
          ref={canvasRef}
          width={boardPx}
          height={boardPx}
          style={{ display: 'block', width: boardPx, height: boardPx }}
        />

        {game.gameState === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-3xl font-black text-white mb-1">⏸️ 暂停</div>
              <div className="text-xs text-gray-300">点击继续按钮恢复</div>
            </div>
          </div>
        )}
        {game.gameState === 'over' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center px-3">
              <div className="text-3xl font-black text-red-400 mb-1">💀 失败</div>
              <div className="text-xs text-gray-300 mb-1">长度 {game.snakeLength} · 得分 {game.score}</div>
              {game.isNewRecord && <div className="text-amber-400 font-bold animate-pulse text-xs">🏆 新纪录！</div>}
            </div>
          </div>
        )}
        {game.gameState === 'win' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center px-3">
              <div className="text-3xl font-black text-emerald-400 mb-1">🎉 通关</div>
              <div className="text-xs text-gray-300 mb-1">得分 {game.score}</div>
              {game.isNewRecord && <div className="text-amber-400 font-bold animate-pulse text-xs">🏆 新纪录！</div>}
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮（拇指可达） */}
      <div className="mt-3 grid grid-cols-3 gap-2 max-w-[360px] mx-auto w-full">
        {game.gameState === 'playing' && (
          <>
            <button onClick={game.pauseToggle} className={`min-h-[44px] py-2.5 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-amber-500/80 text-white' : 'bg-amber-500 text-white'}`}>⏸ 暂停</button>
            <button onClick={game.resetCurrentLevel} className={`min-h-[44px] py-2.5 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-gray-600 text-white' : 'bg-gray-500 text-white'}`}>🔄 重来</button>
            <button onClick={game.goToMenu} className={`min-h-[44px] py-2.5 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-slate-600 text-white' : 'bg-slate-500 text-white'}`}>📋 菜单</button>
          </>
        )}
        {game.gameState === 'paused' && (
          <>
            <button onClick={game.pauseToggle} className={`min-h-[44px] py-2.5 text-sm font-bold rounded-xl active:scale-95 shadow-md col-span-1 ${isDark ? 'bg-emerald-500/80 text-white' : 'bg-emerald-500 text-white'}`}>▶️ 继续</button>
            <button onClick={game.resetCurrentLevel} className={`min-h-[44px] py-2.5 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-gray-600 text-white' : 'bg-gray-500 text-white'}`}>🔄</button>
            <button onClick={game.goToMenu} className={`min-h-[44px] py-2.5 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-slate-600 text-white' : 'bg-slate-500 text-white'}`}>📋</button>
          </>
        )}
        {(game.gameState === 'over' || game.gameState === 'win') && (
          <>
            <button onClick={game.resetCurrentLevel} className={`min-h-[44px] py-2.5 text-sm font-bold rounded-xl active:scale-95 shadow-md col-span-1 ${isDark ? 'bg-emerald-500/80 text-white' : 'bg-emerald-500 text-white'}`}>🔄 再来</button>
            {game.gameState === 'win' && game.currentLevel < 4 ? (
              <button onClick={() => game.initLevel(game.currentLevel + 1)} className={`min-h-[44px] py-2.5 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-blue-500/80 text-white' : 'bg-blue-500 text-white'}`}>➡️ 下一关</button>
            ) : (
              <div />
            )}
            <button onClick={game.goToMenu} className={`min-h-[44px] py-2.5 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-slate-600 text-white' : 'bg-slate-500 text-white'}`}>📋 菜单</button>
          </>
        )}
      </div>

      {/* 虚拟方向键（拇指可达区） */}
      <div className="mt-3 mx-auto w-full max-w-[200px]">
        <div className="grid grid-cols-3 gap-1.5">
          <div />
          <button
            onClick={() => game.enqueueDirection('UP')}
            className={`min-h-[52px] rounded-xl flex items-center justify-center text-2xl font-black active:scale-90 transition-transform ${isDark ? 'bg-gray-700/80 text-white shadow-md' : 'bg-gray-200 text-gray-700 shadow-md'}`}
            aria-label="向上"
          >↑</button>
          <div />
          <button
            onClick={() => game.enqueueDirection('LEFT')}
            className={`min-h-[52px] rounded-xl flex items-center justify-center text-2xl font-black active:scale-90 transition-transform ${isDark ? 'bg-gray-700/80 text-white shadow-md' : 'bg-gray-200 text-gray-700 shadow-md'}`}
            aria-label="向左"
          >←</button>
          <button
            onClick={() => game.enqueueDirection('DOWN')}
            className={`min-h-[52px] rounded-xl flex items-center justify-center text-2xl font-black active:scale-90 transition-transform ${isDark ? 'bg-gray-700/80 text-white shadow-md' : 'bg-gray-200 text-gray-700 shadow-md'}`}
            aria-label="向下"
          >↓</button>
          <button
            onClick={() => game.enqueueDirection('RIGHT')}
            className={`min-h-[52px] rounded-xl flex items-center justify-center text-2xl font-black active:scale-90 transition-transform ${isDark ? 'bg-gray-700/80 text-white shadow-md' : 'bg-gray-200 text-gray-700 shadow-md'}`}
            aria-label="向右"
          >→</button>
        </div>
      </div>

      <p className={`mt-2 text-center text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        滑屏或点击方向键 · 空格暂停 · R 重开
      </p>
    </div>
  );
}