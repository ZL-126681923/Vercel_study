"use client";

import { useTheme } from "@/components/ThemeProvider";

type PoemItem = {
  id: string;
  title: string;
  content: string[];
  poet: string;
  dynasty: string;
  creationTime?: string;
  background?: string;
  type?: string;
  location?: {
    name: string;
    city: string;
    province: string;
    coordinates: [number, number];
  };
};

export default function PoemPopup({ poem }: { poem: PoemItem }) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className="w-[320px] max-w-[86vw]">
      <div className={`px-3.5 pt-3 pb-2 border-b ${isLight ? "border-stone-300/80" : "border-stone-800/70"}`}>
        <div className="text-[10px] tracking-widest text-stone-500 font-medium">POEM</div>
        <div className={`mt-1 font-serif text-base leading-snug ${isLight ? "text-stone-800" : "text-stone-100"}`}>
          {poem.title}
        </div>
        <div className={`mt-1 text-[11px] font-serif ${isLight ? "text-stone-600" : "text-stone-400"}`}>
          {poem.dynasty} · {poem.poet}
        </div>
      </div>

      <div className="px-3.5 py-3">
        <div className="space-y-2">
          {poem.content.map((line, i) => (
            <div key={i} className={`text-sm font-serif tracking-wide ${isLight ? "text-stone-700" : "text-stone-200"}`}>
              {line}
            </div>
          ))}
        </div>
        {poem.location && (
          <div
            className={`mt-3 pt-2 border-t text-[11px] ${
              isLight ? "border-stone-300/80 text-stone-600" : "border-stone-800/70 text-stone-500"
            }`}
          >
            {poem.location.province} · {poem.location.city} · {poem.location.name}
          </div>
        )}
      </div>
    </div>
  );
}
