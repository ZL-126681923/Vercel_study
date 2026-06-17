"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Mosquito = {
  id: number;
  x: number;
  y: number;
  scale: number;
  duration: number;
  driftX: number[];
  driftY: number[];
  rotate: number[];
};

type Splat = {
  id: number;
  x: number;
  y: number;
  hue: number;
};

const INITIAL_COUNT = 4;
const MAX_COUNT = 18;
const BREED_INTERVAL_MS = 6500;
const SAFE_AFTER_SQUASH_MS = 5000;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function createMosquito(id: number, width: number, height: number): Mosquito {
  const paddingX = width < 640 ? 28 : 42;
  const paddingY = width < 640 ? 84 : 100;
  const x = rand(paddingX, Math.max(paddingX + 1, width - paddingX));
  const y = rand(paddingY, Math.max(paddingY + 1, height - 72));
  const range = width < 640 ? 22 : 34;
  const scale = rand(width < 640 ? 0.72 : 0.82, width < 640 ? 0.92 : 1.12);
  const points = [0, 1, 2, 3, 4].map((index) => {
    if (index === 0 || index === 4) return 0;
    return rand(-range, range);
  });
  const vertical = [0, rand(-range, range), rand(-range, range), rand(-range, range), 0];
  return {
    id,
    x,
    y,
    scale,
    duration: rand(6.6, 10.8),
    driftX: points,
    driftY: vertical,
    rotate: [rand(-16, -8), rand(8, 16), rand(-12, 12), rand(10, 18), rand(-16, -8)],
  };
}

