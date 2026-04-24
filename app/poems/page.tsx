import type { Metadata } from "next";
import PoemMapClient from "./PoemMapClient";

export const metadata: Metadata = {
  title: "诗词地图",
  description: "在地图上探索小学、初中、高中必背古诗词的创作足迹",
};

export default function PoemsPage() {
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      <PoemMapClient />
    </div>
  );
}
