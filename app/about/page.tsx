import type { Metadata } from "next";
import FavoritePoem from "@/components/FavoritePoem";
import TextAvoidance from "@/components/TextAvoidance";

export const metadata: Metadata = {
  title: "关于我",
  description: "了解更多关于博客作者的信息。",
};

const techStack = [
  { name: "React", level: 5 },
  { name: "Next.js", level: 5 },
  { name: "TypeScript", level: 4 },
  { name: "Tailwind CSS", level: 4 },
  { name: "Node.js", level: 4 },
  { name: "Python", level: 3 },
  { name: "Go", level: 2 },
  { name: "PostgreSQL", level: 3 },
  { name: "MongoDB", level: 3 },
  { name: "Redis", level: 2 },
  { name: "Docker", level: 3 },
  { name: "Kubernetes", level: 2 },
  { name: "Vercel", level: 4 },
  { name: "Git", level: 4 },
  { name: "Vue.js", level: 3 },
  { name: "MySQL", level: 3 },
];

const socialLinks = [
  { name: "GitHub", url: "https://github.com", username: "@yourusername" },
  { name: "Gitee", url: "https://gitee.com/zlaxx", username: "@zlaxx" },
  { name: "CSDN", url: "https://blog.csdn.net/weixin_67448099", username: "我爱学习_zwj" },
  { name: "Email", url: "mailto:your@email.com", username: "your@email.com" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <section className="relative py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 noise-bg" />
        <div className="absolute bottom-1/3 left-1/3 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-3xl mx-auto px-6">
          <TextAvoidance title="关于我" subtitle="代码与文字的交汇处" />
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-24">
        <div className="prose prose-lg prose-stone prose-invert max-w-none">
          <div className="not-prose flex flex-col items-center gap-4 mb-12 p-8 rounded-2xl bg-stone-900/50 border border-stone-800/50">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-4xl font-serif text-stone-950 shrink-0">
              墨
            </div>
            <h2 className="font-serif text-2xl text-stone-100">
              墨迹博客
            </h2>
          </div>

          <div className="not-prose mb-12">
            <FavoritePoem />
          </div>

          <h2>为什么写博客</h2>
          <p>
            写博客对我来说是一种学习方式。当我需要把一个概念解释清楚的时候，
            我会发现自己对它的理解更加深入了。这个过程不仅帮助我巩固知识，
            也希望能够帮助到其他正在学习的人。
          </p>

          <h2>技术栈</h2>
          <div className="not-prose flex flex-wrap gap-3 items-center justify-center py-6">
            {techStack.map((tech) => (
              <span
                key={tech.name}
                className={`px-4 py-2 rounded-full bg-stone-800/80 border border-stone-700/50 text-stone-300 hover:text-amber-400 hover:border-amber-500/50 transition-all cursor-default ${
                  tech.level === 5
                    ? "text-xl font-semibold"
                    : tech.level === 4
                    ? "text-lg font-medium"
                    : tech.level === 3
                    ? "text-base"
                    : "text-sm text-stone-400"
                }`}
              >
                {tech.name}
              </span>
            ))}
          </div>

          <h2>联系方式</h2>
          <p>如果你想和我交流，可以通过以下方式联系我：</p>
          <ul>
            {socialLinks.map((link) => (
              <li key={link.name}>
                <strong>{link.name}</strong>：
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.username}
                </a>
              </li>
            ))}
          </ul>

          <h2>关于本站</h2>
          <p>
            本站使用 <a href="https://nextjs.org">Next.js</a> 构建，
            部署在 <a href="https://vercel.com">Vercel</a> 上。
            文章使用 Markdown 编写，支持代码高亮和数学公式。
          </p>
          <p>源代码开源在 Gitee 上，欢迎 Star 和 Fork。</p>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-12">
          {[
            { value: "50+", label: "篇文章" },
            { value: "10K+", label: "字数" },
            { value: "365", label: "天" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center p-6 rounded-xl bg-stone-900/50 border border-stone-800/50"
            >
              <div className="font-serif text-3xl text-amber-400 mb-1">
                {stat.value}
              </div>
              <div className="text-stone-500 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
