"use client";

import { useState, useEffect } from "react";

type Theme = "cyber" | "github" | "print";

const themes: { id: Theme; label: string; desc: string }[] = [
  { id: "cyber",  label: "霓虹",   desc: "赛博朋克霓虹风格" },
  { id: "github", label: "GitHub", desc: "GitHub 亮色风格" },
  { id: "print",  label: "印刷",   desc: "优雅印刷排版" },
];

const themeStyles: Record<Theme, string> = {
  cyber: `
    .md-content { color: #cdd6f4; line-height: 1.9; font-size: 1.02em; }
    .md-content h1,.md-content h2,.md-content h3,.md-content h4 {
      font-weight: 700; margin-top: 2em; margin-bottom: 0.75em; line-height: 1.3;
      background: linear-gradient(90deg, #89dceb, #cba6f7);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .md-content h1 { font-size: 2em; padding-bottom: 0.4em; border-bottom: 1px solid rgba(137,220,235,0.2); }
    .md-content h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid rgba(137,220,235,0.12); }
    .md-content h3 { font-size: 1.25em; }
    .md-content p { margin: 1em 0; }
    .md-content a { color: #89dceb; text-decoration: none; border-bottom: 1px solid rgba(137,220,235,0.3); transition: all 0.2s; }
    .md-content a:hover { color: #cba6f7; border-bottom-color: #cba6f7; text-shadow: 0 0 8px rgba(203,166,247,0.5); }
    .md-content strong { color: #f38ba8; font-weight: 600; }
    .md-content em { color: #a6e3a1; font-style: italic; }
    .md-content code:not(pre code) {
      background: rgba(137,220,235,0.08); color: #89dceb;
      padding: 0.18em 0.5em; border-radius: 4px; font-size: 0.875em;
      font-family: 'JetBrains Mono', monospace;
      border: 1px solid rgba(137,220,235,0.2);
      box-shadow: 0 0 6px rgba(137,220,235,0.15);
    }
    .md-content pre {
      background: #11111b; border: 1px solid rgba(137,220,235,0.18);
      border-radius: 10px; padding: 1.25em 1.5em; overflow-x: auto; margin: 1.5em 0;
      box-shadow: 0 0 20px rgba(137,220,235,0.06), inset 0 1px 0 rgba(137,220,235,0.08);
      position: relative;
    }
    .md-content pre::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(137,220,235,0.4), rgba(203,166,247,0.4), transparent);
    }
    .md-content pre code { background: none; color: #cdd6f4; padding: 0; font-size: 0.9em; font-family: 'JetBrains Mono', monospace; border: none; box-shadow: none; }
    .md-content blockquote {
      border-left: 3px solid #cba6f7;
      background: rgba(203,166,247,0.05);
      margin: 1.5em 0; padding: 0.75em 1.25em;
      border-radius: 0 8px 8px 0; color: #a6adc8;
      box-shadow: inset 3px 0 0 rgba(203,166,247,0.3);
    }
    .md-content blockquote p { margin: 0; }
    .md-content ul,.md-content ol { padding-left: 1.75em; margin: 1em 0; }
    .md-content li { margin: 0.4em 0; }
    .md-content ul li::marker { color: #89dceb; }
    .md-content ol li::marker { color: #cba6f7; }
    .md-content table { width: 100%; border-collapse: collapse; margin: 1.5em 0; font-size: 0.9em; }
    .md-content thead { background: rgba(137,220,235,0.06); }
    .md-content th { padding: 0.75em 1em; text-align: left; color: #89dceb; font-weight: 600; border: 1px solid rgba(137,220,235,0.18); }
    .md-content td { padding: 0.65em 1em; border: 1px solid rgba(137,220,235,0.1); color: #bac2de; }
    .md-content tr:nth-child(even) td { background: rgba(137,220,235,0.03); }
    .md-content hr { border: none; margin: 2.5em 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(137,220,235,0.4), rgba(203,166,247,0.4), transparent); }
    .md-content img { max-width: 100%; border-radius: 8px; margin: 1em 0; border: 1px solid rgba(137,220,235,0.15); }
    .md-content input[type=checkbox] { accent-color: #89dceb; }
    /* highlight.js 赛博配色 */
    .md-content .hljs-keyword { color: #cba6f7; font-weight: 600; }
    .md-content .hljs-string { color: #a6e3a1; }
    .md-content .hljs-comment { color: #45475a; font-style: italic; }
    .md-content .hljs-number { color: #fab387; }
    .md-content .hljs-function { color: #89dceb; }
    .md-content .hljs-title { color: #89b4fa; font-weight: 600; }
    .md-content .hljs-built_in { color: #f38ba8; }
    .md-content .hljs-attr { color: #f9e2af; }
    .md-content .hljs-variable { color: #cdd6f4; }
    .md-content .hljs-tag { color: #f38ba8; }
    .md-content .hljs-type { color: #89dceb; }
    .md-content .hljs-operator { color: #89dceb; }
    .md-content .hljs-punctuation { color: #9399b2; }
  `,
  github: `
    .md-content { color: #24292f; line-height: 1.75; }
    .md-content h1,.md-content h2,.md-content h3,.md-content h4 { color: #1f2328; font-weight: 600; margin-top: 1.75em; margin-bottom: 0.6em; line-height: 1.25; }
    .md-content h1 { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
    .md-content h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
    .md-content h3 { font-size: 1.25em; }
    .md-content p { margin: 1em 0; }
    .md-content a { color: #0969da; text-decoration: none; }
    .md-content a:hover { text-decoration: underline; }
    .md-content strong { color: #1f2328; font-weight: 600; }
    .md-content em { font-style: italic; }
    .md-content code:not(pre code) { background: #eaeef2; color: #0550ae; padding: 0.2em 0.4em; border-radius: 4px; font-size: 85%; font-family: ui-monospace, 'SFMono-Regular', monospace; }
    .md-content pre { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 1em 1.25em; overflow-x: auto; margin: 1.25em 0; }
    .md-content pre code { background: none; color: #24292f; padding: 0; font-size: 85%; font-family: ui-monospace, 'SFMono-Regular', monospace; }
    .md-content blockquote { border-left: 4px solid #d0d7de; color: #57606a; margin: 1.25em 0; padding: 0 1em; }
    .md-content blockquote p { margin: 0; }
    .md-content ul,.md-content ol { padding-left: 2em; margin: 1em 0; }
    .md-content li { margin: 0.25em 0; }
    .md-content table { width: 100%; border-collapse: collapse; margin: 1.25em 0; font-size: 0.9em; }
    .md-content thead { background: #f6f8fa; }
    .md-content th { padding: 0.65em 0.9em; text-align: left; font-weight: 600; border: 1px solid #d0d7de; color: #1f2328; }
    .md-content td { padding: 0.6em 0.9em; border: 1px solid #d0d7de; }
    .md-content tr:nth-child(even) td { background: #f6f8fa; }
    .md-content hr { border: none; border-top: 2px solid #d0d7de; margin: 2em 0; }
    .md-content img { max-width: 100%; border-radius: 6px; border: 1px solid #d0d7de; }
    .md-content .hljs-keyword { color: #cf222e; }
    .md-content .hljs-string { color: #0a3069; }
    .md-content .hljs-comment { color: #6e7781; font-style: italic; }
    .md-content .hljs-number { color: #0550ae; }
    .md-content .hljs-function { color: #8250df; }
    .md-content .hljs-title { color: #8250df; }
    .md-content .hljs-built_in { color: #953800; }
    .md-content .hljs-attr { color: #116329; }
    .md-content .hljs-tag { color: #116329; }
  `,
  print: `
    .md-content { color: #1a1a1a; line-height: 2; font-family: 'Georgia', 'Noto Serif SC', serif; }
    .md-content h1,.md-content h2,.md-content h3,.md-content h4 { color: #111; font-family: inherit; font-weight: 700; margin-top: 2.25em; margin-bottom: 0.75em; line-height: 1.3; }
    .md-content h1 { font-size: 2.2em; text-align: center; margin-bottom: 1.5em; letter-spacing: -0.02em; }
    .md-content h2 { font-size: 1.5em; border-bottom: 2px solid #111; padding-bottom: 0.3em; }
    .md-content h3 { font-size: 1.2em; font-style: italic; }
    .md-content p { margin: 1.2em 0; text-align: justify; }
    .md-content a { color: #111; text-decoration: underline; text-decoration-style: dotted; }
    .md-content strong { font-weight: 700; }
    .md-content em { font-style: italic; color: #555; }
    .md-content code:not(pre code) { background: #f5f0e8; color: #333; padding: 0.1em 0.4em; border-radius: 3px; font-size: 0.875em; font-family: 'Courier New', monospace; border: 1px solid #ddd; }
    .md-content pre { background: #f5f0e8; border: 1px solid #ddd; border-left: 4px solid #111; border-radius: 0 4px 4px 0; padding: 1.25em 1.5em; overflow-x: auto; margin: 1.75em 0; }
    .md-content pre code { background: none; color: #1a1a1a; padding: 0; font-size: 0.875em; font-family: 'Courier New', monospace; }
    .md-content blockquote { border-left: 3px solid #111; margin: 2em 2em; padding: 0.5em 1.5em; font-style: italic; color: #555; }
    .md-content blockquote p { margin: 0; }
    .md-content ul,.md-content ol { padding-left: 2em; margin: 1em 0; }
    .md-content li { margin: 0.5em 0; }
    .md-content table { width: 100%; border-collapse: collapse; margin: 2em 0; font-size: 0.9em; }
    .md-content thead { border-bottom: 2px solid #111; }
    .md-content th { padding: 0.75em 1em; text-align: left; font-weight: 700; border-bottom: 2px solid #111; }
    .md-content td { padding: 0.65em 1em; border-bottom: 1px solid #ccc; }
    .md-content hr { border: none; border-top: 2px solid #111; margin: 3em auto; width: 50%; }
    .md-content img { max-width: 100%; display: block; margin: 1.5em auto; }
    .md-content .hljs-keyword { font-weight: bold; }
    .md-content .hljs-string { color: #444; }
    .md-content .hljs-comment { color: #888; font-style: italic; }
    .md-content .hljs-number { color: #333; }
  `,
};

