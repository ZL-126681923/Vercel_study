import type PhaserType from 'phaser';
import type { CanvasGameHandle } from '@/components/games/canvas/CanvasGameRuntime';

export type BirdType = 'red' | 'yellow' | 'blue' | 'black';
type PigType = 'rookie' | 'scout' | 'builder' | 'captain' | 'miner' | 'chef' | 'knight' | 'wizard' | 'general' | 'king';
export type BirdGameStatus = 'playing' | 'levelComplete' | 'failed' | 'won';

export type BirdGameHud = {
  level: number;
  score: number;
  birds: number;
  pigs: number;
  selectedBird: BirdType;
  queue: BirdType[];
  status: BirdGameStatus;
};

export type BirdGameControls = {
  selectBird: (type: BirdType) => void;
  restartLevel: () => void;
  nextLevel: () => void;
};

type CreateBirdSiegeOptions = {
  onHud: (hud: BirdGameHud) => void;
  controls: BirdGameControls;
};

type Material = 'wood' | 'stone' | 'glass' | 'tnt';
type BlockConfig = [number, number, number, number, Material];
type LevelConfig = {
  pigType: PigType;
  birds: BirdType[];
  pigs: Array<[number, number]>;
  blocks: BlockConfig[];
};

type MatterImage = PhaserType.Physics.Matter.Image;
type TaggedImage = MatterImage & {
  gameTag?: 'bird' | 'pig' | 'block';
  hp?: number;
  material?: Material;
  birdType?: BirdType;
};
type LoadedBird = PhaserType.GameObjects.Image & { birdType: BirdType };
type ShotState = 'ready' | 'aiming' | 'flying' | 'failed';

const WIDTH = 960;
const HEIGHT = 540;
const GROUND_Y = 475;
const SLING_X = 155;
const SLING_Y = 390;
const MAX_PULL = 108;
const DEFAULT_PULL_X = SLING_X - 96;
const DEFAULT_PULL_Y = SLING_Y + 40;
const SHOT_POWER = 0.2;

const BIRD_MASS: Record<BirdType, number> = {
  red: 5.2,
  yellow: 4.4,
  blue: 3,
  black: 8.5,
};

const MATERIAL_PHYSICS: Record<Material, {
  density: number;
  friction: number;
  frictionAir: number;
  frictionStatic: number;
  bounce: number;
  hitResponse: number;
  hp: number;
}> = {
  wood: { density: 0.00115, friction: 0.38, frictionAir: 0.004, frictionStatic: 0.48, bounce: 0.08, hitResponse: 1, hp: 4 },
  stone: { density: 0.0034, friction: 0.58, frictionAir: 0.006, frictionStatic: 0.72, bounce: 0.025, hitResponse: 0.38, hp: 7 },
  glass: { density: 0.00072, friction: 0.2, frictionAir: 0.002, frictionStatic: 0.18, bounce: 0.2, hitResponse: 1.35, hp: 2 },
  tnt: { density: 0.00095, friction: 0.34, frictionAir: 0.003, frictionStatic: 0.4, bounce: 0.1, hitResponse: 1.15, hp: 1 },
};


