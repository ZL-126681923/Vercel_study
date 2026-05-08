import type { Metadata } from "next";
import PoemMapClient from "./PoemMapClient";

export const metadata: Metadata = {
  title: "毛主席诗词时间轨道",
  description: "以动画地图回望毛主席诗歌创作足迹，让时间在山河之间缓慢发光。",
};

export default function PoemsPage() {
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      <PoemMapClient />
    </div>
  );
}
