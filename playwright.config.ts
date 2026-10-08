import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

const installedEdge =
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (existsSync(installedEdge) ? installedEdge : undefined);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:8081";

export default defineConfig({
  testDir: "./tests/ui",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  outputDir: "./test-results/ui",
  use: {
    baseURL,
    browserName: "chromium",
    launchOptions: { executablePath },
    viewport: { width: 360, height: 800 },
    timezoneId: "Asia/Bangkok",
    locale: "th-TH",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npx expo start --web --port 8081",
        url: "http://127.0.0.1:8081",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: { CI: "1", EXPO_PUBLIC_USE_DEMO_MODE: "true" },
      },
});