const PIG_STYLES: Record<PigType, {
  fill: number;
  snout: number;
  outline: number;
  hp: number;
}> = {
  rookie: { fill: 0x84cc16, snout: 0xb7ef60, outline: 0x365314, hp: 1 },
  scout: { fill: 0x65a30d, snout: 0xa3e635, outline: 0x365314, hp: 1 },
  builder: { fill: 0xa3e635, snout: 0xd9f99d, outline: 0x4d7c0f, hp: 1 },
  captain: { fill: 0x4d7c0f, snout: 0x84cc16, outline: 0x1a2e05, hp: 2 },
  miner: { fill: 0x22c55e, snout: 0x86efac, outline: 0x14532d, hp: 2 },
  chef: { fill: 0x86efac, snout: 0xbbf7d0, outline: 0x166534, hp: 2 },
  knight: { fill: 0x6b8e23, snout: 0xa3e635, outline: 0x334155, hp: 2 },
  wizard: { fill: 0x14b8a6, snout: 0x5eead4, outline: 0x134e4a, hp: 2 },
  general: { fill: 0x15803d, snout: 0x4ade80, outline: 0x052e16, hp: 3 },
  king: { fill: 0x65a30d, snout: 0xa3e635, outline: 0x713f12, hp: 3 },
};
const LEVELS: LevelConfig[] = [
  { pigType: 'rookie', birds: ['red', 'yellow', 'blue', 'red', 'black'], pigs: [[735, 430], [735, 342]], blocks: [[680, 420, 18, 100, 'wood'], [790, 420, 18, 100, 'wood'], [735, 360, 145, 18, 'wood']] },
  { pigType: 'scout', birds: ['yellow', 'red', 'blue', 'black', 'red'], pigs: [[720, 430], [810, 430], [765, 320]], blocks: [[665, 415, 20, 110, 'stone'], [765, 415, 20, 110, 'wood'], [855, 415, 20, 110, 'stone'], [760, 350, 210, 18, 'wood']] },
  { pigType: 'builder', birds: ['blue', 'yellow', 'red', 'blue', 'black', 'red'], pigs: [[650, 430], [785, 430], [718, 300]], blocks: [[605, 415, 18, 110, 'glass'], [695, 415, 18, 110, 'glass'], [650, 352, 125, 18, 'wood'], [740, 415, 18, 110, 'stone'], [830, 415, 18, 110, 'stone'], [785, 352, 125, 18, 'wood'], [718, 322, 285, 18, 'stone']] },
  { pigType: 'captain', birds: ['black', 'red', 'yellow', 'blue', 'red', 'black'], pigs: [[680, 430], [805, 430], [742, 286]], blocks: [[625, 420, 18, 100, 'stone'], [735, 420, 18, 100, 'stone'], [680, 360, 145, 18, 'wood'], [750, 420, 18, 100, 'wood'], [860, 420, 18, 100, 'wood'], [805, 360, 145, 18, 'stone'], [742, 308, 290, 18, 'wood'], [590, 438, 34, 34, 'tnt']] },
  { pigType: 'miner', birds: ['red', 'blue', 'yellow', 'black', 'blue', 'red'], pigs: [[675, 430], [780, 430], [728, 320], [865, 430]], blocks: [[620, 415, 20, 110, 'stone'], [730, 415, 20, 110, 'glass'], [675, 350, 145, 18, 'wood'], [730, 285, 18, 110, 'wood'], [790, 285, 18, 110, 'wood'], [760, 220, 105, 18, 'stone'], [835, 415, 20, 110, 'stone'], [895, 415, 20, 110, 'stone']] },
  { pigType: 'chef', birds: ['yellow', 'black', 'blue', 'red', 'yellow', 'blue', 'black'], pigs: [[620, 430], [740, 430], [860, 430], [740, 270]], blocks: [[570, 415, 18, 110, 'glass'], [670, 415, 18, 110, 'glass'], [620, 350, 140, 18, 'glass'], [690, 415, 18, 110, 'stone'], [790, 415, 18, 110, 'stone'], [740, 350, 140, 18, 'stone'], [810, 415, 18, 110, 'wood'], [910, 415, 18, 110, 'wood'], [860, 350, 140, 18, 'wood'], [740, 292, 300, 18, 'stone']] },
  { pigType: 'knight', birds: ['black', 'blue', 'red', 'yellow', 'black', 'blue', 'red'], pigs: [[650, 430], [780, 430], [715, 292], [875, 300]], blocks: [[590, 415, 20, 110, 'stone'], [710, 415, 20, 110, 'stone'], [650, 350, 160, 18, 'wood'], [720, 415, 20, 110, 'glass'], [840, 415, 20, 110, 'glass'], [780, 350, 160, 18, 'stone'], [715, 315, 300, 18, 'wood'], [875, 332, 80, 18, 'wood'], [875, 438, 34, 34, 'tnt']] },
  { pigType: 'wizard', birds: ['blue', 'yellow', 'black', 'red', 'blue', 'yellow', 'black', 'red'], pigs: [[610, 430], [735, 430], [860, 430], [672, 282], [798, 282]], blocks: [[555, 415, 18, 110, 'stone'], [665, 415, 18, 110, 'stone'], [610, 350, 145, 18, 'stone'], [680, 415, 18, 110, 'wood'], [790, 415, 18, 110, 'wood'], [735, 350, 145, 18, 'wood'], [805, 415, 18, 110, 'glass'], [915, 415, 18, 110, 'glass'], [860, 350, 145, 18, 'glass'], [735, 305, 395, 18, 'stone']] },
  { pigType: 'general', birds: ['red', 'yellow', 'blue', 'black', 'red', 'yellow', 'blue', 'black'], pigs: [[590, 430], [705, 430], [820, 430], [648, 286], [763, 286]], blocks: [[540, 415, 18, 110, 'glass'], [640, 415, 18, 110, 'glass'], [590, 350, 135, 18, 'wood'], [655, 415, 18, 110, 'stone'], [755, 415, 18, 110, 'stone'], [705, 350, 135, 18, 'stone'], [770, 415, 18, 110, 'wood'], [870, 415, 18, 110, 'wood'], [820, 350, 135, 18, 'wood'], [705, 308, 360, 18, 'stone'], [900, 438, 34, 34, 'tnt']] },
  { pigType: 'king', birds: ['black', 'blue', 'yellow', 'red', 'black', 'blue', 'yellow', 'red'], pigs: [[600, 430], [725, 430], [850, 430], [662, 282], [788, 282], [725, 190]], blocks: [[545, 415, 20, 110, 'stone'], [655, 415, 20, 110, 'stone'], [600, 350, 150, 18, 'stone'], [670, 415, 20, 110, 'wood'], [780, 415, 20, 110, 'wood'], [725, 350, 150, 18, 'wood'], [795, 415, 20, 110, 'glass'], [905, 415, 20, 110, 'glass'], [850, 350, 150, 18, 'glass'], [725, 305, 410, 18, 'stone'], [665, 250, 18, 95, 'wood'], [785, 250, 18, 95, 'wood'], [725, 195, 160, 18, 'stone'], [530, 438, 34, 34, 'tnt'], [920, 438, 34, 34, 'tnt']] },
];

