'use client';

/**
 * Mobile 端回旋镖小鸟
 * - 物理 / 关卡 / 技能逻辑与 PC 版完全一致（Matter.js + 10 关 + 6 种小鸟技能）
 * - UI 差异：
 *   - 信息栏紧凑横排（2x2 网格）
 *   - 鸟选择按钮 ≥44px 热区
 *   - canvas 自适应宽度（width:100%, max 360px 等比缩放）
 *   - 配置面板默认折叠，点击展开（节省竖屏空间）
 *   - 底部安全区 env(safe-area-inset) 适配
 *   - 大按钮 / 大字号
 */

import { useEffect, useRef } from 'react';
import { updateScore } from '@/lib/gameScores';

declare global {
  interface Window {
    Matter: any;
  }
}

export default function BoomerangGameMobile() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || scriptLoadedRef.current) return;
    
    scriptLoadedRef.current = true;
    
    // 加载 Matter.js
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js';
    script.onload = initGame;
    document.head.appendChild(script);
    
    function initGame() {
      if (!containerRef.current || !window.Matter) return;
      
      const M = window.Matter;
      // 物理世界坐标系始终保持 680×420，不随屏幕变化；
      // 画布通过 CSS width:100% 浏览器自动等比缩放，DPR 问题不影响游戏逻辑。
      const W = 680, H = 420, G = 380, SX = 110, SY = 295, MAXR = 85, K = 0.235, VMAX = 26;

      // 创建游戏界面（Mobile 适配版）
      containerRef.current.innerHTML = `
        <div class="boomerang-wrap" style="width:100%;max-width:360px;margin:0 auto;padding-bottom:max(env(safe-area-inset-bottom),12px);">
          <!-- 紧凑信息栏：2x2 网格 -->
          <div class="boomerang-stats" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
            <div style="background:#f0f0f0;border-radius:10px;padding:6px 10px;min-width:0;">
              <div style="font-size:10px;color:#666;">关卡</div>
              <div id="lv" style="font-size:15px;font-weight:600;color:#333;">1 / 10</div>
            </div>
            <div style="background:#f0f0f0;border-radius:10px;padding:6px 10px;min-width:0;">
              <div style="font-size:10px;color:#666;">得分</div>
              <div id="score" style="font-size:15px;font-weight:600;color:#333;">0</div>
            </div>
            <div style="background:#f0f0f0;border-radius:10px;padding:6px 10px;min-width:0;">
              <div style="font-size:10px;color:#666;">剩余小鸟</div>
              <div id="birds" style="font-size:15px;font-weight:600;color:#333;">3</div>
            </div>
            <div style="background:#f0f0f0;border-radius:10px;padding:6px 10px;min-width:0;">
              <div style="font-size:10px;color:#666;">剩余猪猪</div>
              <div id="pigs" style="font-size:15px;font-weight:600;color:#333;">0</div>
            </div>
          </div>
          <!-- 鸟选择（≥44px 热区） -->
          <div id="birdSel" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:8px;"></div>
          <!-- Canvas（自适应宽度） -->
          <div style="position:relative;border:1px solid #ddd;border-radius:12px;overflow:hidden;background:#cfe8f5;">
            <canvas id="game" width="680" height="420" style="display:block;width:100%;height:auto;touch-action:none;user-select:none;-webkit-tap-highlight-color:transparent;"></canvas>
            <div id="overlay" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,0.55);align-items:center;justify-content:center;flex-direction:column;gap:10px;text-align:center;padding:0 12px;">
              <div id="ovTitle" style="font-size:18px;font-weight:600;color:#fff;"></div>
              <div id="ovStars" style="font-size:24px;color:#FAC775;letter-spacing:4px;"></div>
              <div id="ovSub" style="font-size:12px;color:#e8e8e8;"></div>
              <button id="ovBtn" style="font-size:14px;padding:12px 24px;background:#fff;color:#222;border:none;border-radius:8px;cursor:pointer;min-height:44px;min-width:120px;"></button>
            </div>
          </div>
          <div class="boomerang-tip" style="font-size:11px;color:#666;margin-top:6px;text-align:center;">拖拽瞄准 · 飞行中点击放技能</div>
          <!-- 配置面板：默认折叠 -->
          <details style="margin-top:8px;background:#f0f0f0;border-radius:10px;padding:8px 12px;">
            <summary style="font-size:12px;color:#666;cursor:pointer;min-height:36px;display:flex;align-items:center;">⚙️ 难度配置（点击展开）</summary>
            <div class="boomerang-config" style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:12px;color:#666;white-space:nowrap;min-width:64px;">猪血量</span>
                <input type="range" id="pigHp" min="1" max="5" step="1" value="2" style="flex:1;min-height:36px;">
                <span id="pigHpV" style="font-size:12px;font-weight:600;min-width:14px;color:#333;">2</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:12px;color:#666;white-space:nowrap;min-width:64px;">木板血量</span>
                <input type="range" id="woodHp" min="1" max="8" step="1" value="3" style="flex:1;min-height:36px;">
                <span id="woodHpV" style="font-size:12px;font-weight:600;min-width:14px;color:#333;">3</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:12px;color:#666;white-space:nowrap;min-width:64px;">石头血量</span>
                <input type="range" id="stoneHp" min="2" max="12" step="1" value="6" style="flex:1;min-height:36px;">
                <span id="stoneHpV" style="font-size:12px;font-weight:600;min-width:14px;color:#333;">6</span>
              </div>
              <button id="retryBtn" style="font-size:13px;padding:10px 14px;white-space:nowrap;cursor:pointer;min-height:44px;border:none;border-radius:8px;background:#5DCAA5;color:#fff;font-weight:600;">重玩本关</button>
            </div>
          </details>
        </div>
      `;
      
      const cv = document.getElementById('game') as HTMLCanvasElement;
      const ctx = cv.getContext('2d')!;
      const engine = M.Engine.create();
      engine.gravity.y = 1;
      let world = engine.world;
      
      const cfg = { pig: 2, wood: 3, stone: 6 };
      const TYPES = {
        red: { name: '红鸟', color: '#E24B4A', dark: '#791F1F', r: 14, density: 0.0045, desc: '结实耐撞' },
        yellow: { name: '黄鸟', color: '#EF9F27', dark: '#854F0B', r: 13, density: 0.0035, desc: '点击加速' },
        blue: { name: '蓝鸟', color: '#378ADD', dark: '#0C447C', r: 10, density: 0.003, desc: '一分为三' },
        black: { name: '黑鸟', color: '#444441', dark: '#2C2C2A', r: 16, density: 0.0055, desc: '点击引爆' },
        white: { name: '白鸟', color: '#F1EFE8', dark: '#5F5E5A', r: 15, density: 0.0035, desc: '空投炸蛋' },
        green: { name: '绿鸟', color: '#639922', dark: '#3B6D11', r: 13, density: 0.004, desc: '点击回旋反打' }
      };
      
      let selType = 'red';
      let level = 1, score = 0, levelStartScore = 0, birdsLeft = 0, bird: any = null, birdState = 'ready';
      let activeBirds: any[] = [], skillUsed = false;
      let pigs: any[] = [], blocks: any[] = [], particles: any[] = [], flashes: any[] = [], pops: any[] = [], shake = 0;
      let lastKillTime = 0, comboN = 0;
      let dragging = false, dragPos = { x: SX, y: SY }, stillFrames = 0, launchTime = 0, ended = false;
      
      type BlockMaterial = 'wood' | 'stone' | 'ice' | 'tnt' | 'bounce' | 'plat';
      type PigKind = 'gold' | 'helmet' | 'balloon' | 'king';
      type LevelBlock = [number, number, number, number, BlockMaterial];
      type LevelPig = [number, number] | [number, number, PigKind];
      type LevelConfig = { birds: number; blocks: LevelBlock[]; pigs: LevelPig[] };

      const LEVELS: Record<number, LevelConfig> = {
        1: { birds: 3, blocks: [[470, 335, 14, 90, 'wood'], [550, 335, 14, 90, 'wood'], [510, 281, 130, 14, 'wood']], pigs: [[510, 360], [510, 258]] },
        2: { birds: 4, blocks: [[440, 335, 16, 90, 'stone'], [560, 335, 16, 90, 'stone'], [500, 283, 160, 16, 'stone'], [470, 245, 14, 60, 'wood'], [530, 245, 14, 60, 'wood'], [500, 208, 100, 14, 'wood']], pigs: [[500, 360], [500, 185], [625, 360]] },
        3: { birds: 4, blocks: [[420, 340, 16, 80, 'stone'], [480, 340, 16, 80, 'stone'], [450, 293, 90, 14, 'wood'], [560, 340, 16, 80, 'stone'], [620, 340, 16, 80, 'stone'], [590, 293, 90, 14, 'wood'], [450, 256, 14, 60, 'wood'], [590, 256, 14, 60, 'wood'], [520, 217, 180, 16, 'stone']], pigs: [[450, 360], [590, 360], [520, 193]] },
        4: { birds: 5, blocks: [[400, 345, 16, 70, 'stone'], [460, 345, 16, 70, 'stone'], [430, 302, 90, 14, 'stone'], [430, 272, 14, 46, 'wood'], [540, 345, 16, 70, 'stone'], [600, 345, 16, 70, 'stone'], [570, 302, 90, 14, 'stone'], [570, 272, 14, 46, 'wood'], [500, 241, 210, 16, 'stone'], [640, 352, 14, 56, 'wood'], [365, 367, 26, 26, 'tnt']], pigs: [[430, 360], [570, 360], [500, 217], [660, 360]] },
        5: { birds: 5, blocks: [[460, 340, 16, 80, 'stone'], [580, 340, 16, 80, 'stone'], [520, 292, 140, 16, 'stone'], [490, 255, 14, 58, 'wood'], [550, 255, 14, 58, 'wood'], [520, 220, 90, 14, 'wood'], [640, 350, 14, 60, 'wood'], [428, 367, 26, 26, 'tnt'], [612, 367, 26, 26, 'tnt'], [520, 270, 26, 26, 'tnt']], pigs: [[520, 360, 'gold'], [520, 196, 'helmet'], [660, 360, 'helmet'], [395, 364]] },
        6: { birds: 5, blocks: [[285, 372, 70, 12, 'bounce'], [470, 340, 16, 80, 'ice'], [550, 340, 16, 80, 'ice'], [510, 293, 120, 14, 'ice'], [470, 262, 14, 46, 'ice'], [550, 262, 14, 46, 'ice'], [510, 232, 120, 14, 'stone'], [640, 352, 14, 56, 'wood'], [612, 367, 26, 26, 'tnt']], pigs: [[510, 360], [510, 209], [665, 360], [600, 160, 'balloon']] },
        7: { birds: 6, blocks: [[280, 372, 70, 12, 'bounce'], [400, 340, 16, 80, 'stone'], [460, 340, 16, 80, 'stone'], [430, 293, 90, 14, 'stone'], [430, 266, 14, 40, 'wood'], [505, 345, 14, 70, 'ice'], [540, 335, 18, 90, 'stone'], [620, 335, 18, 90, 'stone'], [580, 279, 130, 16, 'stone'], [580, 365, 26, 26, 'tnt']], pigs: [[430, 360, 'helmet'], [580, 247, 'king'], [350, 140, 'balloon'], [655, 360]] },
        8: { birds: 5, blocks: [[430, 260, 140, 12, 'plat'], [615, 180, 120, 12, 'plat'], [410, 229, 12, 50, 'wood'], [460, 229, 12, 50, 'wood'], [435, 198, 70, 12, 'wood'], [480, 350, 14, 60, 'stone'], [560, 350, 14, 60, 'stone'], [520, 312, 100, 14, 'stone'], [658, 161, 26, 26, 'tnt']], pigs: [[435, 238], [615, 158, 'helmet'], [520, 360, 'gold'], [300, 170, 'balloon']] },
        9: { birds: 7, blocks: [[270, 372, 70, 12, 'bounce'], [430, 345, 14, 70, 'ice'], [430, 275, 14, 70, 'ice'], [490, 340, 16, 80, 'stone'], [550, 340, 16, 80, 'stone'], [520, 292, 110, 16, 'stone'], [520, 270, 26, 26, 'tnt'], [600, 330, 18, 100, 'stone'], [665, 330, 18, 100, 'stone'], [632, 272, 110, 16, 'stone']], pigs: [[520, 360, 'helmet'], [632, 240, 'king'], [632, 360, 'gold'], [340, 130, 'balloon'], [520, 120, 'balloon']] },
        10: { birds: 6, blocks: [[460, 300, 14, 160, 'plat'], [490, 347, 12, 55, 'wood'], [580, 347, 12, 55, 'wood'], [535, 313, 110, 12, 'wood'], [535, 294, 26, 26, 'tnt'], [650, 345, 14, 70, 'stone'], [300, 372, 70, 12, 'bounce']], pigs: [[535, 360], [510, 360, 'helmet'], [666, 360, 'gold'], [560, 140, 'balloon']] }
      };
      
      function mkBlock(x: number, y: number, w: number, h: number, mat: string) {
        if (mat === 'bounce') {
          const b = M.Bodies.rectangle(x, y, w, h, { isStatic: true, restitution: 1.6, friction: 0.1 });
          b.plugin = { kind: 'pad', w, h };
          return b;
        }
        if (mat === 'plat') {
          const b = M.Bodies.rectangle(x, y, w, h, { isStatic: true, friction: 0.7 });
          b.plugin = { kind: 'plat', w, h };
          return b;
        }
        const hp = mat === 'stone' ? cfg.stone : mat === 'tnt' ? 1 : mat === 'ice' ? 2 : cfg.wood;
        const b = M.Bodies.rectangle(x, y, w, h, { friction: mat === 'ice' ? 0.05 : 0.6, restitution: 0.05, density: mat === 'stone' ? 0.004 : mat === 'ice' ? 0.002 : mat === 'tnt' ? 0.002 : 0.0015 });
        b.plugin = { kind: 'block', mat, hp, maxHp: hp, w, h };
        return b;
      }
      
      function mkPig(x: number, y: number, kind?: string) {
        kind = kind || 'normal';
        const r = kind === 'king' ? 24 : 16;
        const hp = cfg.pig + (kind === 'helmet' ? 2 : kind === 'king' ? 6 : 0);
        const p = M.Bodies.circle(x, y, r, { friction: 0.5, restitution: 0.2, density: 0.0012, frictionAir: kind === 'balloon' ? 0.02 : 0.01 });
        p.plugin = { kind: 'pig', pigKind: kind, hp, maxHp: hp, crush: 0, balloon: kind === 'balloon', r };
        return p;
      }
      
      function mkBird(type: string, x?: number, y?: number, r?: number) {
        const T = TYPES[type as keyof typeof TYPES];
        const b = M.Bodies.circle(x || SX, y || SY, r || T.r, { friction: 0.6, restitution: 0.4, density: T.density, isStatic: !x });
        b.plugin = { kind: 'bird', type, hitAt: 0, exploded: false, eggDropped: false, boomeranged: false };
        return b;
      }
      
      function loadLevel(n: number) {
        M.World.clear(world, false);
        M.Engine.clear(engine);
        world = engine.world;
        ended = false;
        particles = [];
        flashes = [];
        pops = [];
        activeBirds = [];
        shake = 0;
        comboN = 0;
        lastKillTime = 0;
        
        const ground = M.Bodies.rectangle(W / 2, G + 20, W + 400, 40, { isStatic: true, friction: 0.8 });
        ground.plugin = { kind: 'ground' };
        M.World.add(world, ground);
        
        const L = LEVELS[n];
        blocks = L.blocks.map((a) => mkBlock(...a));
        pigs = L.pigs.map((a) => mkPig(a[0], a[1], a[2]));
        M.World.add(world, blocks);
        M.World.add(world, pigs);
        birdsLeft = L.birds;
        levelStartScore = score;
        spawnBird();
        updHud();
        (document.getElementById('overlay') as HTMLDivElement).style.display = 'none';
      }
      
      function spawnBird() {
        bird = mkBird(selType);
        M.World.add(world, bird);
        birdState = 'ready';
        birdsLeft--;
        stillFrames = 0;
        skillUsed = false;
        updHud();
        renderSel();
      }
      
      function switchType(t: string) {
        selType = t;
        if (bird && birdState === 'ready') {
          M.World.remove(world, bird);
          bird = mkBird(t);
          M.World.add(world, bird);
        }
        renderSel();
      }
      
      function renderSel() {
        const el = document.getElementById('birdSel')!;
        el.innerHTML = '';
        for (const key in TYPES) {
          const T = TYPES[key as keyof typeof TYPES];
          const btn = document.createElement('button');
          // Mobile：3 列网格，≥44px 热区
          btn.style.cssText = `min-height:44px;font-size:11px;padding:6px 4px;display:flex;flex-direction:column;align-items:center;gap:2px;border:1px solid #ddd;border-radius:8px;background:#fff;${key === selType ? 'border:2px solid ' + (key === 'white' ? '#888780' : T.color) + ';' : ''}`;
          btn.disabled = birdState === 'flying';
          btn.innerHTML = `<span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;border-radius:50%;background:${T.color};border:1px solid ${T.dark};display:inline-block;"></span><span style="font-weight:600;font-size:11px;">${T.name}</span></span><span style="font-size:10px;color:#666;">${T.desc}</span>`;
          btn.onclick = () => switchType(key);
          el.appendChild(btn);
        }
      }
      
      function updHud() {
        (document.getElementById('lv') as HTMLDivElement).textContent = level + ' / 10';
        (document.getElementById('score') as HTMLDivElement).textContent = String(score);
        (document.getElementById('birds') as HTMLDivElement).textContent = Math.max(0, birdsLeft) + (bird && birdState !== 'done' ? ' +1' : '');
        (document.getElementById('pigs') as HTMLDivElement).textContent = String(pigs.length);
        updateScore('boomerang', prev => ({
          ...prev,
          bestLevel: Math.max(prev.bestLevel, level),
          totalScore: Math.max(prev.totalScore, score),
        }));
      }
      
      function boom(x: number, y: number, col: string, n: number, sp?: number) {
        for (let i = 0; i < n; i++) {
          const a = Math.PI * 2 * Math.random(), v = (sp || 3) * (0.4 + Math.random());
          particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 24, color: col });
        }
      }
      
      function addPop(x: number, y: number, txt: string, col?: string) {
        pops.push({ x, y, txt, col: col || '#3B6D11', life: 50 });
      }
      
      function other(pair: any, body: any) {
        return pair.bodyA === body ? pair.bodyB : pair.bodyA;
      }
      
      function popBalloon(p: any) {
        if (!p.plugin.balloon) return;
        p.plugin.balloon = false;
        boom(p.position.x, p.position.y - 30, '#E24B4A', 10, 3);
        addPop(p.position.x, p.position.y - 35, '啪！', '#A32D2D');
      }
      
      M.Events.on(engine, 'collisionStart', (e: any) => {
        for (const pair of e.pairs) {
          const speed = M.Vector.magnitude(M.Vector.sub(pair.bodyA.velocity, pair.bodyB.velocity));
          for (const body of [pair.bodyA, pair.bodyB]) {
            const pl = body.plugin;
            if (!pl) continue;
            if (pl.kind === 'egg' && !pl.boom) {
              const o = other(pair, body);
              if (!(o.plugin && o.plugin.kind === 'bird')) pl.boom = true;
            }
            if (pl.kind === 'bird' && pl.type === 'black' && !pl.exploded && speed > 4 && !pl.hitAt) pl.hitAt = Date.now();
            if (pl.kind === 'pig') {
              if (pl.balloon && speed > 1.5) popBalloon(body);
              const o = other(pair, body), om = o.isStatic ? 3 : o.mass;
              const force = speed * om;
              let dmg = 0;
              if (force > 16) dmg = 2;
              else if (force > 5) dmg = 1;
              if (o.plugin && (o.plugin.kind === 'bird' || o.plugin.kind === 'egg') && speed > 3) dmg = Math.max(dmg, 1);
              if (dmg > 0) {
                pl.hp -= dmg;
                if (pl.hp <= 0) killPig(body);
              }
            }
            if (pl.kind === 'block') {
              const o = other(pair, body), om = o.isStatic ? 2 : o.mass;
              const force = speed * om;
              let dmg = 0;
              const thr = pl.mat === 'tnt' ? 5 : pl.mat === 'ice' ? 6 : 9;
              if (force > thr * 2.4) dmg = 2;
              else if (force > thr) dmg = 1;
              if (o.plugin && o.plugin.kind === 'bird' && speed > 5) dmg = Math.max(dmg, speed > 11 ? 2 : 1);
              if (dmg > 0) {
                pl.hp -= dmg;
                if (pl.hp <= 0) killBlock(body);
              }
            }
          }
        }
      });
      
      M.Events.on(engine, 'collisionActive', (e: any) => {
        for (const pair of e.pairs) {
          for (const body of [pair.bodyA, pair.bodyB]) {
            const pl = body.plugin;
            if (!pl || pl.kind !== 'pig') continue;
            const o = other(pair, body);
            if (o.plugin && o.plugin.kind === 'block') {
              const nrm = pair.collision.normal;
              const vertical = Math.abs(nrm.y) > 0.6;
              const above = o.position.y < body.position.y - 4 && vertical;
              const moving = Math.abs(o.velocity.y) > 0.8 || Math.abs(o.velocity.x) > 0.8;
              const grinding = M.Vector.magnitude(M.Vector.sub(o.velocity, body.velocity)) > 1.6;
              if (above || grinding) {
                pl.crush += (moving || grinding) ? (o.mass > 4 ? 2 : 1) : (o.mass > 4 ? 1.2 : 0.7);
                if (pl.crush > 30) {
                  pl.hp -= 1;
                  pl.crush = 0;
                  boom(body.position.x, body.position.y - 10, '#C0DD97', 4);
                  addPop(body.position.x, body.position.y - 20, '压扁中…', '#5F5E5A');
                  if (pl.hp <= 0) killPig(body);
                }
              }
            }
          }
        }
      });
      
      function killPig(p: any) {
        const i = pigs.indexOf(p);
        if (i < 0) return;
        pigs.splice(i, 1);
        const k = p.plugin.pigKind;
        const pts = k === 'gold' ? 2000 : k === 'king' ? 5000 : 500;
        boom(p.position.x, p.position.y, k === 'gold' ? '#FAC775' : k === 'king' ? '#AFA9EC' : '#639922', k === 'king' ? 24 : k === 'gold' ? 20 : 12);
        addPop(Math.min(W - 40, Math.max(40, p.position.x)), Math.max(30, p.position.y - 20), '+' + pts, k === 'gold' ? '#854F0B' : k === 'king' ? '#3C3489' : '#3B6D11');
        if (k === 'king') shake = Math.max(shake, 14);
        score += pts;
        const now = Date.now();
        if (now - lastKillTime < 1300) {
          comboN++;
          const bonus = comboN === 2 ? 300 : comboN >= 3 ? 800 : 0;
          if (bonus) {
            score += bonus;
            addPop(W / 2, 70, (comboN === 2 ? '双杀' : comboN + '连杀') + ' +' + bonus, '#993556');
          }
        } else comboN = 1;
        lastKillTime = now;
        M.World.remove(world, p);
        updHud();
      }
      
      function killBlock(b: any) {
        const i = blocks.indexOf(b);
        if (i < 0) return;
        blocks.splice(i, 1);
        M.World.remove(world, b);
        if (b.plugin.mat === 'tnt') {
          shake = Math.max(shake, 12);
          addPop(b.position.x, b.position.y - 20, '轰！', '#A32D2D');
          explode(b.position.x, b.position.y);
        } else if (b.plugin.mat === 'ice') boom(b.position.x, b.position.y, '#B5D4F4', 12, 4);
        else boom(b.position.x, b.position.y, b.plugin.mat === 'stone' ? '#888780' : '#BA7517', 8);
        score += 100;
        updHud();
      }
      
      function explode(x: number, y: number) {
        flashes.push({ x, y, r: 10, life: 14 });
        boom(x, y, '#EF9F27', 22, 6);
        boom(x, y, '#5F5E5A', 14, 4);
        shake = Math.max(shake, 10);
        const R2 = 95;
        for (const arr of [pigs.slice(), blocks.slice()]) {
          for (const b of arr) {
            if (b.plugin.kind === 'pad' || b.plugin.kind === 'plat') continue;
            const d = Math.hypot(b.position.x - x, b.position.y - y);
            if (d > R2 + 20) continue;
            const dmg = d < 50 ? 4 : d < 75 ? 2 : 1;
            if (b.plugin.balloon) popBalloon(b);
            const dir = M.Vector.normalise(M.Vector.sub(b.position, { x, y }));
            M.Body.setVelocity(b, { x: b.velocity.x + dir.x * (12 * (1 - d / (R2 + 20))), y: b.velocity.y + dir.y * (12 * (1 - d / (R2 + 20))) - 2 });
            b.plugin.hp -= dmg;
            if (b.plugin.hp <= 0) {
              if (b.plugin.kind === 'pig') killPig(b);
              else killBlock(b);
            }
          }
        }
      }
      
      function useSkill() {
        if (skillUsed || !activeBirds.length) return;
        const b = activeBirds[0], T = b.plugin.type;
        if (T === 'yellow') {
          let nv = { x: b.velocity.x * 1.9, y: b.velocity.y * 1.9 };
          const sp = Math.hypot(nv.x, nv.y);
          if (sp > VMAX) { nv.x *= VMAX / sp; nv.y *= VMAX / sp; }
          M.Body.setVelocity(b, nv);
          boom(b.position.x, b.position.y, '#FAC775', 8, 2);
          skillUsed = true;
        } else if (T === 'blue') {
          const v = b.velocity, p = b.position;
          M.World.remove(world, b);
          activeBirds = [];
          for (const da of [-0.28, 0, 0.28]) {
            const sp = Math.hypot(v.x, v.y), ang = Math.atan2(v.y, v.x) + da;
            const nb = mkBird('blue', p.x, p.y - (da === 0 ? 0 : da * 30), 9);
            M.Body.setStatic(nb, false);
            M.Body.setVelocity(nb, { x: Math.cos(ang) * sp, y: Math.sin(ang) * sp });
            M.World.add(world, nb);
            activeBirds.push(nb);
          }
          skillUsed = true;
        } else if (T === 'black' && !b.plugin.exploded) {
          b.plugin.exploded = true;
          explode(b.position.x, b.position.y);
          M.World.remove(world, b);
          activeBirds = activeBirds.filter(x => x !== b);
          skillUsed = true;
        } else if (T === 'white' && !b.plugin.eggDropped) {
          b.plugin.eggDropped = true;
          b.collisionFilter.group = -7;
          const egg = M.Bodies.circle(b.position.x, b.position.y + 10, 8, { density: 0.006, restitution: 0, collisionFilter: { group: -7 } });
          egg.plugin = { kind: 'egg', boom: false };
          M.Body.setVelocity(egg, { x: b.velocity.x * 0.35, y: Math.max(7, b.velocity.y + 8) });
          M.World.add(world, egg);
          activeBirds.push(egg);
          M.Body.setVelocity(b, { x: b.velocity.x * 0.55, y: -10 });
          boom(b.position.x, b.position.y, '#F1EFE8', 6, 2);
          skillUsed = true;
        } else if (T === 'green' && !b.plugin.boomeranged) {
          b.plugin.boomeranged = true;
          let nv = { x: -b.velocity.x * 1.5, y: b.velocity.y * 0.4 - 2 };
          const sp = Math.hypot(nv.x, nv.y);
          if (sp > VMAX) { nv.x *= VMAX / sp; nv.y *= VMAX / sp; }
          if (Math.abs(nv.x) < 8) nv.x = nv.x < 0 ? -10 : (b.velocity.x > 0 ? -10 : 10);
          M.Body.setVelocity(b, nv);
          boom(b.position.x, b.position.y, '#97C459', 8, 2);
          addPop(b.position.x, b.position.y - 20, '回旋！', '#3B6D11');
          skillUsed = true;
        }
      }
      
      function showOv(title: string, sub: string, btnText: string, cb: () => void, stars?: string) {
        ended = true;
        (document.getElementById('ovTitle') as HTMLDivElement).textContent = title;
        (document.getElementById('ovStars') as HTMLDivElement).textContent = stars || '';
        (document.getElementById('ovSub') as HTMLDivElement).textContent = sub;
        const btn = document.getElementById('ovBtn') as HTMLButtonElement;
        btn.textContent = btnText;
        btn.onclick = cb;
        (document.getElementById('overlay') as HTMLDivElement).style.display = 'flex';
      }
      
      function levelClear() {
        const rem = birdsLeft + (birdState === 'ready' ? 1 : 0);
        const bonus = rem * 500;
        score += bonus;
        updHud();
        const stars = rem >= 2 ? '★★★' : rem === 1 ? '★★☆' : '★☆☆';
        if (level < 10) showOv('第 ' + level + ' 关通过！', '剩余小鸟奖励 +' + bonus + ' · 当前得分 ' + score, '进入第 ' + (level + 1) + ' 关', () => { level++; loadLevel(level); }, stars);
        else showOv('🎉 十关全通，传奇猎猪人！', '最终得分 ' + score, '重新开始', () => { level = 1; score = 0; loadLevel(level); }, stars);
      }
      
      function levelFail() {
        showOv('小鸟用完了…', '猪猪还剩 ' + pigs.length + ' 只', '重玩本关', () => { score = levelStartScore; loadLevel(level); });
      }
      
      function settleBirds() {
        for (const b of activeBirds) M.World.remove(world, b);
        activeBirds = [];
        bird = null;
        birdState = 'done';
        if (pigs.length === 0) { levelClear(); return; }
        if (birdsLeft > 0) spawnBird();
        else levelFail();
      }
      
      function step() {
        if (!ended) for (let s = 0; s < 3; s++) M.Engine.update(engine, 16.666 / 3);
        for (const b of activeBirds) {
          const sp = M.Vector.magnitude(b.velocity);
          if (sp > VMAX) M.Body.setVelocity(b, { x: b.velocity.x * VMAX / sp, y: b.velocity.y * VMAX / sp });
        }
        for (const p of pigs) {
          if (p.plugin.crush > 0) p.plugin.crush -= 0.3;
          if (p.plugin.balloon) {
            M.Body.applyForce(p, p.position, { x: 0, y: -p.mass * 0.00115 });
            if (p.position.y < 70 && p.velocity.y < 0) M.Body.setVelocity(p, { x: p.velocity.x, y: 0 });
          }
        }
        for (const p of pigs.slice()) {
          const r = p.plugin.r;
          if (p.position.y > H + 40 || p.position.x < -r + 2 || p.position.x > W + r - 2) {
            addPop(Math.min(W - 40, Math.max(40, p.position.x)), Math.min(H - 40, Math.max(40, p.position.y)), '飞出场外！', '#0C447C');
            killPig(p);
          }
        }
        for (const b of blocks.slice()) if (b.plugin.kind === 'block' && (b.position.y > H + 60 || b.position.x < -25 || b.position.x > W + 25)) killBlock(b);
        if (!ended && pigs.length === 0 && birdState !== 'flying') { levelClear(); }
        if (birdState === 'flying' && !ended) {
          const now = Date.now();
          activeBirds = activeBirds.filter(b => {
            if (b.plugin.kind === 'egg') {
              if (b.plugin.boom) { explode(b.position.x, b.position.y); M.World.remove(world, b); return false; }
              if (b.position.y > H + 30) { M.World.remove(world, b); return false; }
              return true;
            }
            if (b.plugin.type === 'black' && !b.plugin.exploded && b.plugin.hitAt && now - b.plugin.hitAt > 900) {
              b.plugin.exploded = true; explode(b.position.x, b.position.y); M.World.remove(world, b); return false;
            }
            if (b.position.x > W + 40 || b.position.x < -40 || b.position.y > H + 40) { M.World.remove(world, b); return false; }
            return true;
          });
          let maxSp = 0;
          for (const b of activeBirds) maxSp = Math.max(maxSp, M.Vector.magnitude(b.velocity));
          if (activeBirds.length && maxSp < 0.25) stillFrames++;
          else stillFrames = 0;
          if (!activeBirds.length || stillFrames > 50 || now - launchTime > 9000) settleBirds();
        }
        particles = particles.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.18; return --p.life > 0; });
        flashes = flashes.filter(f => { f.r += 7; return --f.life > 0; });
        pops = pops.filter(p => { p.y -= 0.8; return --p.life > 0; });
        if (shake > 0) shake *= 0.85;
        if (shake < 0.3) shake = 0;
      }
      
      function drawBirdShape(x: number, y: number, angle: number, type: string, r: number) {
        if (type === 'egg') {
          ctx.save();
          ctx.translate(x, y);
          ctx.beginPath();
          ctx.ellipse(0, 0, 7, 9, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#F1EFE8';
          ctx.fill();
          ctx.strokeStyle = '#5F5E5A';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          return;
        }
        const T = TYPES[type as keyof typeof TYPES];
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle || 0);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = T.color;
        ctx.fill();
        ctx.strokeStyle = T.dark;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#FAC775';
        if (type === 'green') {
          ctx.beginPath();
          ctx.moveTo(r - 2, -3);
          ctx.lineTo(r + 13, 1);
          ctx.lineTo(r - 2, 6);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(r - 1, -2);
          ctx.lineTo(r + 8, 2);
          ctx.lineTo(r - 1, 6);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = type === 'white' ? '#B4B2A9' : '#fff';
        ctx.beginPath();
        ctx.arc(r * 0.3, -r * 0.35, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(r * 0.36, -r * 0.35, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = T.dark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-2, -r + 2);
        ctx.lineTo(2, -r - 5);
        ctx.moveTo(2, -r + 2);
        ctx.lineTo(6, -r - 4);
        ctx.stroke();
        if (type === 'black') {
          ctx.strokeStyle = '#EF9F27';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, -r - 5);
          ctx.lineTo(3, -r - 9);
          ctx.stroke();
        }
        ctx.restore();
      }
      
      function drawPig(p: any) {
        const pl = p.plugin, k = pl.pigKind, r = pl.r;
        const ratio = pl.hp / pl.maxHp;
        const scared = (pl.hp <= 1 && pl.maxHp > 1) || ratio <= 0.34;
        const worried = !scared && ratio < 1;
        const jx = scared ? (Math.random() - 0.5) * 1.6 : 0, jy = scared ? (Math.random() - 0.5) * 1.6 : 0;
        ctx.save();
        ctx.translate(p.position.x + jx, p.position.y + jy);
        ctx.rotate(p.angle);
        if (pl.balloon) {
          ctx.strokeStyle = '#888';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, -r);
          ctx.lineTo(0, -r - 26);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(0, -r - 40, 12, 15, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#E24B4A';
          ctx.fill();
          ctx.strokeStyle = '#791F1F';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        const sc = r / 16;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = k === 'gold' ? '#FAC775' : k === 'king' ? '#AFA9EC' : '#97C459';
        ctx.fill();
        ctx.strokeStyle = k === 'gold' ? '#854F0B' : k === 'king' ? '#3C3489' : '#3B6D11';
        ctx.lineWidth = 2;
        ctx.stroke();
        const dk = k === 'gold' ? '#854F0B' : k === 'king' ? '#3C3489' : '#3B6D11';
        const lt = k === 'gold' ? '#FAEEDA' : k === 'king' ? '#EEEDFE' : '#C0DD97';
        ctx.fillStyle = lt;
        ctx.beginPath();
        ctx.ellipse(0, 2 * sc, 7 * sc, 5 * sc, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = dk;
        ctx.beginPath();
        ctx.arc(-3 * sc, 2 * sc, 1.5 * sc, 0, Math.PI * 2);
        ctx.arc(3 * sc, 2 * sc, 1.5 * sc, 0, Math.PI * 2);
        ctx.fill();
        const er = scared ? 3.6 : 2.5;
        ctx.beginPath();
        ctx.arc(-7 * sc, -6 * sc, er * sc, 0, Math.PI * 2);
        ctx.arc(7 * sc, -6 * sc, er * sc, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        if (scared) {
          ctx.strokeStyle = dk;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(-7 * sc, -6 * sc, er * sc, 0, Math.PI * 2);
          ctx.arc(7 * sc, -6 * sc, er * sc, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#222';
        const pr = scared ? 1 : 1.2;
        ctx.beginPath();
        ctx.arc(-7 * sc, (scared ? -7.5 : -6) * sc, pr * sc, 0, Math.PI * 2);
        ctx.arc(7 * sc, (scared ? -7.5 : -6) * sc, pr * sc, 0, Math.PI * 2);
        ctx.fill();
        if (scared) {
          ctx.fillStyle = '#222';
          ctx.beginPath();
          ctx.ellipse(0, 9 * sc, 3.5 * sc, 4.5 * sc, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#378ADD';
          ctx.beginPath();
          ctx.ellipse(12 * sc, -10 * sc, 2 * sc, 3 * sc, 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = dk;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-12 * sc, -12 * sc);
          ctx.lineTo(-5 * sc, -10 * sc);
          ctx.moveTo(5 * sc, -10 * sc);
          ctx.lineTo(12 * sc, -12 * sc);
          ctx.stroke();
        } else if (worried) {
          ctx.strokeStyle = dk;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-12 * sc, -10 * sc);
          ctx.lineTo(-6 * sc, -13 * sc);
          ctx.moveTo(6 * sc, -13 * sc);
          ctx.lineTo(12 * sc, -10 * sc);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 11 * sc, 3 * sc, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
        } else {
          ctx.strokeStyle = dk;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 8 * sc, 3.5 * sc, Math.PI * 0.15, Math.PI * 0.85);
          ctx.stroke();
        }
        if (k === 'helmet') {
          ctx.beginPath();
          ctx.arc(0, -4 * sc, 17 * sc, Math.PI * 1.05, Math.PI * 1.95);
          ctx.strokeStyle = '#5F5E5A';
          ctx.lineWidth = 5;
          ctx.stroke();
        }
        if (k === 'king') {
          ctx.fillStyle = '#EF9F27';
          ctx.beginPath();
          ctx.moveTo(-12, -r - 2);
          ctx.lineTo(-12, -r - 14);
          ctx.lineTo(-6, -r - 7);
          ctx.lineTo(0, -r - 16);
          ctx.lineTo(6, -r - 7);
          ctx.lineTo(12, -r - 14);
          ctx.lineTo(12, -r - 2);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#854F0B';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        if (k === 'gold') {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(-11, -11, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      
      function draw() {
        ctx.save();
        if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        ctx.fillStyle = '#cfe8f5';
        ctx.fillRect(-20, -20, W + 400, H + 400);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(180, 70, 22, 0, Math.PI * 2);
        ctx.arc(210, 62, 28, 0, Math.PI * 2);
        ctx.arc(245, 72, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(480, 50, 18, 0, Math.PI * 2);
        ctx.arc(505, 44, 24, 0, Math.PI * 2);
        ctx.arc(532, 52, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8fbf6a';
        ctx.fillRect(-20, G, W + 400, H - G + 20);
        ctx.fillStyle = '#7aa856';
        ctx.fillRect(-20, G, W + 400, 6);
        ctx.strokeStyle = '#6b4a2b';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(SX - 12, G);
        ctx.lineTo(SX - 12, SY + 8);
        ctx.moveTo(SX + 12, G);
        ctx.lineTo(SX + 12, SY + 8);
        ctx.stroke();
        if (bird && (birdState === 'ready' || birdState === 'dragging')) {
          const bp = birdState === 'dragging' ? dragPos : { x: SX, y: SY };
          ctx.strokeStyle = '#5a3a20';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(SX - 12, SY + 6);
          ctx.lineTo(bp.x, bp.y);
          ctx.lineTo(SX + 12, SY + 6);
          ctx.stroke();
        }
        for (const b of blocks) {
          const pl = b.plugin;
          ctx.save();
          ctx.translate(b.position.x, b.position.y);
          ctx.rotate(b.angle);
          if (pl.kind === 'pad') {
            ctx.fillStyle = '#5DCAA5';
            ctx.fillRect(-pl.w / 2, -pl.h / 2, pl.w, pl.h);
            ctx.strokeStyle = '#0F6E56';
            ctx.lineWidth = 2;
            ctx.strokeRect(-pl.w / 2, -pl.h / 2, pl.w, pl.h);
            ctx.strokeStyle = '#0F6E56';
            ctx.lineWidth = 1.5;
            for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 12 - 4, pl.h / 2); ctx.lineTo(i * 12 + 4, -pl.h / 2); ctx.stroke(); }
          } else if (pl.kind === 'plat') {
            ctx.fillStyle = '#5F5E5A';
            ctx.fillRect(-pl.w / 2, -pl.h / 2, pl.w, pl.h);
            ctx.strokeStyle = '#2C2C2A';
            ctx.lineWidth = 2;
            ctx.strokeRect(-pl.w / 2, -pl.h / 2, pl.w, pl.h);
            ctx.fillStyle = '#888780';
            if (pl.w > pl.h) { for (let i = -pl.w / 2 + 6; i < pl.w / 2 - 4; i += 16) ctx.fillRect(i, -2, 8, 4); }
            else { for (let i = -pl.h / 2 + 6; i < pl.h / 2 - 4; i += 16) ctx.fillRect(-2, i, 4, 8); }
          } else if (pl.mat === 'tnt') {
            ctx.fillStyle = '#D85A30';
            ctx.fillRect(-13, -13, 26, 26);
            ctx.strokeStyle = '#712B13';
            ctx.lineWidth = 2;
            ctx.strokeRect(-13, -13, 26, 26);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('TNT', 0, 4);
          } else {
            ctx.fillStyle = pl.mat === 'stone' ? '#B4B2A9' : pl.mat === 'ice' ? 'rgba(181,212,244,0.85)' : '#E0A95E';
            ctx.fillRect(-pl.w / 2, -pl.h / 2, pl.w, pl.h);
            ctx.strokeStyle = pl.mat === 'stone' ? '#5F5E5A' : pl.mat === 'ice' ? '#185FA5' : '#8a5a28';
            ctx.lineWidth = 2;
            ctx.strokeRect(-pl.w / 2, -pl.h / 2, pl.w, pl.h);
            if (pl.mat === 'ice') {
              ctx.strokeStyle = 'rgba(255,255,255,0.7)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(-pl.w / 4, -pl.h / 3);
              ctx.lineTo(pl.w / 5, pl.h / 4);
              ctx.stroke();
            }
            if (pl.hp < pl.maxHp) {
              const dr = 1 - pl.hp / pl.maxHp;
              ctx.strokeStyle = `rgba(0,0,0,${0.25 + dr * 0.3})`;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(-pl.w / 4, -pl.h / 3);
              ctx.lineTo(pl.w / 5, 0);
              ctx.lineTo(-pl.w / 6, pl.h / 4);
              if (dr > 0.5) { ctx.moveTo(pl.w / 4, -pl.h / 4); ctx.lineTo(-pl.w / 8, pl.h / 8); }
              ctx.stroke();
            }
          }
          ctx.restore();
        }
        for (const p of pigs) drawPig(p);
        if (birdState === 'dragging') {
          let vx = (SX - dragPos.x) * K, vy = (SY - dragPos.y) * K, px = dragPos.x, py = dragPos.y;
          for (let i = 0; i < 40; i++) { vy += 0.28; px += vx; py += vy;
            if (i % 2 === 0) { ctx.globalAlpha = Math.max(0.1, 0.55 - i * 0.012);
              ctx.beginPath(); ctx.arc(px, py, 3.2, 0, Math.PI * 2); ctx.fillStyle = '#222'; ctx.fill(); ctx.globalAlpha = 1; }
            if (py > G) break;
          }
          const pw = Math.round(Math.hypot(SX - dragPos.x, SY - dragPos.y) / MAXR * 100);
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('力度 ' + pw + '%', dragPos.x, dragPos.y + 34);
        }
        if (bird && birdState !== 'flying') {
          const bp = birdState === 'dragging' ? dragPos : { x: SX, y: SY };
          drawBirdShape(bp.x, bp.y, 0, bird.plugin.type, TYPES[bird.plugin.type as keyof typeof TYPES].r);
        }
        for (const b of activeBirds) drawBirdShape(b.position.x, b.position.y, b.angle, b.plugin.kind === 'egg' ? 'egg' : b.plugin.type, b.circleRadius || b.plugin.kind === 'egg' ? 8 : TYPES[b.plugin.type as keyof typeof TYPES].r);
        for (let i = 0; i < birdsLeft; i++) {
          ctx.beginPath();
          ctx.arc(34 + i * 26, G - 12, 10, 0, Math.PI * 2);
          ctx.fillStyle = TYPES[selType as keyof typeof TYPES].color;
          ctx.fill();
          ctx.strokeStyle = TYPES[selType as keyof typeof TYPES].dark;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        for (const f of flashes) { ctx.globalAlpha = f.life / 14;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.strokeStyle = '#EF9F27'; ctx.lineWidth = 5; ctx.stroke(); ctx.globalAlpha = 1; }
        for (const p of particles) { ctx.globalAlpha = p.life / 24; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); ctx.globalAlpha = 1; }
        for (const p of pops) { ctx.globalAlpha = Math.min(1, p.life / 25);
          ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
          ctx.fillStyle = p.col; ctx.fillText(p.txt, p.x, p.y); ctx.globalAlpha = 1; }
        ctx.restore();
      }
      
      function loop() {
        step();
        draw();
        requestAnimationFrame(loop);
      }
      
      function pos(e: any) {
        const r = cv.getBoundingClientRect(), s = W / r.width, t = e.touches ? e.touches[0] : e;
        return { x: (t.clientX - r.left) * s, y: (t.clientY - r.top) * s };
      }
      
      function down(e: any) {
        if (ended) return;
        if (birdState === 'flying') { useSkill(); e.preventDefault(); return; }
        if (!bird) return;
        const p = pos(e);
        dragging = true;
        birdState = 'dragging';
        dragPos = { x: p.x, y: p.y };
        clampDrag();
        e.preventDefault();
      }
      
      function move(e: any) {
        if (!dragging) return;
        const p = pos(e);
        dragPos = { x: p.x, y: p.y };
        clampDrag();
        e.preventDefault();
      }
      
      function clampDrag() {
        let dx = dragPos.x - SX, dy = dragPos.y - SY;
        const d = Math.hypot(dx, dy);
        if (d > MAXR) { dragPos.x = SX + dx / d * MAXR; dragPos.y = SY + dy / d * MAXR; }
        if (dragPos.x > SX + 30) dragPos.x = SX + 30;
      }
      
      function up(e: any) {
        if (!dragging) return;
        dragging = false;
        const dx = SX - dragPos.x, dy = SY - dragPos.y;
        if (Math.hypot(dx, dy) < 14) { birdState = 'ready'; return; }
        M.Body.setPosition(bird, dragPos);
        M.Body.setStatic(bird, false);
        M.Body.setVelocity(bird, { x: dx * K, y: dy * K });
        boom(dragPos.x, dragPos.y, '#fff', 5, 2);
        activeBirds = [bird];
        birdState = 'flying';
        launchTime = Date.now();
        stillFrames = 0;
        updHud();
        renderSel();
        if (e) e.preventDefault();
      }
      
      cv.addEventListener('mousedown', down);
      cv.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      cv.addEventListener('touchstart', down, { passive: false });
      cv.addEventListener('touchmove', move, { passive: false });
      cv.addEventListener('touchend', up, { passive: false });
      
      function bindSlider(id: string, vid: string, key: string) {
        const s = document.getElementById(id) as HTMLInputElement;
        const v = document.getElementById(vid) as HTMLSpanElement;
        s.addEventListener('input', () => { v.textContent = s.value; cfg[key as keyof typeof cfg] = parseInt(s.value); });
      }
      
      bindSlider('pigHp', 'pigHpV', 'pig');
      bindSlider('woodHp', 'woodHpV', 'wood');
      bindSlider('stoneHp', 'stoneHpV', 'stone');
      (document.getElementById('retryBtn') as HTMLButtonElement).addEventListener('click', () => { score = levelStartScore; loadLevel(level); });
      
      renderSel();
      loadLevel(1);
      loop();
    }
  }, []);
  
  return <div ref={containerRef} />;
}
