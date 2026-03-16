import Link from "next/link";

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
            <div className="flex gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-theme-muted hover:text-theme-secondary transition-colors"
                aria-label="GitHub"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a
                href="https://gitee.com/zlaxx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-theme-muted hover:text-theme-secondary transition-colors"
                aria-label="Gitee"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .327.266.592.593.592h5.63c.982 0 1.778-.796 1.778-1.778v-.296a.593.593 0 0 0-.592-.593h-4.15a.59.59 0 0 1-.592-.592v-1.482a.593.593 0 0 1 .593-.592h6.815c.327 0 .593.265.593.592v3.408a4 4 0 0 1-4 4H5.926a.593.593 0 0 1-.593-.593V9.778a4.444 4.444 0 0 1 4.445-4.444h8.296z" />
                </svg>
              </a>
              <a
                href="https://blog.csdn.net/weixin_67448099?spm=1010.2135.3001.5343"
                target="_blank"
                rel="noopener noreferrer"
                className="text-theme-muted hover:text-theme-secondary transition-colors"
                aria-label="CSDN"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm.555 18.72c-1.057.086-1.99-.46-2.467-1.183-.478-.722-.621-1.657-.358-2.514.264-.856.86-1.576 1.652-1.932.792-.356 1.706-.32 2.48.053l-.873 1.62c-.362-.2-.8-.224-1.183-.066-.384.158-.67.495-.772.91-.103.416-.01.862.25 1.197.26.336.667.54 1.1.548.432.007.847-.18 1.12-.506l1.047 1.44c-.652.433-1.47.512-2.196.433zm4.387-3.233c-.53.855-1.484 1.394-2.512 1.416-.127.003-.255-.003-.38-.017l.88-1.635c.31.054.63-.02.893-.204.264-.186.45-.47.52-.79.07-.32.02-.658-.138-.944-.158-.286-.42-.498-.73-.592-.31-.094-.643-.062-.932.088l-.88-1.635c.725-.326 1.566-.314 2.282.032.716.346 1.252.98 1.452 1.72.2.74.075 1.536-.455 2.56z" />
                </svg>
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