const themeWrappers: Record<Theme, string> = {
  cyber:  "bg-[#1e1e2e] rounded-2xl p-8 border border-[rgba(137,220,235,0.12)] shadow-xl shadow-[rgba(137,220,235,0.04)]",
  github: "bg-white rounded-2xl p-8 shadow-sm border border-stone-200/20",
  print:  "bg-[#faf9f6] rounded-2xl p-10 shadow-sm border border-stone-200/20",
};

export default function PostContent({ html }: { html: string }) {
  const [theme, setTheme] = useState<Theme>("cyber");

  useEffect(() => {
    const saved = localStorage.getItem("md-theme") as Theme | null;
    if (saved && themes.find((t) => t.id === saved)) setTheme(saved);
  }, []);

  const handleTheme = (t: Theme) => {
    setTheme(t);
    localStorage.setItem("md-theme", t);
  };

  return (
    <>
      {/* 风格切换器 */}
      <div className="flex items-center gap-2 mb-8">
        <span className="text-theme-muted text-sm mr-1">渲染风格：</span>
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTheme(t.id)}
            title={t.desc}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              theme === t.id
                ? "bg-[var(--accent)] text-[var(--bg-primary)] shadow-md shadow-[var(--accent)]/20"
                : "bg-[var(--bg-secondary)] text-theme-muted hover:text-theme-primary border border-[var(--border-color)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 注入主题样式 */}
      <style>{themeStyles[theme]}</style>

      {/* 文章内容 */}
      <div className={themeWrappers[theme]}>
        <div
          className="md-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </>
  );
}
