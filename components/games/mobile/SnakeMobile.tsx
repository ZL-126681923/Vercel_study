'use client';

/**
 * Mobile 端贪吃蛇（横屏优化版）
 * - 横向全屏布局：左信息栏 + 中棋盘 + 右摇杆
 * - 自适应不同屏幕尺寸、分辨率、横竖屏切换
 * - 手机端专属虚拟摇杆控制系统（支持四方向精准触控）
 * - 滑屏手势作为辅助操作
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import {
  useSnakeGame, drawSnakeCanvas,
  type Direction,
} from '@/components/games/shared/useSnakeGame';

// 摇杆方向判定阈值（像素）
const JOYSTICK_DEAD_ZONE = 14;
const JOYSTICK_MAX_RADIUS = 48;

export default function SnakeMobile() {
  const game = useSnakeGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastStepTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const dynamicWallTimerRef = useRef<number | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // 视口尺寸 & 横竖屏
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 375,
    h: typeof window !== 'undefined' ? window.innerHeight : 667,
  }));

  useEffect(() => {
    const onResize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const isLandscape = viewport.w >= viewport.h;

  // ---- 自适应棋盘尺寸 ----
  // 横屏：高度是约束维度，留出信息栏 + 摇杆区 + 边距
  // 竖屏：宽度是约束维度，但提示用户横屏
  const { boardPx, cellSize } = (() => {
    const vw = viewport.w;
    const vh = viewport.h;
    if (isLandscape) {
      // 横屏布局：左信息(90) + 棋盘 + 右摇杆(150)，高度需扣除顶部信息+底部边距
      const reservedWidth = 90 + 150 + 24; // 左右栏 + 间距
      const reservedHeight = 48 + 16; // 顶部信息条 + 边距
      const maxByWidth = vw - reservedWidth;
      const maxByHeight = vh - reservedHeight;
      const target = Math.min(maxByWidth, maxByHeight, 420);
      const cs = Math.max(10, Math.floor(target / game.level.gridSize));
      return { boardPx: game.level.gridSize * cs, cellSize: cs };
    }
    // 竖屏：紧凑布局，棋盘居中，摇杆在下方
    const reservedWidth = 24;
    const reservedHeight = 44 + 140 + 16; // 信息条 + 摇杆 + 边距
    const maxByWidth = vw - reservedWidth;
    const maxByHeight = vh - reservedHeight;
    const target = Math.min(maxByWidth, maxByHeight, 340);
    const cs = Math.max(10, Math.floor(target / game.level.gridSize));
    return { boardPx: game.level.gridSize * cs, cellSize: cs };
  })();

  // ---- 摇杆状态 ----
  const joystickRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [joystickActive, setJoystickActive] = useState(false);
  const joystickTouchId = useRef<number | null>(null);
  const lastJoystickDir = useRef<Direction | null>(null);

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
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [game.gameState]);

  // 渲染循环
  useEffect(() => {
    if (game.gameState === 'menu') return;
    const drawCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
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
    };
    if (game.gameState === 'playing') {
      let raf: number;
      const render = () => {
        drawCanvas();
        raf = requestAnimationFrame(render);
      };
      raf = requestAnimationFrame(render);
      return () => cancelAnimationFrame(raf);
    }
    drawCanvas();
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

  // ---- 滑屏手势（棋盘上的辅助操作）----
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

  // ---- 虚拟摇杆控制 ----
  const handleJoystickMove = useCallback((dx: number, dy: number) => {
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < JOYSTICK_DEAD_ZONE) {
      setKnobPos({ x: 0, y: 0 });
      lastJoystickDir.current = null;
      return;
    }
    // 限制在最大半径内
    const clampedDist = Math.min(dist, JOYSTICK_MAX_RADIUS);
    const angle = Math.atan2(dy, dx);
    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;
    setKnobPos({ x: clampedX, y: clampedY });

    // 根据角度判定方向（四方向）
    const deg = (angle * 180) / Math.PI;
    let dir: Direction;
    // 角度区间：右 [-45, 45], 下 [45, 135], 左 [135,180]/[-180,-135], 上 [-135,-45]
    if (deg >= -45 && deg < 45) dir = 'RIGHT';
    else if (deg >= 45 && deg < 135) dir = 'DOWN';
    else if (deg >= -135 && deg < -45) dir = 'UP';
    else dir = 'LEFT';

    if (dir !== lastJoystickDir.current) {
      lastJoystickDir.current = dir;
      game.enqueueDirection(dir);
    }
  }, [game]);

  const onJoystickTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (joystickTouchId.current !== null) return;
    const t = e.changedTouches[0];
    joystickTouchId.current = t.identifier;
    setJoystickActive(true);
    const rect = joystickRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    handleJoystickMove(t.clientX - cx, t.clientY - cy);
  };

  const onJoystickTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = Array.from(e.touches).find(touch => touch.identifier === joystickTouchId.current);
    if (!t) return;
    const rect = joystickRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    handleJoystickMove(t.clientX - cx, t.clientY - cy);
  };

  const onJoystickTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = Array.from(e.changedTouches).find(touch => touch.identifier === joystickTouchId.current);
    if (!t) return;
    joystickTouchId.current = null;
    setJoystickActive(false);
    setKnobPos({ x: 0, y: 0 });
    lastJoystickDir.current = null;
  };

  // 菜单界面
  if (game.gameState === 'menu') {
    return (
      <div
        ref={containerRef}
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
              <button type="button"
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
          摇杆或滑屏控制方向 · 建议横屏体验更佳
        </p>
      </div>
    );
  }

  // ============ 游戏界面 ============
  // 横屏布局：左侧信息栏 + 中央棋盘 + 右侧摇杆
  // 竖屏布局：顶部信息栏 + 中央棋盘 + 底部摇杆
  if (isLandscape) {
    return (
      <div
        ref={containerRef}
        className="w-full flex flex-row items-stretch gap-2 px-1"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 4px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 4px)',
          paddingLeft: 'max(env(safe-area-inset-left), 4px)',
          paddingRight: 'max(env(safe-area-inset-right), 4px)',
        }}
      >
        {/* 左侧信息栏 */}
        <div className="flex flex-col justify-between w-[84px] flex-shrink-0">
          <div className={`p-2 rounded-xl shadow-md border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
            <div className={`text-[9px] font-semibold mb-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {game.currentLevel}关
            </div>
            <div className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {game.score}/{game.level.targetLength}
            </div>
            {/* 进度条 */}
            <div className={`mt-1 h-1 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min(100, (game.score / game.level.targetLength) * 100)}%` }}
              />
            </div>
          </div>

          <div className={`p-2 rounded-xl shadow-md border space-y-1.5 ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
            <div className={`px-1.5 py-1 rounded-md text-center ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
              <div className={`text-[9px] ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>长度</div>
              <div className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{game.snakeLength}</div>
            </div>
            <div className={`px-1.5 py-1 rounded-md text-center ${isDark ? 'bg-purple-500/15' : 'bg-purple-50'}`}>
              <div className={`text-[9px] ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>敌蛇</div>
              <div className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{game.aliveAiCount}/{game.level.aiSnakes.length}</div>
            </div>
            <div className={`px-1.5 py-1 rounded-md text-center ${isDark ? 'bg-amber-500/15' : 'bg-amber-50'}`}>
              <div className={`text-[9px] ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>🏆</div>
              <div className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{game.highScore}</div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-1.5">
            {game.gameState === 'playing' && (
              <>
                <button type="button" onClick={game.pauseToggle} className={`w-full min-h-[36px] text-xs font-bold rounded-lg active:scale-95 shadow ${isDark ? 'bg-amber-500/80 text-white' : 'bg-amber-500 text-white'}`}>⏸</button>
                <button type="button" onClick={game.resetCurrentLevel} className={`w-full min-h-[36px] text-xs font-bold rounded-lg active:scale-95 shadow ${isDark ? 'bg-gray-600 text-white' : 'bg-gray-500 text-white'}`}>🔄</button>
                <button type="button" onClick={game.goToMenu} className={`w-full min-h-[36px] text-xs font-bold rounded-lg active:scale-95 shadow ${isDark ? 'bg-slate-600 text-white' : 'bg-slate-500 text-white'}`}>📋</button>
              </>
            )}
            {game.gameState === 'paused' && (
              <>
                <button type="button" onClick={game.pauseToggle} className={`w-full min-h-[36px] text-xs font-bold rounded-lg active:scale-95 shadow ${isDark ? 'bg-emerald-500/80 text-white' : 'bg-emerald-500 text-white'}`}>▶️</button>
                <button type="button" onClick={game.resetCurrentLevel} className={`w-full min-h-[36px] text-xs font-bold rounded-lg active:scale-95 shadow ${isDark ? 'bg-gray-600 text-white' : 'bg-gray-500 text-white'}`}>🔄</button>
                <button type="button" onClick={game.goToMenu} className={`w-full min-h-[36px] text-xs font-bold rounded-lg active:scale-95 shadow ${isDark ? 'bg-slate-600 text-white' : 'bg-slate-500 text-white'}`}>📋</button>
              </>
            )}
            {(game.gameState === 'over' || game.gameState === 'win') && (
              <>
                <button type="button" onClick={game.resetCurrentLevel} className={`w-full min-h-[36px] text-xs font-bold rounded-lg active:scale-95 shadow ${isDark ? 'bg-emerald-500/80 text-white' : 'bg-emerald-500 text-white'}`}>🔄</button>
                {game.gameState === 'win' && game.currentLevel < 4 && (
                  <button type="button" onClick={() => game.initLevel(game.currentLevel + 1)} className={`w-full min-h-[36px] text-xs font-bold rounded-lg active:scale-95 shadow ${isDark ? 'bg-blue-500/80 text-white' : 'bg-blue-500 text-white'}`}>➡️</button>
                )}
                <button type="button" onClick={game.goToMenu} className={`w-full min-h-[36px] text-xs font-bold rounded-lg active:scale-95 shadow ${isDark ? 'bg-slate-600 text-white' : 'bg-slate-500 text-white'}`}>📋</button>
              </>
            )}
          </div>
        </div>

        {/* 中央棋盘 */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          <div
            className={`relative rounded-2xl overflow-hidden border-2 shadow-lg touch-none select-none ${isDark ? 'border-gray-700' : 'border-gray-300'}`}
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
                  <div className="text-2xl font-black text-white mb-1">⏸️ 暂停</div>
                  <div className="text-xs text-gray-300">点击继续按钮恢复</div>
                </div>
              </div>
            )}
            {game.gameState === 'over' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="text-center px-3">
                  <div className="text-2xl font-black text-red-400 mb-1">💀 失败</div>
                  <div className="text-xs text-gray-300 mb-1">长度 {game.snakeLength} · 得分 {game.score}</div>
                  {game.isNewRecord && <div className="text-amber-400 font-bold animate-pulse text-xs">🏆 新纪录！</div>}
                </div>
              </div>
            )}
            {game.gameState === 'win' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="text-center px-3">
                  <div className="text-2xl font-black text-emerald-400 mb-1">🎉 通关</div>
                  <div className="text-xs text-gray-300 mb-1">得分 {game.score}</div>
                  {game.isNewRecord && <div className="text-amber-400 font-bold animate-pulse text-xs">🏆 新纪录！</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧虚拟摇杆 */}
        <div className="flex flex-col items-center justify-center w-[140px] flex-shrink-0">
          <div
            ref={joystickRef}
            className="relative touch-none select-none"
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: isDark
                ? 'radial-gradient(circle, rgba(51,65,85,0.8) 0%, rgba(30,41,59,0.9) 100%)'
                : 'radial-gradient(circle, rgba(241,245,249,0.9) 0%, rgba(226,232,240,0.9) 100%)',
              border: `2px solid ${isDark ? '#475569' : '#cbd5e1'}`,
              boxShadow: isDark
                ? 'inset 0 2px 8px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)'
                : 'inset 0 2px 8px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.1)',
            }}
            onTouchStart={onJoystickTouchStart}
            onTouchMove={onJoystickTouchMove}
            onTouchEnd={onJoystickTouchEnd}
            onTouchCancel={onJoystickTouchEnd}
          >
            {/* 方向指示 */}
            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none`}>
              <span className={`absolute top-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>↑</span>
              <span className={`absolute bottom-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>↓</span>
              <span className={`absolute left-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>←</span>
              <span className={`absolute right-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>→</span>
            </div>
            {/* 摇杆手柄 */}
            <div
              className="absolute top-1/2 left-1/2 rounded-full pointer-events-none transition-transform"
              style={{
                width: 48,
                height: 48,
                marginLeft: -24,
                marginTop: -24,
                transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
                background: joystickActive
                  ? (isDark
                      ? 'radial-gradient(circle at 35% 35%, #34d399, #059669)'
                      : 'radial-gradient(circle at 35% 35%, #10b981, #047857)')
                  : (isDark
                      ? 'radial-gradient(circle at 35% 35%, #64748b, #334155)'
                      : 'radial-gradient(circle at 35% 35%, #94a3b8, #64748b)'),
                boxShadow: joystickActive
                  ? '0 4px 16px rgba(16,185,129,0.4), inset 0 -2px 4px rgba(0,0,0,0.2)'
                  : '0 4px 8px rgba(0,0,0,0.15), inset 0 -2px 4px rgba(0,0,0,0.1)',
                transition: joystickActive ? 'none' : 'transform 0.15s ease-out, background 0.15s',
              }}
            />
          </div>
          <p className={`mt-2 text-center text-[9px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            摇杆控制方向
          </p>
        </div>
      </div>
    );
  }

  // 竖屏布局：顶部信息栏 + 中央棋盘 + 底部摇杆
  return (
    <div
      ref={containerRef}
      className="w-full flex flex-col items-stretch px-2"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
        paddingTop: 'max(env(safe-area-inset-top), 4px)',
      }}
    >
      {/* 顶部信息栏 */}
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
        <div className={`mt-1.5 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-300"
            style={{ width: `${Math.min(100, (game.score / game.level.targetLength) * 100)}%` }}
          />
        </div>
      </div>

      {/* 棋盘 */}
      <div className="flex justify-center">
        <div
          className={`relative rounded-2xl overflow-hidden border-2 shadow-lg touch-none select-none ${isDark ? 'border-gray-700' : 'border-gray-300'}`}
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
      </div>

      {/* 操作按钮 */}
      <div className="mt-2 grid grid-cols-3 gap-2 max-w-[360px] mx-auto w-full">
        {game.gameState === 'playing' && (
          <>
            <button type="button" onClick={game.pauseToggle} className={`min-h-[40px] py-2 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-amber-500/80 text-white' : 'bg-amber-500 text-white'}`}>⏸ 暂停</button>
            <button type="button" onClick={game.resetCurrentLevel} className={`min-h-[40px] py-2 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-gray-600 text-white' : 'bg-gray-500 text-white'}`}>🔄 重来</button>
            <button type="button" onClick={game.goToMenu} className={`min-h-[40px] py-2 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-slate-600 text-white' : 'bg-slate-500 text-white'}`}>📋 菜单</button>
          </>
        )}
        {game.gameState === 'paused' && (
          <>
            <button type="button" onClick={game.pauseToggle} className={`min-h-[40px] py-2 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-emerald-500/80 text-white' : 'bg-emerald-500 text-white'}`}>▶️ 继续</button>
            <button type="button" onClick={game.resetCurrentLevel} className={`min-h-[40px] py-2 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-gray-600 text-white' : 'bg-gray-500 text-white'}`}>🔄</button>
            <button type="button" onClick={game.goToMenu} className={`min-h-[40px] py-2 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-slate-600 text-white' : 'bg-slate-500 text-white'}`}>📋</button>
          </>
        )}
        {(game.gameState === 'over' || game.gameState === 'win') && (
          <>
            <button type="button" onClick={game.resetCurrentLevel} className={`min-h-[40px] py-2 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-emerald-500/80 text-white' : 'bg-emerald-500 text-white'}`}>🔄 再来</button>
            {game.gameState === 'win' && game.currentLevel < 4 ? (
              <button type="button" onClick={() => game.initLevel(game.currentLevel + 1)} className={`min-h-[40px] py-2 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-blue-500/80 text-white' : 'bg-blue-500 text-white'}`}>➡️ 下一关</button>
            ) : (
              <div />
            )}
            <button type="button" onClick={game.goToMenu} className={`min-h-[40px] py-2 text-sm font-bold rounded-xl active:scale-95 shadow-md ${isDark ? 'bg-slate-600 text-white' : 'bg-slate-500 text-white'}`}>📋 菜单</button>
          </>
        )}
      </div>

      {/* 虚拟摇杆 */}
      <div className="mt-3 flex items-center justify-center gap-6">
        <div
          ref={joystickRef}
          className="relative touch-none select-none"
          style={{
            width: 110,
            height: 110,
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle, rgba(51,65,85,0.8) 0%, rgba(30,41,59,0.9) 100%)'
              : 'radial-gradient(circle, rgba(241,245,249,0.9) 0%, rgba(226,232,240,0.9) 100%)',
            border: `2px solid ${isDark ? '#475569' : '#cbd5e1'}`,
            boxShadow: isDark
              ? 'inset 0 2px 8px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)'
              : 'inset 0 2px 8px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.1)',
          }}
          onTouchStart={onJoystickTouchStart}
          onTouchMove={onJoystickTouchMove}
          onTouchEnd={onJoystickTouchEnd}
          onTouchCancel={onJoystickTouchEnd}
        >
          {/* 方向指示 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className={`absolute top-1.5 text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>↑</span>
            <span className={`absolute bottom-1.5 text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>↓</span>
            <span className={`absolute left-1.5 text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>←</span>
            <span className={`absolute right-1.5 text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>→</span>
          </div>
          {/* 摇杆手柄 */}
          <div
            className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
            style={{
              width: 44,
              height: 44,
              marginLeft: -22,
              marginTop: -22,
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              background: joystickActive
                ? (isDark
                    ? 'radial-gradient(circle at 35% 35%, #34d399, #059669)'
                    : 'radial-gradient(circle at 35% 35%, #10b981, #047857)')
                : (isDark
                    ? 'radial-gradient(circle at 35% 35%, #64748b, #334155)'
                    : 'radial-gradient(circle at 35% 35%, #94a3b8, #64748b)'),
              boxShadow: joystickActive
                ? '0 4px 16px rgba(16,185,129,0.4), inset 0 -2px 4px rgba(0,0,0,0.2)'
                : '0 4px 8px rgba(0,0,0,0.15), inset 0 -2px 4px rgba(0,0,0,0.1)',
              transition: joystickActive ? 'none' : 'transform 0.15s ease-out, background 0.15s',
            }}
          />
        </div>
      </div>

      <p className={`mt-2 text-center text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        摇杆或滑屏控制 · 建议横屏体验更佳
      </p>
    </div>
  );
}
