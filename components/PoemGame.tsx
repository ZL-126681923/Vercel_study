"use client";

import { useState, useEffect } from "react";

interface Poem {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string[];
}

type GameMode = "guess-author" | "guess-next" | "guess-title";

export default function PoemGame() {
  const [mode, setMode] = useState<GameMode>("guess-author");
  const [poem, setPoem] = useState<Poem | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchQuestion = async () => {
    setLoading(true);
    setSelected(null);
    setShowResult(false);

    try {
      // 获取多首诗来生成选项
      const res = await fetch("/api/recommend/daily?count=4");
      const data = await res.json();
      
      if (data.code === 0 && data.data.length >= 4) {
        const poems = data.data as Poem[];
        const targetPoem = poems[0];
        setPoem(targetPoem);

        if (mode === "guess-author") {
          // 猜作者
          const authors = [...new Set(poems.map(p => p.author))];
          while (authors.length < 4) {
            authors.push(["杜甫", "白居易", "王维", "孟浩然", "柳宗元"][Math.floor(Math.random() * 5)]);
          }
          const shuffled = authors.sort(() => Math.random() - 0.5).slice(0, 4);
          if (!shuffled.includes(targetPoem.author)) {
            shuffled[Math.floor(Math.random() * 4)] = targetPoem.author;
          }
          setOptions(shuffled);
          setAnswer(targetPoem.author);
        } else if (mode === "guess-title") {
          // 猜标题
          const titles = poems.map(p => p.title);
          const shuffled = titles.sort(() => Math.random() - 0.5);
          setOptions(shuffled);
          setAnswer(targetPoem.title);
        } else {
          // 猜下一句 - 使用诗歌内容
          if (targetPoem.content.length >= 2) {
            const lines = targetPoem.content.flatMap(line => 
              line.split(/[，。！？；、]/).filter(Boolean)
            );
            if (lines.length >= 4) {
              const idx = Math.floor(Math.random() * (lines.length - 1));
              const nextLine = lines[idx + 1];
              
              // 从其他诗中取干扰项
              const otherLines = poems.slice(1).flatMap(p => 
                p.content.flatMap(line => line.split(/[，。！？；、]/).filter(Boolean))
              ).slice(0, 3);
              
              const allOptions = [nextLine, ...otherLines].sort(() => Math.random() - 0.5);
              setOptions(allOptions.slice(0, 4));
              setAnswer(nextLine);
              
              // 临时修改 poem 显示题目
              setPoem({
                ...targetPoem,
                content: [lines[idx] + "____"]
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("获取题目失败:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestion();
  }, [mode]);

  const handleSelect = (option: string) => {
    if (showResult) return;
    
    setSelected(option);
    setShowResult(true);
    setTotal(t => t + 1);
    
    if (option === answer) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    fetchQuestion();
  };

  const getModeTitle = () => {
    switch (mode) {
      case "guess-author": return "猜作者";
      case "guess-title": return "猜诗名";
      case "guess-next": return "接下句";
    }
  };

  const getModeHint = () => {
    switch (mode) {
      case "guess-author": return "根据诗句猜出作者";
      case "guess-title": return "根据诗句猜出诗名";
      case "guess-next": return "填写下一句诗";
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl card">
      <div className="absolute inset-0 noise-bg" />
      
      {/* 装饰 */}
      <div className="absolute top-0 left-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
      
      <div className="relative p-8 md:p-12">
        {/* 标题和模式切换 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎮</span>
            <div>
              <h3 className="font-serif text-xl text-theme-primary">诗词小游戏</h3>
              <p className="text-sm text-theme-muted">{getModeHint()}</p>
            </div>
          </div>
          
          {/* 得分 */}
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-full bg-[var(--bg-secondary)] text-theme-secondary text-sm">
              得分：<span className="text-amber-500 font-medium">{score}</span> / {total}
            </div>
          </div>
        </div>

        {/* 模式切换 */}
        <div className="flex flex-wrap gap-2 mb-8">
          {(["guess-author", "guess-title", "guess-next"] as GameMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                mode === m
                  ? "bg-amber-500 text-white"
                  : "border border-[var(--border-color)] text-theme-muted hover:border-amber-500/50"
              }`}
            >
              {m === "guess-author" ? "猜作者" : m === "guess-title" ? "猜诗名" : "接下句"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : poem ? (
          <>
            {/* 题目 */}
            <div className="mb-8 p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
              {mode !== "guess-title" && (
                <h4 className="font-serif text-xl text-theme-primary mb-4">{poem.title}</h4>
              )}
              <div className="font-serif text-lg text-theme-secondary leading-loose">
                {poem.content.slice(0, 3).map((line, index) => (
                  <p key={index} className="tracking-wider">{line}</p>
                ))}
              </div>
            </div>

            {/* 选项 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {options.map((option, index) => {
                let btnClass = "p-4 rounded-xl border text-left transition-all ";
                
                if (showResult) {
                  if (option === answer) {
                    btnClass += "border-green-500 bg-green-500/10 text-green-500";
                  } else if (option === selected) {
                    btnClass += "border-red-500 bg-red-500/10 text-red-500";
                  } else {
                    btnClass += "border-[var(--border-color)] text-theme-muted opacity-50";
                  }
                } else {
                  btnClass += selected === option
                    ? "border-amber-500 bg-amber-500/10 text-amber-500"
                    : "border-[var(--border-color)] text-theme-secondary hover:border-amber-500/50";
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleSelect(option)}
                    disabled={showResult}
                    className={btnClass}
                  >
                    <span className="inline-block w-6 h-6 rounded-full bg-[var(--bg-primary)] text-center text-sm leading-6 mr-3">
                      {String.fromCharCode(65 + index)}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>

            {/* 结果和下一题 */}
            {showResult && (
              <div className="flex items-center justify-between">
                <p className={`text-lg font-medium ${selected === answer ? "text-green-500" : "text-red-500"}`}>
                  {selected === answer ? "🎉 回答正确！" : `❌ 正确答案是：${answer}`}
                </p>
                <button
                  onClick={handleNext}
                  className="px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors flex items-center gap-2"
                >
                  下一题
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-theme-muted">
            加载题目失败，请刷新重试
          </div>
        )}
      </div>
    </div>
  );
}
