'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import CanvasGameRuntime, { type CanvasGameHandle } from '@/components/games/canvas/CanvasGameRuntime';
import {
  createBirdSiegeGame,
  type BirdGameControls,
  type BirdGameHud,
  type BirdType,
} from '@/components/games/phaser/createBirdSiegeGame';
import { updateScore } from '@/lib/gameScores';

const INITIAL_HUD: BirdGameHud = {
  level: 1,
  score: 0,
  birds: 5,
  pigs: 0,
  selectedBird: 'red',
  queue: ['red', 'yellow', 'blue', 'red', 'black'],
  status: 'playing',
};

const BIRDS: Array<{ type: BirdType; name: string; skill: string; color: string; shape: string }> = [
  { type: 'red', name: '红鸟', skill: '冲击波', color: 'bg-red-500', shape: 'rounded-full' },
  { type: 'yellow', name: '黄鸟', skill: '加速', color: 'bg-yellow-400', shape: 'rotate-45 rounded-sm' },
  { type: 'blue', name: '蓝鸟', skill: '分裂', color: 'bg-sky-400', shape: 'scale-90 rounded-full' },
  { type: 'black', name: '黑鸟', skill: '爆炸', color: 'bg-zinc-800', shape: 'rounded-full ring-1 ring-zinc-500' },
];

const NOOP_CONTROLS: BirdGameControls = {
  selectBird: () => undefined,
  restartLevel: () => undefined,
  nextLevel: () => undefined,
};

export default function BoomerangGame() {
  const [hud, setHud] = useState(INITIAL_HUD);
  const controls = useRef<BirdGameControls>({ ...NOOP_CONTROLS });

  const createGame = useCallback(
    (parent: HTMLDivElement, signal: AbortSignal): Promise<CanvasGameHandle> =>
      createBirdSiegeGame(parent, { onHud: setHud, controls: controls.current }, signal),
    [],
  );

  useEffect(() => {
    updateScore('boomerang', (previous) => ({
      bestLevel: Math.max(previous.bestLevel, hud.level),
      totalScore: Math.max(previous.totalScore, hud.score),
    }));
  }, [hud.level, hud.score]);

  const overlay = hud.status === 'levelComplete'
    ? { title: `第 ${hud.level} 关完成`, detail: `当前得分 ${hud.score}`, action: '下一关' }
    : hud.status === 'failed'
      ? { title: '小鸟用完了', detail: '调整角度，再拆一次堡垒', action: '重试' }
      : hud.status === 'won'
        ? { title: '十座堡垒全部攻破', detail: `最终得分 ${hud.score}`, action: '再玩一次' }
        : null;

  const handleOverlayAction = () => {
    if (hud.status === 'levelComplete') controls.current.nextLevel();
    else controls.current.restartLevel();
  };

  return (
    <section className="overflow-hidden rounded-lg border border-sky-950/15 bg-[#f7fbfd] text-sky-950 shadow-2xl shadow-sky-950/15">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-950/10 bg-white px-4 py-3 sm:px-5">
        <div>
          <p className="text-xs font-black uppercase text-red-600">Matter Physics</p>
          <h2 className="text-xl font-black sm:text-2xl">弹弓小鸟</h2>
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center sm:gap-2">
          {[
            ['关卡', `${hud.level}/10`],
            ['得分', hud.score],
            ['小鸟', hud.birds],
            ['目标', hud.pigs],
          ].map(([label, value]) => (
            <div key={label} className="min-w-14 border-l border-sky-950/10 px-2 sm:min-w-20">
              <div className="text-[10px] font-bold text-sky-950/55">{label}</div>
              <div className="text-base font-black tabular-nums sm:text-lg">{value}</div>
            </div>
          ))}
        </div>
      </header>

      <div className="relative bg-[#bde8ff]">
        <CanvasGameRuntime ariaLabel="弹弓小鸟 Matter 物理游戏" createGame={createGame} className="aspect-video w-full touch-none" />
        {overlay && (
          <div className="absolute inset-0 grid place-items-center bg-sky-950/75 p-5 text-center text-white backdrop-blur-sm">
            <div>
              <h3 className="text-2xl font-black sm:text-4xl">{overlay.title}</h3>
              <p className="mt-2 text-sm text-sky-100 sm:text-base">{overlay.detail}</p>
              <button type="button" onClick={handleOverlayAction} className="mt-5 min-h-11 bg-yellow-400 px-6 py-2.5 font-black text-sky-950 transition hover:bg-yellow-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                {overlay.action}
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="flex flex-col gap-3 border-t border-sky-950/10 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="grid grid-cols-4 gap-1.5" aria-label="选择小鸟">
          {BIRDS.map((bird) => {
            const selected = hud.selectedBird === bird.type;
            const available = selected || hud.queue.includes(bird.type);
            return (
              <button key={bird.type} type="button" aria-pressed={selected} disabled={!available} onClick={() => controls.current.selectBird(bird.type)} className={`flex min-h-11 items-center gap-2 border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-35 ${selected ? 'border-sky-950 bg-sky-950 text-white' : 'border-sky-950/15 bg-white hover:bg-sky-50'}`}>
                <span className={`h-4 w-4 shrink-0 border-2 border-white shadow ${bird.color} ${bird.shape}`} />
                <span>
                  <span className="block text-xs font-black">{bird.name}</span>
                  <span className={`block text-[10px] ${selected ? 'text-sky-100' : 'text-sky-950/55'}`}>{bird.skill}</span>
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => controls.current.restartLevel()}
          className="min-h-11 border border-sky-950/20 bg-white px-4 py-2 text-sm font-black transition hover:bg-sky-50"
        >
          重玩本关
        </button>
      </footer>
    </section>
  );
}
