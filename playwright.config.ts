import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://localhost:3100",
    headless: true,
  },
  webServer: {
    command: "node ./node_modules/next/dist/bin/next dev -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

