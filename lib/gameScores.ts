const STORAGE_KEY = 'game_scores';

export interface GameScores {
  tictactoe: { wins: number; losses: number; draws: number };
  '2048': { best: number; games: number };
  boomerang: { bestLevel: number; totalScore: number };
}

export const defaultScores: GameScores = {
  tictactoe: { wins: 0, losses: 0, draws: 0 },
  '2048': { best: 0, games: 0 },
  boomerang: { bestLevel: 0, totalScore: 0 },
};

export function getScores(): GameScores {
  if (typeof window === 'undefined') return defaultScores;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultScores;
    return { ...defaultScores, ...JSON.parse(raw) };
  } catch {
    return defaultScores;
  }
}

export function saveScores(scores: GameScores): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
}

export function updateScore<K extends keyof GameScores>(
  game: K,
  updater: (prev: GameScores[K]) => GameScores[K]
): GameScores {
  const scores = getScores();
  scores[game] = updater(scores[game]);
  saveScores(scores);
  return scores;
}
