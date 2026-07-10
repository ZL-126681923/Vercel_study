/**
 * API 冒烟测试脚本
 * 对项目的关键 API 接口发送真实 HTTP 请求，验证返回状态码和数据结构。
 * 
 * 用法：node .cursor/skills/auto-test/scripts/smoke-test.mjs [port]
 * 默认端口 3000
 */

const PORT = process.argv[2] || 3000;
const BASE = `http://localhost:${PORT}`;

const tests = [
  {
    name: "健康检查",
    url: "/api/health",
    validate: (data) => data.data?.status === "ok",
  },
  {
    name: "书签列表",
    url: "/api/bookmarks",
    validate: (data) => data.code === 0 && Array.isArray(data.data),
  },
  {
    name: "诗歌随机列表",
    url: "/api/poems?count=3",
    validate: (data) => data.code === 0,
  },
  {
    name: "每日推荐",
    url: "/api/recommend/daily",
    validate: (data) => data.code === 0,
  },
  {
    name: "朝代元数据",
    url: "/api/meta/dynasties",
    validate: (data) => data.code === 0,
  },
  {
    name: "搜索接口",
    url: "/api/search?q=月",
    validate: (data) => data.code === 0,
  },
  {
    name: "页面渲染 - 首页",
    url: "/",
    isPage: true,
    validate: (text) => text.includes("墨") || text.includes("<!DOCTYPE") || text.includes("<html"),
  },
];

async function runTest(test) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE}${test.url}`, {
      signal: AbortSignal.timeout(10000),
    });
    const elapsed = Date.now() - start;

    if (test.isPage) {
      const text = await res.text();
      const passed = res.ok && test.validate(text);
      return { ...test, passed, status: res.status, elapsed, error: null };
    }

    if (!res.ok) {
      return { ...test, passed: false, status: res.status, elapsed, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const passed = test.validate(data);
    return { ...test, passed, status: res.status, elapsed, error: passed ? null : "数据结构不符合预期" };
  } catch (err) {
    const elapsed = Date.now() - start;
    return { ...test, passed: false, status: 0, elapsed, error: err.message };
  }
}

async function main() {
  console.log(`\n🔍 API 冒烟测试 — ${BASE}\n`);
  console.log("─".repeat(60));

  let passCount = 0;
  let failCount = 0;
  const results = [];

  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);

    const icon = result.passed ? "✅" : "❌";
    const timeStr = `${result.elapsed}ms`.padStart(6);
    const statusStr = result.status ? `[${result.status}]` : "[ERR]";

    console.log(`  ${icon} ${statusStr} ${timeStr}  ${result.name}`);
    if (!result.passed && result.error) {
      console.log(`     └─ ${result.error}`);
    }

    if (result.passed) passCount++;
    else failCount++;
  }

  console.log("─".repeat(60));
  console.log(`\n📊 结果：${passCount} 通过 / ${failCount} 失败 / ${tests.length} 总计\n`);

  // 输出 JSON 结果供程序化读取
  const summary = {
    total: tests.length,
    passed: passCount,
    failed: failCount,
    results: results.map(r => ({
      name: r.name,
      url: r.url,
      passed: r.passed,
      status: r.status,
      elapsed: r.elapsed,
      error: r.error,
    })),
  };

  console.log("__RESULT_JSON__");
  console.log(JSON.stringify(summary));

  process.exit(failCount > 0 ? 1 : 0);
}

main();
