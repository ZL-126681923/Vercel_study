import type { Metadata } from "next";
import FavoritePoem from "@/components/FavoritePoem";

export const metadata: Metadata = {
  title: "关于我",
  description: "了解更多关于博客作者的信息。",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 noise-bg" />
        <div className="absolute bottom-1/3 left-1/3 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h1 className="font-serif text-4xl md:text-5xl text-stone-100 mb-4">
            关于我
          </h1>
          <p className="text-stone-400 text-lg">
            代码与文字的交汇处
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <div className="prose prose-lg prose-stone prose-invert max-w-none">
          {/* Avatar & Intro */}
          <div className="not-prose flex flex-col md:flex-row items-center md:items-start gap-8 mb-12 p-8 rounded-2xl bg-stone-900/50 border border-stone-800/50">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-4xl font-serif text-stone-950 shrink-0">
              墨
            </div>
            <div className="text-center md:text-left">
              <h2 className="font-serif text-2xl text-stone-100 mb-2">
                墨迹博客
              </h2>
              <p className="text-stone-400 leading-relaxed">
                一个热爱技术与写作的开发者。相信代码可以改变世界，
                文字可以传递思想。在这里，我分享我的技术探索、
                项目经验和对生活的思考。
              </p>
            </div>
          </div>

          {/* Favorite Poem */}
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
          <p>我主要专注于 Web 开发领域，常用的技术包括：</p>
          <ul>
            <li>
              <strong>前端</strong>：React、Next.js、TypeScript、Tailwind CSS
            </li>
            <li>
              <strong>后端</strong>：Node.js、Python、Go
            </li>
            <li>
              <strong>数据库</strong>：PostgreSQL、MongoDB、Redis
            </li>
            <li>
              <strong>DevOps</strong>：Docker、Kubernetes、Vercel
            </li>
          </ul>

          <h2>联系方式</h2>
          <p>
            如果你想和我交流，可以通过以下方式联系我：
          </p>
          <ul>
            <li>
              <strong>GitHub</strong>：
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                @yourusername
              </a>
            </li>
            <li>
              <strong>Gitee</strong>：
              <a
                href="https://gitee.com/zlaxx"
                target="_blank"
                rel="noopener noreferrer"
              >
                @zlaxx
              </a>
            </li>
            <li>
              <strong>CSDN</strong>：
              <a
                href="https://blog.csdn.net/weixin_67448099?spm=1010.2135.3001.5343"
                target="_blank"
                rel="noopener noreferrer"
              >
                我爱学习_zwj
              </a>
            </li>
            <li>
              <strong>Email</strong>：your@email.com
            </li>
          </ul>

          <h2>关于本站</h2>
          <p>
            本站使用 <a href="https://nextjs.org">Next.js</a> 构建，
            部署在 <a href="https://vercel.com">Vercel</a> 上。
            文章使用 Markdown 编写，支持代码高亮和数学公式。
          </p>
          <p>
            源代码开源在 Gitee 上，欢迎 Star 和 Fork。
          </p>
        </div>

        {/* Stats */}
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