export async function createBirdSiegeGame(
  parent: HTMLDivElement,
  options: CreateBirdSiegeOptions,
  signal: AbortSignal,
): Promise<CanvasGameHandle> {
  const phaserModule = await import('phaser');
  if (signal.aborted) throw new DOMException('Game creation aborted', 'AbortError');

  const Phaser = (phaserModule.default ?? phaserModule) as typeof PhaserType;
  const selected = { value: 'red' as BirdType };

  class BirdSiegeScene extends Phaser.Scene {
    private level = 1;
    private score = 0;
    private levelStartScore = 0;
    private status: BirdGameStatus = 'playing';
    private shotState: ShotState = 'ready';
    private birdQueue: BirdType[] = [];
    private loadedBird: LoadedBird | null = null;
    private flyingBird: TaggedImage | null = null;
    private queueSprites: PhaserType.GameObjects.Image[] = [];
    private pigs: TaggedImage[] = [];
    private blocks: TaggedImage[] = [];
    private guide!: PhaserType.GameObjects.Graphics;
    private activePointerId: number | null = null;
    private launchedAt = 0;
    private slowSince = 0;
    private skillUsed = false;
    private birdBlockImpacts = 0;
    private initialBlockPose = new Map<TaggedImage, { x: number; y: number; angle: number }>();

    constructor() {
      super('bird-siege-v2');
    }

    init(data: { level?: number; score?: number }) {
      this.level = data.level ?? 1;
      this.score = data.score ?? 0;
      this.levelStartScore = this.score;
      this.status = 'playing';
      this.shotState = 'ready';
      this.activePointerId = null;
      this.birdBlockImpacts = 0;
    }

    create() {
      this.createTextures();
      this.createBackdrop();
      this.guide = this.add.graphics().setDepth(8);
      this.matter.world.setBounds(-100, -140, WIDTH + 200, HEIGHT + 220, 64, true, true, false, true);
      this.createLevel();
      this.bindPointerInput();

      const matterWorld = this.matter.world;
      matterWorld.on('collisionstart', this.handleCollision, this);
      this.events.once('shutdown', () => {
        this.unbindPointerInput();
        matterWorld.off('collisionstart', this.handleCollision, this);
      });
    }

    private createTextures() {
      const makeBirdTexture = (
        key: string,
        draw: (graphics: PhaserType.GameObjects.Graphics) => void,
      ) => {
        if (this.textures.exists(key)) return;
        const graphics = this.add.graphics();
        draw(graphics);
        graphics.generateTexture(key, 64, 60);
        graphics.destroy();
      };

      makeBirdTexture('bird-red', (g) => {
        g.fillStyle(0x7f1d1d)
          .fillTriangle(9, 31, 1, 22, 5, 37)
          .fillTriangle(12, 37, 2, 34, 8, 45);
        g.fillStyle(0xdc2626).fillCircle(29, 32, 23);
        g.lineStyle(3, 0x7f1d1d, 0.9).strokeCircle(29, 32, 22);
        g.fillStyle(0xfca5a5, 0.72).fillCircle(30, 41, 13);
        g.fillStyle(0x991b1b)
          .fillTriangle(21, 10, 22, 0, 29, 10)
          .fillTriangle(28, 9, 34, 1, 35, 13);
        g.fillStyle(0xffffff).fillCircle(24, 27, 7).fillCircle(37, 27, 7);
        g.fillStyle(0x111827).fillCircle(26, 28, 3).fillCircle(39, 28, 3);
        g.lineStyle(3, 0x4c0519, 1).lineBetween(17, 20, 28, 24).lineBetween(43, 20, 33, 24);
        g.fillStyle(0xf59e0b).fillTriangle(47, 30, 63, 35, 47, 40);
      });

      makeBirdTexture('bird-yellow', (g) => {
        g.fillStyle(0x854d0e).fillTriangle(5, 53, 32, 2, 59, 53);
        g.fillStyle(0xfacc15).fillTriangle(9, 50, 32, 7, 55, 50);
        g.fillStyle(0xfef08a, 0.76).fillTriangle(18, 48, 32, 29, 46, 48);
        g.fillStyle(0xeab308)
          .fillTriangle(26, 10, 27, 0, 32, 8)
          .fillTriangle(32, 9, 39, 1, 37, 13);
        g.fillStyle(0xffffff).fillCircle(27, 29, 7).fillCircle(39, 29, 7);
        g.fillStyle(0x111827).fillCircle(29, 30, 3).fillCircle(41, 30, 3);
        g.lineStyle(3, 0x713f12, 1).lineBetween(21, 22, 31, 26).lineBetween(45, 23, 36, 26);
        g.fillStyle(0xf97316).fillTriangle(48, 32, 63, 36, 48, 41);
        g.fillStyle(0x713f12).fillTriangle(10, 39, 0, 33, 8, 46);
      });

      makeBirdTexture('bird-blue', (g) => {
        g.fillStyle(0x075985)
          .fillTriangle(10, 31, 1, 25, 6, 39)
          .fillTriangle(14, 37, 3, 36, 10, 45);
        g.fillStyle(0x38bdf8).fillCircle(29, 33, 20);
        g.lineStyle(3, 0x075985, 0.9).strokeCircle(29, 33, 19);
        g.fillStyle(0xbae6fd, 0.8).fillCircle(30, 41, 11);
        g.fillStyle(0x0284c7)
          .fillTriangle(23, 15, 22, 5, 29, 14)
          .fillTriangle(29, 14, 35, 6, 35, 17);
        g.fillStyle(0xffffff).fillCircle(25, 29, 6).fillCircle(36, 29, 6);
        g.fillStyle(0x0f172a).fillCircle(27, 30, 2.5).fillCircle(38, 30, 2.5);
        g.lineStyle(2, 0x0c4a6e, 1).lineBetween(20, 24, 29, 26).lineBetween(41, 24, 33, 26);
        g.fillStyle(0xfbbf24).fillTriangle(44, 32, 58, 36, 44, 40);
      });

      makeBirdTexture('bird-black', (g) => {
        g.fillStyle(0x18181b).fillCircle(30, 33, 24);
        g.lineStyle(3, 0x09090b, 0.95).strokeCircle(30, 33, 23);
        g.fillStyle(0x52525b, 0.75).fillCircle(24, 24, 11);
        g.fillStyle(0xa1a1aa, 0.55).fillCircle(31, 43, 13);
        g.lineStyle(4, 0x713f12, 1).lineBetween(30, 10, 35, 2);
        g.fillStyle(0xf97316).fillCircle(37, 2, 4);
        g.fillStyle(0xffffff).fillCircle(26, 29, 7).fillCircle(39, 29, 7);
        g.fillStyle(0x09090b).fillCircle(28, 30, 3).fillCircle(41, 30, 3);
        g.lineStyle(3, 0x09090b, 1).lineBetween(19, 21, 30, 25).lineBetween(46, 21, 36, 25);
        g.fillStyle(0xf59e0b).fillTriangle(49, 32, 63, 37, 49, 42);
      });

      const pigTypes = Object.keys(PIG_STYLES) as PigType[];
      for (const type of pigTypes) {
        const key = 'pig-' + type;
        if (this.textures.exists(key)) continue;
        const style = PIG_STYLES[type];
        const g = this.add.graphics();

        g.fillStyle(style.fill).fillCircle(17, 18, 8).fillCircle(45, 18, 8).fillCircle(31, 34, 23);
        g.lineStyle(3, style.outline, 0.85).strokeCircle(31, 34, 22);
        g.fillStyle(style.snout).fillCircle(31, 40, 10);
        g.fillStyle(style.outline).fillCircle(27, 40, 2.3).fillCircle(35, 40, 2.3);
        g.fillStyle(0xffffff).fillCircle(23, 31, 6).fillCircle(39, 31, 6);
        g.fillStyle(0x111827).fillCircle(24, 32, 2.5).fillCircle(40, 32, 2.5);

        if (type === 'rookie') {
          g.lineStyle(3, 0x365314, 1).lineBetween(27, 12, 24, 4).lineBetween(31, 12, 31, 2).lineBetween(35, 12, 39, 4);
        } else if (type === 'scout') {
          g.fillStyle(0xef4444).fillRect(10, 15, 43, 7).fillTriangle(50, 19, 62, 14, 56, 28);
        } else if (type === 'builder') {
          g.fillStyle(0xfacc15).fillCircle(31, 16, 18).fillRect(10, 15, 43, 7);
          g.lineStyle(3, 0x92400e, 0.85).lineBetween(31, 2, 31, 18);
        } else if (type === 'captain') {
          g.fillStyle(0x0f172a).fillCircle(39, 31, 7).fillRect(24, 28, 22, 4);
          g.lineStyle(3, 0x713f12, 1).lineBetween(22, 48, 29, 44).lineBetween(40, 48, 33, 44);
        } else if (type === 'miner') {
          g.fillStyle(0x475569).fillCircle(31, 16, 18).fillRect(11, 16, 41, 7);
          g.fillStyle(0xfef08a).fillCircle(31, 9, 7);
          g.lineStyle(2, 0xf59e0b, 1).strokeCircle(31, 9, 7);
        } else if (type === 'chef') {
          g.fillStyle(0xffffff).fillCircle(20, 11, 10).fillCircle(31, 7, 12).fillCircle(43, 11, 10).fillRect(17, 11, 29, 12);
          g.lineStyle(2, 0xcbd5e1, 1).lineBetween(18, 21, 46, 21);
        } else if (type === 'knight') {
          g.fillStyle(0x94a3b8).fillCircle(31, 18, 20).fillRect(10, 15, 42, 15);
          g.fillStyle(0x334155).fillRect(17, 23, 29, 5);
          g.fillStyle(0xef4444).fillTriangle(28, 3, 34, 3, 31, 14);
        } else if (type === 'wizard') {
          g.fillStyle(0x6d28d9).fillTriangle(12, 22, 35, 0, 50, 22).fillRect(9, 19, 45, 7);
          g.fillStyle(0xfacc15).fillCircle(31, 10, 3).fillCircle(42, 17, 2);
        } else if (type === 'general') {
          g.fillStyle(0x166534).fillCircle(31, 15, 18).fillRect(9, 15, 44, 8);
          g.fillStyle(0xef4444).fillRect(10, 19, 43, 4);
          g.fillStyle(0xfacc15).fillCircle(31, 14, 4).fillCircle(20, 51, 3).fillCircle(42, 51, 3);
        } else {
          g.fillStyle(0xfacc15)
            .fillTriangle(10, 20, 15, 2, 25, 16)
            .fillTriangle(22, 17, 31, 0, 40, 17)
            .fillTriangle(37, 16, 49, 2, 53, 20)
            .fillRect(10, 17, 43, 8);
          g.fillStyle(0xef4444).fillCircle(31, 16, 4);
          g.fillStyle(0x38bdf8).fillCircle(17, 17, 3).fillCircle(46, 17, 3);
        }

        g.generateTexture(key, 64, 64);
        g.destroy();
      }

      const makeBlock = (key: Material, fill: number, line: number) => {
        if (this.textures.exists(key)) return;
        const g = this.add.graphics();
        g.fillStyle(fill).fillRect(0, 0, 64, 64);
        g.lineStyle(4, line, 0.82).strokeRect(2, 2, 60, 60);
        g.lineStyle(2, 0xffffff, 0.2).lineBetween(8, 14, 56, 48).lineBetween(8, 48, 56, 14);
        g.generateTexture(key, 64, 64);
        g.destroy();
      };

      makeBlock('wood', 0xb86b2e, 0x78350f);
      makeBlock('stone', 0x64748b, 0x334155);
      makeBlock('glass', 0x67e8f9, 0x0891b2);
      makeBlock('tnt', 0xef4444, 0x7f1d1d);
    }

    private createBackdrop() {
      this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0xbde8ff);
      const scenery = this.add.graphics();
      scenery.fillStyle(0xffffff, 0.78)
        .fillCircle(190, 92, 34)
        .fillCircle(225, 90, 44)
        .fillCircle(265, 98, 30);
      scenery.fillStyle(0x9bd18b)
        .fillCircle(150, 530, 230)
        .fillCircle(440, 560, 270)
        .fillCircle(820, 545, 250);
      scenery.fillStyle(0x65a85c)
        .fillCircle(40, 570, 210)
        .fillCircle(590, 590, 270)
        .fillCircle(1020, 565, 230);
      scenery.fillStyle(0x4b7f3f).fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);
      scenery.fillStyle(0x80b85f).fillRect(0, GROUND_Y - 8, WIDTH, 12);

      this.matter.add.rectangle(WIDTH / 2, GROUND_Y + 35, WIDTH + 120, 70, {
        isStatic: true,
        friction: 0.62,
        frictionStatic: 0.82,
      });

      const sling = this.add.graphics().setDepth(7);
      sling.fillStyle(0x6b3518)
        .fillRoundedRect(SLING_X - 19, SLING_Y - 12, 13, 88, 5)
        .fillRoundedRect(SLING_X + 7, SLING_Y - 12, 13, 88, 5);
      sling.fillStyle(0x3f2112).fillRect(SLING_X - 8, SLING_Y + 65, 18, 10);
    }

    private createLevel() {
      const config = LEVELS[this.level - 1];
      parent.dataset.pigType = config.pigType;
      this.birdQueue = [...config.birds];
      this.initialBlockPose = new Map();
      parent.dataset.birdBlockImpacts = '0';

      this.pigs = config.pigs.map(([x, y]) => {
        const pig = this.matter.add.image(x, y, 'pig-' + config.pigType)
          .setCircle(21)
          .setDensity(0.00105)
          .setFriction(0.42, 0.006, 0.48)
          .setBounce(0.22)
          .setSleepThreshold(300) as TaggedImage;
        pig.gameTag = 'pig';
        pig.hp = PIG_STYLES[config.pigType].hp;
        return pig;
      });

      this.blocks = config.blocks.map(([x, y, width, height, material]) => {
        const physics = MATERIAL_PHYSICS[material];
        const block = this.matter.add.image(x, y, material)
          .setDisplaySize(width, height)
          .setRectangle(width, height)
          .setDensity(physics.density)
          .setFriction(physics.friction, physics.frictionAir, physics.frictionStatic)
          .setBounce(physics.bounce)
          .setSleepThreshold(600) as TaggedImage;
        block.gameTag = 'block';
        block.material = material;
        block.hp = physics.hp;
        this.initialBlockPose.set(block, { x, y, angle: block.rotation });
        return block;
      });

      this.updateBlockTelemetry();
      this.loadNextBird();
    }

    private loadNextBird() {
      if (this.birdQueue.length === 0) {
        this.status = 'failed';
        this.setShotState('failed');
        this.syncHud();
        return;
      }

      const type = this.birdQueue.shift()!;
      selected.value = type;
      this.slowSince = 0;
      this.skillUsed = false;
      delete parent.dataset.skillUsed;
      this.activePointerId = null;
      this.loadedBird = this.add.image(SLING_X, SLING_Y, 'bird-' + type).setDepth(10) as LoadedBird;
      this.loadedBird.birdType = type;
      this.setShotState('ready');
      this.renderQueue();
      this.syncHud();
    }

    private renderQueue() {
      this.queueSprites.forEach((sprite) => sprite.destroy());
      this.queueSprites = this.birdQueue.map((type, index) => {
        const column = index % 4;
        const row = Math.floor(index / 4);
        return this.add.image(42 + column * 31, 450 - row * 38, 'bird-' + type)
          .setScale(0.62)
          .setAngle(index % 2 === 0 ? -5 : 4)
          .setDepth(6);
      });
    }

    private bindPointerInput() {
      parent.style.touchAction = 'none';
      parent.style.cursor = 'grab';
      parent.addEventListener('pointerdown', this.handlePointerDown);
      window.addEventListener('pointermove', this.handlePointerMove, { passive: false });
      window.addEventListener('pointerup', this.handlePointerUp, { passive: false });
      window.addEventListener('pointercancel', this.handlePointerCancel);
    }

    private unbindPointerInput() {
      parent.removeEventListener('pointerdown', this.handlePointerDown);
      window.removeEventListener('pointermove', this.handlePointerMove);
      window.removeEventListener('pointerup', this.handlePointerUp);
      window.removeEventListener('pointercancel', this.handlePointerCancel);
      parent.style.cursor = '';
      this.activePointerId = null;
    }

    private eventToWorld(event: PointerEvent) {
      const rect = this.game.canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    }

    private handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (this.status !== 'playing') return;

      if (this.shotState === 'flying') {
        event.preventDefault();
        this.activateSkill();
        return;
      }

      if (!this.loadedBird || this.shotState !== 'ready' || this.activePointerId !== null) return;
      const point = this.eventToWorld(event);
      const distance = Phaser.Math.Distance.Between(point.x, point.y, this.loadedBird.x, this.loadedBird.y);
      if (distance > 120) return;

      event.preventDefault();
      this.activePointerId = event.pointerId;
      parent.setPointerCapture?.(event.pointerId);
      parent.style.cursor = 'grabbing';
      this.setShotState('aiming');
      this.aimLoadedBird(point.x, point.y);
    };

    private handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== this.activePointerId || this.shotState !== 'aiming') return;
      event.preventDefault();
      const point = this.eventToWorld(event);
      this.aimLoadedBird(point.x, point.y);
    };

    private handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== this.activePointerId || this.shotState !== 'aiming') return;
      event.preventDefault();
      this.releasePointer(event.pointerId);

      if (!this.loadedBird) return;
      const backwardPull = SLING_X - this.loadedBird.x;
      if (backwardPull < 12) this.loadedBird.setPosition(DEFAULT_PULL_X, DEFAULT_PULL_Y);
      this.launchLoadedBird();
    };

    private handlePointerCancel = (event: PointerEvent) => {
      if (event.pointerId !== this.activePointerId) return;
      this.releasePointer(event.pointerId);
      this.guide.clear();
      this.loadedBird?.setPosition(SLING_X, SLING_Y);
      this.setShotState('ready');
    };

    private releasePointer(pointerId: number) {
      if (parent.hasPointerCapture?.(pointerId)) parent.releasePointerCapture(pointerId);
      parent.style.cursor = 'grab';
      this.activePointerId = null;
    }

    private aimLoadedBird(targetX: number, targetY: number) {
      if (!this.loadedBird) return;
      const dx = targetX - SLING_X;
      const dy = targetY - SLING_Y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const scale = Math.min(MAX_PULL, distance) / distance;
      const x = Math.min(SLING_X + 24, SLING_X + dx * scale);
      const y = SLING_Y + dy * scale;
      this.loadedBird.setPosition(x, y);
      this.drawGuide(x, y);
      parent.dataset.birdPosition = String(Math.round(x)) + ',' + String(Math.round(y));
    }

    private drawGuide(x: number, y: number) {
      const velocityX = (SLING_X - x) * SHOT_POWER;
      const velocityY = (SLING_Y - y) * SHOT_POWER;
      this.guide.clear()
        .lineStyle(5, 0x3f2112, 0.88)
        .lineBetween(SLING_X - 12, SLING_Y, x, y)
        .lineBetween(SLING_X + 12, SLING_Y, x, y)
        .fillStyle(0xffffff, 0.68);

      for (let index = 1; index <= 7; index += 1) {
        const time = index * 7;
        this.guide.fillCircle(
          x + velocityX * time,
          y + velocityY * time + 0.048 * time * time,
          Math.max(2, 5 - index * 0.35),
        );
      }
    }

    private launchLoadedBird() {
      if (!this.loadedBird || this.shotState !== 'aiming') return;
      const releaseX = this.loadedBird.x;
      const releaseY = this.loadedBird.y;
      const type = this.loadedBird.birdType;
      const velocityX = (SLING_X - releaseX) * SHOT_POWER;
      const velocityY = (SLING_Y - releaseY) * SHOT_POWER;

      this.loadedBird.destroy();
      this.loadedBird = null;
      this.guide.clear();

      const bird = this.matter.add.image(releaseX, releaseY, 'bird-' + type)
        .setCircle(type === 'black' ? 22 : type === 'blue' ? 18 : 20)
        .setMass(BIRD_MASS[type])
        .setFriction(0.28, 0.003, 0.3)
        .setFrictionAir(0.003)
        .setBounce(0.18)
        .setDepth(10) as TaggedImage;
      bird.gameTag = 'bird';
      bird.birdType = type;
      bird.setVelocity(velocityX, velocityY);
      bird.setAngularVelocity(Phaser.Math.Clamp(velocityY * 0.01, -0.1, 0.1));

      this.flyingBird = bird;
      this.skillUsed = false;
      this.launchedAt = this.time.now;
      this.slowSince = 0;
      this.setShotState('flying');
      parent.dataset.launchVelocity = velocityX.toFixed(2) + ',' + velocityY.toFixed(2);
      this.syncHud();
    }

    selectBird(type: BirdType) {
      if (!this.loadedBird || this.shotState !== 'ready') {
        if (this.shotState === 'flying' && this.flyingBird?.birdType === type) this.activateSkill();
        return;
      }
      const currentType = this.loadedBird.birdType;
      if (currentType === type) return;

      const queueIndex = this.birdQueue.indexOf(type);
      if (queueIndex < 0) return;

      this.birdQueue[queueIndex] = currentType;
      this.loadedBird.birdType = type;
      this.loadedBird.setTexture('bird-' + type);
      selected.value = type;
      this.renderQueue();
      this.syncHud();
    }

    private activateSkill() {
      const bird = this.flyingBird;
      if (!bird?.body || this.shotState !== 'flying' || this.skillUsed || !bird.birdType) return;
      this.skillUsed = true;
      parent.dataset.skillUsed = bird.birdType;
      const velocity = bird.body.velocity;

      if (bird.birdType === 'yellow') {
        bird.setVelocity(velocity.x * 1.75, velocity.y * 1.75);
        this.cameras.main.flash(90, 255, 220, 80, false);
      } else if (bird.birdType === 'blue') {
        this.splitBlueBird(velocity.x, velocity.y);
      } else if (bird.birdType === 'black') {
        this.explode(bird.x, bird.y, 150);
      } else {
        this.redShockwave(bird.x, bird.y);
      }
    }

    private redShockwave(x: number, y: number) {
      this.cameras.main.shake(120, 0.004);
      this.burst(x, y, 0xef4444, 18);

      for (const block of this.blocks) {
        if (!block.active || !block.body) continue;
        const distance = Phaser.Math.Distance.Between(x, y, block.x, block.y);
        if (distance >= 115) continue;
        const strength = 1 - distance / 115;
        const directionX = (block.x - x) / Math.max(distance, 1);
        const directionY = (block.y - y) / Math.max(distance, 1);
        block.setAwake();
        block.setVelocity(
          block.body.velocity.x + directionX * strength * 5,
          block.body.velocity.y + directionY * strength * 4,
        );
        block.setAngularVelocity(Phaser.Math.Clamp(directionX * strength * 0.12, -0.18, 0.18));
      }

      for (const pig of [...this.pigs]) {
        const distance = Phaser.Math.Distance.Between(x, y, pig.x, pig.y);
        if (distance < 75) this.damagePig(pig, 1);
      }
    }

    private splitBlueBird(velocityX: number, velocityY: number) {
      if (!this.flyingBird) return;
      const originX = this.flyingBird.x;
      const originY = this.flyingBird.y;

      for (const angle of [-0.22, 0.22]) {
        const clone = this.matter.add.image(originX, originY, 'bird-blue')
          .setCircle(18)
          .setMass(2.6)
          .setFriction(0.24, 0.003, 0.26)
          .setFrictionAir(0.003)
          .setDepth(9) as TaggedImage;
        clone.gameTag = 'bird';
        clone.birdType = 'blue';
        clone.setVelocity(
          velocityX * Math.cos(angle) - velocityY * Math.sin(angle),
          velocityX * Math.sin(angle) + velocityY * Math.cos(angle),
        );
        this.time.delayedCall(4500, () => {
          if (clone.active) clone.destroy();
        });
      }

      this.cameras.main.flash(90, 120, 220, 255, false);
    }

    restartLevel() {
      this.scene.restart({ level: this.level, score: this.levelStartScore });
    }

    nextLevel() {
      if (this.status !== 'levelComplete') return;
      this.scene.restart({ level: this.level + 1, score: this.score });
    }

    private handleCollision(event: { pairs: Array<{ bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }> }) {
      for (const pair of event.pairs) {
        const bodyA = pair.bodyA as MatterJS.BodyType & { gameObject?: TaggedImage };
        const bodyB = pair.bodyB as MatterJS.BodyType & { gameObject?: TaggedImage };
        const objectA = bodyA.gameObject;
        const objectB = bodyB.gameObject;
        if (!objectA || !objectB) continue;

        const impactSpeed = Phaser.Math.Distance.Between(
          bodyA.velocity.x,
          bodyA.velocity.y,
          bodyB.velocity.x,
          bodyB.velocity.y,
        );
        this.applyImpact(objectA, objectB, impactSpeed);
        this.applyImpact(objectB, objectA, impactSpeed);
      }
    }

    private applyImpact(target: TaggedImage, source: TaggedImage, speed: number) {
      if (target.gameTag === 'block') {
        target.setAwake();
        if (source.gameTag === 'bird') this.transferBirdImpulse(target, source, speed);
        if (speed > 3.2) {
          if (target.material === 'tnt') this.explode(target.x, target.y, 130);
          else this.damageBlock(target, speed > 9 ? 2 : 1);
        }
      }

      if (target.gameTag === 'pig') {
        const threshold = source.gameTag === 'block' ? 1.65 : 2.4;
        if (speed > threshold) this.damagePig(target, speed > 7 ? 2 : 1);
      }

      if (source.gameTag === 'bird' && target.gameTag === 'pig' && speed > 2.2) this.score += 25;
    }

    private transferBirdImpulse(block: TaggedImage, bird: TaggedImage, speed: number) {
      if (!block.body || !bird.body || !block.material) return;
      this.birdBlockImpacts += 1;
      parent.dataset.birdBlockImpacts = String(this.birdBlockImpacts);
      const response = MATERIAL_PHYSICS[block.material].hitResponse;
      const velocity = bird.body.velocity;
      const velocityLength = Math.max(0.001, Math.hypot(velocity.x, velocity.y));
      const body = block.body;
      const boost = Math.min(speed, 24) / 24;

      block.setVelocity(
        body.velocity.x + velocity.x * 0.12 * response * boost,
        body.velocity.y + velocity.y * 0.08 * response * boost,
      );
      block.applyForce(new Phaser.Math.Vector2(
        (velocity.x / velocityLength) * 0.0035 * response,
        (velocity.y / velocityLength) * 0.0025 * response,
      ));

      const offsetX = Phaser.Math.Clamp(
        (bird.x - block.x) / Math.max(block.displayWidth * 0.5, 12),
        -1,
        1,
      );
      const offsetY = Phaser.Math.Clamp(
        (bird.y - block.y) / Math.max(block.displayHeight * 0.5, 12),
        -1,
        1,
      );
      let spin = (offsetX * velocity.y - offsetY * velocity.x) * 0.009 * response;
      if (Math.abs(spin) < 0.015) spin = (velocity.x >= 0 ? 1 : -1) * 0.018 * response;
      block.setAngularVelocity(Phaser.Math.Clamp(spin, -0.26, 0.26));
    }

    private damagePig(pig: TaggedImage, damage: number) {
      if (!pig.active) return;
      pig.hp = (pig.hp ?? 1) - damage;
      pig.setTint(pig.hp <= 1 ? 0xfef08a : 0xffffff);
      if (pig.hp > 0) return;

      this.score += 500;
      this.pigs = this.pigs.filter((item) => item !== pig);
      this.burst(pig.x, pig.y, 0x84cc16);
      pig.destroy();
      this.syncHud();
      if (this.pigs.length === 0) this.completeLevel();
    }

    private damageBlock(block: TaggedImage, damage: number) {
      if (!block.active) return;
      block.hp = (block.hp ?? 1) - damage;
      block.setTint((block.hp ?? 0) <= 1 ? 0xfca5a5 : 0xffffff);
      if (block.hp > 0) return;

      this.score += block.material === 'stone' ? 80 : 120;
      this.blocks = this.blocks.filter((item) => item !== block);
      this.burst(block.x, block.y, block.material === 'glass' ? 0x67e8f9 : 0xf59e0b);
      block.destroy();
      this.syncHud();
    }

    private explode(x: number, y: number, radius: number) {
      this.cameras.main.shake(220, 0.009);
      this.cameras.main.flash(120, 255, 170, 70, false);
      this.burst(x, y, 0xfb923c, 28);

      for (const pig of [...this.pigs]) {
        const distance = Phaser.Math.Distance.Between(x, y, pig.x, pig.y);
        if (distance < radius) this.damagePig(pig, distance < radius * 0.55 ? 4 : 2);
      }

      for (const block of [...this.blocks]) {
        const distance = Phaser.Math.Distance.Between(x, y, block.x, block.y);
        if (distance >= radius) continue;

        if (block.body) {
          const strength = 1 - distance / radius;
          const directionX = (block.x - x) / Math.max(distance, 1);
          const directionY = (block.y - y) / Math.max(distance, 1);
          block.setAwake();
          block.setVelocity(
            block.body.velocity.x + directionX * strength * 8,
            block.body.velocity.y + directionY * strength * 7 - strength * 2,
          );
          block.setAngularVelocity(
            Phaser.Math.Clamp(directionX * strength * 0.2, -0.3, 0.3),
          );
        }

        this.damageBlock(block, block.material === 'stone' ? 2 : 5);
      }
    }

    private burst(x: number, y: number, color: number, count = 14) {
      for (let index = 0; index < count; index += 1) {
        const dot = this.add.circle(x, y, Phaser.Math.Between(2, 6), color).setDepth(20);
        const angle = Math.random() * Math.PI * 2;
        const distance = Phaser.Math.Between(35, 110);
        this.tweens.add({
          targets: dot,
          x: x + Math.cos(angle) * distance,
          y: y + Math.sin(angle) * distance,
          alpha: 0,
          scale: 0.2,
          duration: Phaser.Math.Between(280, 620),
          onComplete: () => dot.destroy(),
        });
      }
    }

    private updateBlockTelemetry() {
      let moved = 0;
      let maxDisplacement = 0;
      let maxRotation = 0;

      for (const [block, initial] of this.initialBlockPose) {
        if (!block.active) {
          moved += 1;
          continue;
        }

        const displacement = Phaser.Math.Distance.Between(initial.x, initial.y, block.x, block.y);
        const rotation = Math.abs(Phaser.Math.Angle.Wrap(block.rotation - initial.angle));
        maxDisplacement = Math.max(maxDisplacement, displacement);
        maxRotation = Math.max(maxRotation, rotation);
        if (displacement > 8 || rotation > 0.05) moved += 1;
      }

      parent.dataset.blocksMoved = String(moved);
      parent.dataset.maxBlockDisplacement = maxDisplacement.toFixed(2);
      parent.dataset.maxBlockRotation = maxRotation.toFixed(3);
    }

    private completeLevel() {
      if (this.status !== 'playing') return;
      this.score += this.birdQueue.length * 250;
      this.status = this.level === LEVELS.length ? 'won' : 'levelComplete';
      this.syncHud();
    }

    private finishFlyingBird() {
      if (this.flyingBird?.active) this.flyingBird.destroy();
      this.flyingBird = null;
      if (this.pigs.length === 0 || this.status !== 'playing') return;
      this.loadNextBird();
    }

    private setShotState(state: ShotState) {
      this.shotState = state;
      parent.dataset.gameState = state === 'aiming' ? 'dragging' : state;
      if (state === 'ready') {
        parent.dataset.birdPosition = String(SLING_X) + ',' + String(SLING_Y);
        delete parent.dataset.launchVelocity;
      }
    }

    private syncHud() {
      const loadedType = this.loadedBird?.birdType;
      const selectedBird = loadedType ?? this.flyingBird?.birdType ?? selected.value;
      const queue = loadedType ? [loadedType, ...this.birdQueue] : [...this.birdQueue];

      parent.dataset.birdQueue = queue.join(',');
      parent.dataset.birdsRemaining = String(queue.length);
      options.onHud({
        level: this.level,
        score: this.score,
        birds: queue.length,
        pigs: this.pigs.length,
        selectedBird,
        queue,
        status: this.status,
      });
    }

    update() {
      this.updateBlockTelemetry();
      if (!this.flyingBird?.body || this.shotState !== 'flying' || this.status !== 'playing') return;
      const bird = this.flyingBird;
      const body = bird.body;
      if (!body) return;
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      const elapsed = this.time.now - this.launchedAt;
      parent.dataset.birdPosition = String(Math.round(bird.x)) + ',' + String(Math.round(bird.y));

      if (elapsed > 650 && speed < 0.45) {
        if (!this.slowSince) this.slowSince = this.time.now;
      } else {
        this.slowSince = 0;
      }

      const settled = this.slowSince > 0 && this.time.now - this.slowSince > 700;
      const expired = elapsed > 4500;
      const outside = bird.x > WIDTH + 100 || bird.x < -100 || bird.y > HEIGHT + 100;
      if (settled || expired || outside) this.finishFlyingBird();
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: '#bde8ff',
    transparent: false,
    physics: {
      default: 'matter',
      matter: {
        gravity: { x: 0, y: 1.05 },
        debug: false,
        enableSleeping: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      pixelArt: false,
    },
    scene: BirdSiegeScene,
  });

  const withScene = (action: (scene: BirdSiegeScene) => void) => {
    const scene = game.scene.getScene('bird-siege-v2') as BirdSiegeScene | undefined;
    if (scene?.sys.isActive()) action(scene);
  };

  options.controls.selectBird = (type) => withScene((scene) => scene.selectBird(type));
  options.controls.restartLevel = () => withScene((scene) => scene.restartLevel());
  options.controls.nextLevel = () => withScene((scene) => scene.nextLevel());

  let destroyed = false;
  return {
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      options.controls.selectBird = () => undefined;
              options.controls.restartLevel = () => undefined;
      options.controls.nextLevel = () => undefined;
      game.destroy(true);
    },
  };
}