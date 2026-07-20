'use client';

import { useEffect, useRef, useState } from 'react';

export type CanvasGameHandle = {
  destroy: () => void;
};

type CanvasGameRuntimeProps = {
  ariaLabel: string;
  createGame: (parent: HTMLDivElement, signal: AbortSignal) => Promise<CanvasGameHandle>;
  className?: string;
};

export default function CanvasGameRuntime({ ariaLabel, createGame, className = '' }: CanvasGameRuntimeProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;

    let disposed = false;
    const controller = new AbortController();
    let handle: CanvasGameHandle | null = null;
    createGame(parent, controller.signal)
      .then((instance) => {
        if (disposed) {
          instance.destroy();
          return;
        }
        handle = instance;
        setReady(true);
      })
      .catch((cause: unknown) => {
        if (!disposed) setError(cause instanceof Error ? cause.message : 'Canvas 游戏启动失败');
      });

    return () => {
      disposed = true;
      controller.abort();
      handle?.destroy();
      parent.replaceChildren();
    };
  }, [createGame]);

  return (
    <div className={`relative overflow-hidden bg-[#bde8ff] ${className}`} aria-label={ariaLabel}>
      <div ref={parentRef} className="h-full w-full [&>canvas]:block" />
      {!ready && !error && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#bde8ff] text-sm font-black text-sky-950/60">
          正在搭建物理世界...
        </div>
      )}
      {error && (
        <div role="alert" className="absolute inset-0 grid place-items-center bg-rose-950 p-6 text-center text-sm font-bold text-white">
          {error}
        </div>
      )}
    </div>
  );
}