function MosquitoSvg({ tint = 0 }: { tint?: number }) {
  const wingTone = `hsla(${210 + tint}, 80%, 92%, 0.92)`;
  const veinTone = `hsla(${220 + tint}, 22%, 44%, 0.44)`;
  const bodyTone = `hsla(${18 + tint}, 12%, 18%, 1)`;
  const bodyHighlight = `hsla(${32 + tint}, 18%, 40%, 0.9)`;
  const abdomenTone = `hsla(${20 + tint}, 18%, 26%, 1)`;

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="mosquito-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="rgba(0,0,0,0.28)" />
        </filter>
        <linearGradient id="wing-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={wingTone} />
          <stop offset="100%" stopColor="rgba(255,255,255,0.18)" />
        </linearGradient>
        <linearGradient id="body-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={bodyHighlight} />
          <stop offset="100%" stopColor={bodyTone} />
        </linearGradient>
        <linearGradient id="abdomen-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={abdomenTone} />
          <stop offset="100%" stopColor={bodyTone} />
        </linearGradient>
      </defs>

      <g filter="url(#mosquito-shadow)">
        <path
          d="M27.5 22.5C18.5 16.5 12.2 16.6 9 20.6C7.1 23 8 26.2 11.5 27.8C14.9 29.5 20.5 29.5 28.2 27.6"
          fill="url(#wing-fill)"
          stroke={veinTone}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path d="M18 21.4L26.8 25.2" stroke={veinTone} strokeWidth="0.9" strokeLinecap="round" />
        <path d="M14.5 24.2L25.8 26.3" stroke={veinTone} strokeWidth="0.8" strokeLinecap="round" />

        <path
          d="M44.5 21.8C53.2 15.5 59.4 15.1 62.8 18.8C64.9 21.1 64.3 24.5 61 26.4C57.8 28.3 52.2 28.7 44 27.3"
          fill="url(#wing-fill)"
          stroke={veinTone}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path d="M53.2 20.7L45 24.7" stroke={veinTone} strokeWidth="0.9" strokeLinecap="round" />
        <path d="M57.1 23.3L46.1 25.7" stroke={veinTone} strokeWidth="0.8" strokeLinecap="round" />

        <path d="M31 28.5L18 38.8" stroke={bodyTone} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M33.4 30.6L20.8 45" stroke={bodyTone} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M35 32L26.8 49.2" stroke={bodyTone} strokeWidth="1.8" strokeLinecap="round" />

        <path d="M40.7 28.8L54 38.3" stroke={bodyTone} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M38.6 31L51.1 45.1" stroke={bodyTone} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M37 32.4L45 49.1" stroke={bodyTone} strokeWidth="1.8" strokeLinecap="round" />

        <path d="M35.5 21.5L34 12.4" stroke={bodyTone} strokeWidth="1.7" strokeLinecap="round" />
        <path d="M36.7 21.4L39.4 13.4" stroke={bodyTone} strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="34.8" cy="21.4" r="3.6" fill={bodyTone} />
        <circle cx="32.3" cy="20.8" r="1.2" fill="#C73232" />
        <circle cx="37.1" cy="20.8" r="1.2" fill="#C73232" />
        <path d="M35.1 24.7C34.7 27.5 34.9 29.6 35.6 31.4" stroke={bodyTone} strokeWidth="1.4" strokeLinecap="round" />

        <ellipse cx="36.1" cy="31.5" rx="4.8" ry="7.2" fill="url(#body-fill)" />
        <ellipse cx="36.2" cy="31.2" rx="2.2" ry="5.1" fill="rgba(255,255,255,0.12)" />

        <path
          d="M36.4 37.6C39.4 38.2 42.5 40.2 44.4 43.6C46 46.6 46.1 49.5 44.5 51.2C43 52.8 40 53.2 36.7 52.3C33.4 51.5 30.1 49.3 28.2 45.9C26.4 42.7 26.3 39.7 27.9 38C29.6 36.3 32.9 36 36.4 37.6Z"
          fill="url(#abdomen-fill)"
        />
        <path d="M32 40.1C34.4 41 39.4 41.2 43 40.4" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
        <path d="M29.9 44.2C33 45.4 38.9 45.7 42.8 44.8" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
        <path d="M31.7 48C34.4 48.8 38.2 49 41 48.3" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />

        <path d="M44.3 50.7L50.3 56.4" stroke={bodyTone} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M50.3 56.4L52.6 55.8" stroke={bodyTone} strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function BookmarkMosquitoSwarm() {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [mosquitoes, setMosquitoes] = useState<Mosquito[]>([]);
  const [splats, setSplats] = useState<Splat[]>([]);
  const nextIdRef = useRef(1);
  const nextSplatIdRef = useRef(1);
  const lastSquashRef = useRef(Date.now());

  useEffect(() => {
    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (!viewport.width || !viewport.height || mosquitoes.length > 0) return;
    const initial = Array.from({ length: INITIAL_COUNT }, () => {
      const mosquito = createMosquito(nextIdRef.current, viewport.width, viewport.height);
      nextIdRef.current += 1;
      return mosquito;
    });
    setMosquitoes(initial);
  }, [viewport, mosquitoes.length]);

  useEffect(() => {
    if (!viewport.width || !viewport.height) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (now - lastSquashRef.current < SAFE_AFTER_SQUASH_MS) return;
      setMosquitoes((prev) => {
        if (prev.length >= MAX_COUNT) return prev;
        const born = createMosquito(nextIdRef.current, viewport.width, viewport.height);
        nextIdRef.current += 1;
        return [...prev, born];
      });
    }, BREED_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [viewport]);

  const mosquitoCount = mosquitoes.length;

  const handleSquash = (mosquito: Mosquito) => {
    lastSquashRef.current = Date.now();
    setMosquitoes((prev) => prev.filter((item) => item.id !== mosquito.id));
    const splat: Splat = {
      id: nextSplatIdRef.current,
      x: mosquito.x,
      y: mosquito.y,
      hue: Math.round(rand(0, 12)),
    };
    nextSplatIdRef.current += 1;
    setSplats((prev) => [...prev, splat]);
    window.setTimeout(() => {
      setSplats((prev) => prev.filter((item) => item.id !== splat.id));
    }, 520);
  };

  const badgeTone = useMemo(() => {
    if (mosquitoCount >= MAX_COUNT) return "bg-red-500/90 text-white";
    if (mosquitoCount >= Math.ceil(MAX_COUNT * 0.66)) return "bg-orange-500/90 text-white";
    return "bg-slate-900/75 text-white";
  }, [mosquitoCount]);

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
        <AnimatePresence>
          {mosquitoes.map((mosquito, index) => (
            <motion.button
              key={mosquito.id}
              type="button"
              aria-label="拍掉蚊子"
              className="absolute pointer-events-auto touch-manipulation"
              style={{ left: mosquito.x, top: mosquito.y }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{
                opacity: [0.86, 1, 0.92, 1],
                x: mosquito.driftX,
                y: mosquito.driftY,
                rotate: mosquito.rotate,
                scale: [mosquito.scale, mosquito.scale * 1.04, mosquito.scale * 0.96, mosquito.scale],
              }}
              exit={{ opacity: 0, scale: 0.18, rotate: 100 }}
              transition={{
                opacity: { duration: mosquito.duration * 0.52, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
                x: { duration: mosquito.duration, repeat: Infinity, ease: "easeInOut" },
                y: { duration: mosquito.duration * 0.94, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: mosquito.duration * 0.92, repeat: Infinity, ease: "easeInOut" },
                scale: { duration: mosquito.duration * 0.88, repeat: Infinity, ease: "easeInOut" },
              }}
              onClick={() => handleSquash(mosquito)}
              whileHover={{ scale: mosquito.scale * 1.08 }}
              whileTap={{ scale: mosquito.scale * 0.84 }}
            >
              <motion.span
                className="block w-14 h-14 sm:w-[72px] sm:h-[72px]"
                animate={{ rotateZ: [0, -1.2, 1.2, 0] }}
                transition={{ duration: 0.22, repeat: Infinity, ease: "linear", delay: index * 0.07 }}
              >
                <MosquitoSvg tint={index * 4} />
              </motion.span>
            </motion.button>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {splats.map((splat) => (
            <motion.div
              key={`splat-${splat.id}`}
              className="absolute pointer-events-none"
              style={{ left: splat.x + 16, top: splat.y + 16 }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 0.95, scale: 1 }}
              exit={{ opacity: 0, scale: 1.35 }}
              transition={{ duration: 0.42, ease: "easeOut" }}
            >
              <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M17 5C19.7 8.6 23 7.6 24.4 11.1C28.8 11.2 27.8 16.2 29.5 18.6C27 20.6 29.1 24.9 25.5 25.8C24.5 30.1 19.7 28.4 16.9 30C14.6 27.2 10.7 29.6 8.9 25.8C4.9 25.3 6.2 20.8 4.4 18.7C6.7 16.3 4.9 12.3 8.6 11.2C10.1 7.5 13.9 8.6 17 5Z"
                  fill={`hsla(${splat.hue}, 72%, 44%, 0.82)`}
                />
                <circle cx="17" cy="17" r="4.2" fill={`hsla(${splat.hue}, 80%, 30%, 0.76)`} />
              </svg>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="pointer-events-none fixed right-4 top-4 z-30">
        <div className={`rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md ${badgeTone}`}>
          蚊子数量 {mosquitoCount}/{MAX_COUNT}
        </div>
      </div>
    </>
  );
}
