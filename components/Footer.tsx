import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-theme bg-theme-primary transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link
              href="/"
              className="font-serif text-xl text-theme-primary hover:text-[var(--accent)] transition-colors"
            >
              墨 · 迹
            </Link>
            <p className="text-theme-muted text-sm leading-relaxed">
              记录思考，分享见解。
              <br />
              用文字构建属于自己的数字花园。
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-theme-secondary text-sm font-medium tracking-wide">
              快速链接
            </h4>
            <ul className="space-y-2">
              {[
                { href: "/blog", label: "全部文章" },
                { href: "/about", label: "关于我" },
                { href: "/rss.xml", label: "RSS 订阅" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-theme-muted hover:text-theme-secondary transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div className="space-y-4">
            <h4 className="text-theme-secondary text-sm font-medium tracking-wide">
              社交媒体
            </h4>
            <div className="flex gap-4 items-center">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                aria-label="GitHub"
              >
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a
                href="https://gitee.com/zlaxx"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
                aria-label="Gitee"
              >
                <Image
                  src="/gitee.svg"
                  alt="Gitee"
                  width={72}
                  height={72}
                  className="w-[72px] h-[72px] object-contain"
                />
              </a>
              <a
                href="https://blog.csdn.net/weixin_67448099?spm=1010.2135.3001.5343"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
                aria-label="CSDN"
              >
                <Image
                  src="/CSDN.png"
                  alt="CSDN"
                  width={72}
                  height={72}
                  className="w-[72px] h-[72px] object-contain"
                />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-theme">
          <p className="text-theme-muted text-sm text-center">
            © {currentYear} 墨迹博客. 基于 Next.js 构建.
          </p>
        </div>
      </div>
    </footer>
  );
}
