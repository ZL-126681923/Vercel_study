import Link from "next/link";

const tools = [
  { name: "流体字号", desc: "生成 clamp 响应式字体" },
  { name: "阴影工坊", desc: "调出顺手的 box-shadow" },
  { name: "玻璃面板", desc: "快速拼出毛玻璃样式" },
];

export default function ToolSpaceTeaser() {
  return (
    <Link
      href="/bookmarks/lab"
      className="group relative block overflow-hidden rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 p-6 md:p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/45 hover:shadow-2xl hover:shadow-[var(--accent)]/10"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(122,184,160,0.18),transparent_32%),radial-gradient(circle_at_left_bottom,rgba(122,184,160,0.12),transparent_28%)]" />
      <div className="absolute -right-10 top-6 h-32 w-32 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/6 blur-2xl transition-transform duration-500 group-hover:scale-125" />
      <div className="absolute right-8 top-8 h-2 w-2 rounded-full bg-[var(--accent)]/70 shadow-[0_0_18px_rgba(122,184,160,0.6)]" />
      <div className="absolute left-10 top-16 h-px w-24 bg-gradient-to-r from-[var(--accent)]/0 via-[var(--accent)]/40 to-[var(--accent)]/0" />

      <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.9fr] lg:items-end">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--bg-primary)]/60 px-3 py-1 text-xs uppercase tracking-[0.28em] text-theme-accent">
            模拟空间
          </div>
          <h2 className="font-serif text-3xl text-theme-primary md:text-4xl">
            前端实验舱
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-theme-secondary md:text-base">
            给收藏页留一块能亲手调样式、试参数、拿结果就走的小空间。不是链接目录，而是我自己写的前端工具舱。
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)]/55 px-3 py-1 text-xs text-theme-muted">
              响应式排版
            </span>
            <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)]/55 px-3 py-1 text-xs text-theme-muted">
              视觉调参
            </span>
            <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)]/55 px-3 py-1 text-xs text-theme-muted">
              CSS 片段复制
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-theme-muted">
                  舱内模块
                </p>
                <p className="mt-1 text-sm text-theme-primary">3 个可交互前端工具</p>
              </div>
              <span className="rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-3 py-1 text-xs text-theme-accent">
                Enter
              </span>
            </div>

            <div className="space-y-3">
              {tools.map((tool, index) => (
                <div
                  key={tool.name}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)]/55 px-4 py-3 transition-all duration-300 group-hover:border-[var(--accent)]/25"
                >
                  <div>
                    <p className="text-sm text-theme-primary">{tool.name}</p>
                    <p className="mt-1 text-xs text-theme-muted">{tool.desc}</p>
                  </div>
                  <span className="font-mono text-xs text-theme-accent">
                    0{index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
