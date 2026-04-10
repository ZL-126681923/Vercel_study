/**
 * 数据完整性检查脚本
 * 验证 data/ 目录下所有 JSON 文件的格式正确性和关键字段完整性。
 * 
 * 用法：node .opencode/skills/auto-test/scripts/data-check.mjs
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");

const SCHEMA_RULES = {
  "bookmarks.json": {
    description: "书签收藏数据",
    validate: (data) => {
      if (!data.categories || !Array.isArray(data.categories)) {
        return "缺少 categories 数组";
      }
      for (const cat of data.categories) {
        if (!cat.id || !cat.name || !cat.bookmarks) {
          return `分类 "${cat.name || cat.id || "unknown"}" 缺少必要字段 (id/name/bookmarks)`;
        }
        if (!Array.isArray(cat.bookmarks)) {
          return `分类 "${cat.name}" 的 bookmarks 不是数组`;
        }
        for (const bm of cat.bookmarks) {
          if (!bm.id || !bm.title || !bm.url) {
            return `分类 "${cat.name}" 中的书签 "${bm.title || bm.id || "unknown"}" 缺少必要字段 (id/title/url)`;
          }
          try {
            new URL(bm.url);
          } catch {
            return `书签 "${bm.title}" 的 URL 格式无效: ${bm.url}`;
          }
        }
      }
      return null;
    },
  },
  "tangshi.json": {
    description: "唐诗数据",
    validate: (data) => {
      if (!Array.isArray(data)) return "应该是数组格式";
      if (data.length === 0) return "数据为空";
      return null;
    },
  },
  "songci.json": {
    description: "宋词数据",
    validate: (data) => {
      if (!Array.isArray(data)) return "应该是数组格式";
      if (data.length === 0) return "数据为空";
      return null;
    },
  },
  "yuanqu.json": {
    description: "元曲数据",
    validate: (data) => {
      if (!Array.isArray(data)) return "应该是数组格式";
      if (data.length === 0) return "数据为空";
      return null;
    },
  },
  "must_poem.json": {
    description: "必背古诗数据",
    validate: (data) => {
      if (!Array.isArray(data) && typeof data !== "object") return "数据格式无效";
      return null;
    },
  },
  "like.json": {
    description: "点赞数据",
    validate: (data) => {
      if (typeof data !== "object") return "应该是对象格式";
      return null;
    },
  },
  "likes_state.json": {
    description: "点赞状态",
    validate: (data) => {
      if (typeof data !== "object") return "应该是对象格式";
      return null;
    },
  },
};

function main() {
  console.log("\n🗄️  数据完整性检查\n");
  console.log("─".repeat(60));

  let passCount = 0;
  let failCount = 0;
  const results = [];

  let files;
  try {
    files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  } catch (err) {
    console.log(`❌ 无法读取 data/ 目录: ${err.message}`);
    process.exit(1);
  }

  for (const file of files) {
    const filePath = join(DATA_DIR, file);
    const rules = SCHEMA_RULES[file];
    const desc = rules?.description || "未知数据";

    try {
      const raw = readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);

      let error = null;
      if (rules?.validate) {
        error = rules.validate(data);
      }

      if (error) {
        console.log(`  ❌ ${file} (${desc})`);
        console.log(`     └─ ${error}`);
        failCount++;
        results.push({ file, desc, passed: false, error });
      } else {
        const sizeKB = (Buffer.byteLength(raw) / 1024).toFixed(1);
        console.log(`  ✅ ${file} (${desc}) — ${sizeKB} KB`);
        passCount++;
        results.push({ file, desc, passed: true, error: null });
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        console.log(`  ❌ ${file} (${desc})`);
        console.log(`     └─ JSON 语法错误: ${err.message}`);
      } else {
        console.log(`  ❌ ${file} (${desc})`);
        console.log(`     └─ 读取失败: ${err.message}`);
      }
      failCount++;
      results.push({ file, desc, passed: false, error: err.message });
    }
  }

  console.log("─".repeat(60));
  console.log(`\n📊 结果：${passCount} 通过 / ${failCount} 失败 / ${files.length} 总计\n`);

  const summary = {
    total: files.length,
    passed: passCount,
    failed: failCount,
    results,
  };

  console.log("__RESULT_JSON__");
  console.log(JSON.stringify(summary));

  process.exit(failCount > 0 ? 1 : 0);
}

main();