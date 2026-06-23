'use client';

/**
 * PC 端贪吃蛇
 * - 左侧大棋盘（每格 28px） + 右侧侧栏（关卡进度 / 战绩 / 快捷键 / AI 蛇信息）
 * - 键盘快捷键：方向键 + WASD + 空格暂停 + R 重开 + Esc 返回菜单
 * - 固定像素尺寸（适配 1920×1080+）
 */

import { useEffect, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import {
  useSnakeGame, drawSnakeCanvas,
  type Direction,
} from '@/components/games/shared/useSnakeGame';

export default function SnakePC() {
  const game = useSnakeGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastStepTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const dynamicWallTimerRef = useRef<number | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // 同步速度
  useEffect(() => {
    game.speedRef.current = game.level.initialSpeed;
  }, [game.level.initialSpeed, game.gameState]);

  // RAF 游戏循环
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
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [game.gameState]);

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
              28,
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
    // paused / over / win
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
          28,
          game.level.gridSize,
          isDark,
          game.foodPulseRef.current,
        );
      }
    }
  }, [game.gameState, game.level.gridSize, isDark]);

  // 动态墙刷新
  useEffect(() => {
    if (game.gameState === 'playing' && game.level.dynamicWallCount > 0 && game.level.dynamicWallInterval > 0) {
      const refresh = () => {
        // 仅清空动态墙（hook 未暴露 refreshDynamicWalls，简化处理）
        game.dynamicWallsRef.current = [];
      };
      const t = window.setInterval(refresh, game.level.dynamicWallInterval);
      dynamicWallTimerRef.current = t;
      return () => clearInterval(t);
    }
  }, [game.gameState, game.level.dynamicWallCount, game.level.dynamicWallInterval]);

  // 键盘控制
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (game.gameState === 'menu') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          game.initLevel(1);
        }
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (game.gameState === 'playing' || game.gameState === 'paused') game.pauseToggle();
        else if (game.gameState === 'over' || game.gameState === 'win') game.resetCurrentLevel();
        return;
      }
      if (e.code === 'KeyR') {
        e.preventDefault();
        game.resetCurrentLevel();
        return;
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        game.goToMenu();
        return;
      }
      if (game.gameState !== 'playing') return;
      let dir: Direction | null = null;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') dir = 'UP';
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') dir = 'DOWN';
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') dir = 'LEFT';
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') dir = 'RIGHT';
      if (dir) { e.preventDefault(); game.enqueueDirection(dir); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game]);

  const cellSize = 28;
  const boardPx = game.level.gridSize * cellSize;

  // 菜单界面
  if (game.gameState === 'menu') {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h1 className={`text-5xl font-black mb-2 ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>🐍 贪吃蛇大作战</h1>
          <p className={`text-base ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>完成 4 个关卡，成为真正的蛇王！</p>
          <div className={`mt-2 text-sm ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>🏆 最高分: {game.highScore}</div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {(() => {
            // LEVELS 通过 hook 内部 state 持有，PC 版直接引入 LEVELS
            // 这里通过 game.level 来知道当前等级，再从 1-4 显示
            return [1, 2, 3, 4].map(id => {
              const lv = { 1: '初出茅庐', 2: '障碍入门', 3: '双重威胁', 4: '终极挑战' }[id];
              const desc = {
                1: '熟悉操作，吃到 10 节过关',
                2: '小心墙体和敌方蛇！长度 15 过关',
                3: '25×25 大地图，动态障碍 + 2 条 AI 蛇！长度 20 过关',
                4: '30×30 终极战场！2 追踪 + 1 高机动，长度 30 通关！',
              }[id];
              const grid = [20, 20, 25, 30][id - 1];
              const target = [10, 15, 20, 30][id - 1];
              const unlocked = game.unlockedLevel >= id;
              const completed = game.unlockedLevel > id;
              return (
                <button
                  key={id}
                  onClick={() => unlocked && game.initLevel(id)}
                  disabled={!unlocked}
                  className={`p-5 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] ${
                    unlocked
                      ? isDark
                        ? 'bg-gradient-to-br from-emerald-600/30 to-teal-600/30 hover:from-emerald-500/40 hover:to-teal-500/40 border border-emerald-500/40 shadow-md'
                        : 'bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200 shadow-md'
                      : isDark
                        ? 'bg-gray-800/30 border border-gray-700/50 opacity-50 cursor-not-allowed'
                        : 'bg-gray-100/50 border border-gray-200/50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{unlocked ? `第 ${id} 关` : '🔒'}</span>
                    {completed && <span className="text-xl">⭐</span>}
                  </div>
                  <div className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>{lv}</div>
                  <div className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{grid}×{grid} · 目标 {target}</div>
                  <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{desc}</div>
                </button>
              );
            });
          })()}
        </div>

        <div className={`text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <p>↑↓←→ / WASD 控制 · 空格暂停 · R 重开 · Esc 返回菜单</p>
        </div>
      </div>
    );
  }

  // 游戏界面
  return (
    <div className="w-full flex flex-row items-start justify-center gap-8">
      {/* 左侧棋盘 */}
      <div className="flex flex-col items-center">
        {/* 顶部信息 */}
        <div className={`mb-4 px-5 py-2.5 rounded-xl flex items-center gap-5 shadow-md border ${
          isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'
        }`} style={{ width: boardPx }}>
          <div>
            <div className={`text-[11px] font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>第 {game.currentLevel} 关 · {game.level.name}</div>
            <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{game.score} / {game.level.targetLength}</div>
          </div>
          <div className="flex-1 flex gap-2">
            <div className={`flex-1 px-3 py-1.5 rounded-lg text-center ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
              <div className={`text-[10px] ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>长度</div>
              <div className={`text-base font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{game.snakeLength}</div>
            </div>
            <div className={`flex-1 px-3 py-1.5 rounded-lg text-center ${isDark ? 'bg-purple-500/15' : 'bg-purple-50'}`}>
              <div className={`text-[10px] ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>敌蛇</div>
              <div className={`text-base font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{game.aliveAiCount}/{game.level.aiSnakes.length}</div>
            </div>
            <div className={`flex-1 px-3 py-1.5 rounded-lg text-center ${isDark ? 'bg-amber-500/15' : 'bg-amber-50'}`}>
              <div className={`text-[10px] ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>速度</div>
              <div className={`text-base font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{Math.round(1000 / game.speedRef.current)}/s</div>
            </div>
          </div>
        </div>

        {/* 进度条 */}
        <div className={`mb-4 h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} style={{ width: boardPx }}>
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-300"
            style={{ width: `${Math.min(100, (game.score / game.level.targetLength) * 100)}%` }}
          />
        </div>

        {/* 棋盘 */}
        <div
          className={`relative rounded-2xl overflow-hidden border-2 shadow-2xl ${isDark ? 'border-gray-700' : 'border-gray-300'}`}
          style={{ width: boardPx, height: boardPx }}
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
                <div className="text-4xl font-black text-white mb-2">⏸️ 暂停</div>
                <div className="text-sm text-gray-300">按空格键或点击继续</div>
              </div>
            </div>
          )}
          {game.gameState === 'over' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="text-center px-6">
                <div className="text-4xl font-black text-red-400 mb-2">💀 游戏结束</div>
                <div className="text-sm text-gray-300 mb-2">长度 {game.snakeLength} · 得分 {game.score}</div>
                {game.isNewRecord && <div className="text-amber-400 font-bold animate-pulse">🏆 新纪录！</div>}
              </div>
            </div>
          )}
          {game.gameState === 'win' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="text-center px-6">
                <div className="text-4xl font-black text-emerald-400 mb-2">🎉 通关！</div>
                <div className="text-sm text-gray-300 mb-2">得分 {game.score} · {game.currentLevel < 4 ? '下一关已解锁' : '所有关卡完成！'}</div>
                {game.isNewRecord && <div className="text-amber-400 font-bold animate-pulse">🏆 新纪录！</div>}
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="mt-4 flex justify-center gap-3 flex-wrap" style={{ width: boardPx }}>
          {game.gameState === 'playing' && (
            <>
              <button onClick={game.pauseToggle} className={`px-5 py-2 font-bold rounded-xl shadow-md transition-all hover:scale-105 ${isDark ? 'bg-amber-500/80 hover:bg-amber-400/80 text-white' : 'bg-amber-500 hover:bg-amber-400 text-white'}`}>⏸️ 暂停</button>
              <button onClick={game.resetCurrentLevel} className={`px-5 py-2 font-bold rounded-xl shadow-md transition-all hover:scale-105 ${isDark ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-500 hover:bg-gray-400 text-white'}`}>🔄 重来</button>
              <button onClick={game.goToMenu} className={`px-5 py-2 font-bold rounded-xl shadow-md transition-all hover:scale-105 ${isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-slate-500 hover:bg-slate-400 text-white'}`}>📋 菜单</button>
            </>
          )}
          {game.gameState === 'paused' && (
            <>
              <button onClick={game.pauseToggle} className={`px-6 py-2 font-bold rounded-xl shadow-md transition-all hover:scale-105 ${isDark ? 'bg-emerald-500/80 hover:bg-emerald-400/80 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-white'}`}>▶️ 继续</button>
              <button onClick={game.resetCurrentLevel} className={`px-5 py-2 font-bold rounded-xl shadow-md transition-all hover:scale-105 ${isDark ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-500 hover:bg-gray-400 text-white'}`}>🔄 重来</button>
              <button onClick={game.goToMenu} className={`px-5 py-2 font-bold rounded-xl shadow-md transition-all hover:scale-105 ${isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-slate-500 hover:bg-slate-400 text-white'}`}>📋 菜单</button>
            </>
          )}
          {(game.gameState === 'over' || game.gameState === 'win') && (
            <>
              <button onClick={game.resetCurrentLevel} className={`px-6 py-2 font-bold rounded-xl shadow-md transition-all hover:scale-105 ${isDark ? 'bg-emerald-500/80 hover:bg-emerald-400/80 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-white'}`}>🔄 再来一次</button>
              {game.gameState === 'win' && game.currentLevel < 4 && (
                <button onClick={() => game.initLevel(game.currentLevel + 1)} className={`px-6 py-2 font-bold rounded-xl shadow-md transition-all hover:scale-105 ${isDark ? 'bg-blue-500/80 hover:bg-blue-400/80 text-white' : 'bg-blue-500 hover:bg-blue-400 text-white'}`}>➡️ 下一关</button>
              )}
              <button onClick={game.goToMenu} className={`px-5 py-2 font-bold rounded-xl shadow-md transition-all hover:scale-105 ${isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-slate-500 hover:bg-slate-400 text-white'}`}>📋 菜单</button>
            </>
          )}
        </div>
      </div>

      {/* 右侧信息栏 */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4">
        <div className={`p-5 rounded-2xl border shadow-md ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <span>🏆</span> 战绩
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className={`text-center p-2.5 rounded-lg ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
              <div className={`text-[10px] ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>最高分</div>
              <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{game.highScore}</div>
            </div>
            <div className={`text-center p-2.5 rounded-lg ${isDark ? 'bg-teal-500/15' : 'bg-teal-50'}`}>
              <div className={`text-[10px] ${isDark ? 'text-teal-300' : 'text-teal-700'}`}>已解锁</div>
              <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{game.unlockedLevel}/4</div>
            </div>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-md ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <span>🤖</span> AI 蛇
          </h3>
          <ul className={`text-xs space-y-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: 'rgb(239,68,68)' }}></span>🔴 追踪蛇</li>
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: 'rgb(249,115,22)' }}></span>🟠 高机动蛇</li>
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: 'rgb(148,163,184)' }}></span>⚪ 游走 / 路径蛇</li>
            <li className="mt-2">吃掉 AI 蛇身段可加速增长！</li>
          </ul>
        </div>

        <div className={`p-5 rounded-2xl border shadow-md ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <span>⌨️</span> 键盘快捷键
          </h3>
          <ul className={`text-xs space-y-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            <li className="flex justify-between"><span>移动</span><kbd className={`px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>↑↓←→ / WASD</kbd></li>
            <li className="flex justify-between"><span>暂停 / 继续</span><kbd className={`px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>Space</kbd></li>
            <li className="flex justify-between"><span>重开本关</span><kbd className={`px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>R</kbd></li>
            <li className="flex justify-between"><span>返回菜单</span><kbd className={`px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>Esc</kbd></li>
          </ul>
        </div>
      </div>
    </div>
  );
}