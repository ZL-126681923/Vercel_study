import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center px-6">
        <h1 className="font-serif text-8xl md:text-9xl text-stone-800 mb-4">
          404
        </h1>
        <h2 className="font-serif text-2xl md:text-3xl text-stone-100 mb-4">
          页面未找到
        </h2>
        <p className="text-stone-500 mb-8 max-w-md mx-auto">
          抱歉，您访问的页面不存在或已被移除。
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium rounded-full transition-all duration-300"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          返回首页
        </Link>
      </div>
    </div>
  );
}
