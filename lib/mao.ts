import fs from "fs";
import path from "path";

export interface MaoPoem {
  id: string;
  title: string;
  type: string;
  content: string[];
  poet: string;
  dynasty: string;
  creationTime: string;
  background: string;
  likedCount: number;
  location: {
    name: string;
    city: string;
    province: string;
    coordinates: [number, number];
  };
}

function loadJsonFile<T>(filePath: string): T {
  const fullPath = path.join(process.cwd(), filePath);
  const data = fs.readFileSync(fullPath, "utf-8");
  return JSON.parse(data) as T;
}

function parseTimeWeight(input: string) {
  const text = input.trim();
  const year = Number((text.match(/(\d{4})年/) || [])[1] || 0);
  const month = Number((text.match(/(\d{1,2})月/) || [])[1] || 0);
  const seasonToken = (text.match(/(春|夏|秋|冬|年初|年末|年中|晚秋)/) || [])[1] || "";
  const seasonWeightMap: Record<string, number> = {
    春: 0.2,
    夏: 0.45,
    秋: 0.72,
    晚秋: 0.78,
    冬: 0.92,
    年初: 0.08,
    年中: 0.5,
    年末: 0.95,
  };
  const monthWeight = month > 0 ? month / 12 : 0;
  const seasonWeight = seasonToken ? seasonWeightMap[seasonToken] ?? 0.5 : 0;

  return year * 100 + (month > 0 ? month : seasonWeight || monthWeight);
}

export function loadMaoPoems(): MaoPoem[] {
  const poems = loadJsonFile<MaoPoem[]>("data/mao.json");

  return poems
    .filter(
      (item) =>
        item?.id &&
        item?.title &&
        item?.location?.coordinates &&
        item.location.coordinates.length === 2
    )
    .sort((a, b) => parseTimeWeight(a.creationTime) - parseTimeWeight(b.creationTime));
}
