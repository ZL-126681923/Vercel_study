import type { Metadata } from "next";
import PoemMapClient from "./PoemMapClient";

export const metadata: Metadata = {
  title: "诗歌地图",
  description: "在中国地图上浏览各地诗歌创作足迹，点击点位查看诗歌详情。",
};

export default function PoemsPage() {
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      <PoemMapClient />
    </div>
  );
}
