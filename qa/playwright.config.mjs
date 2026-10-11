import {defineConfig} from '@playwright/test';
const port=process.env.QA_PORT||'5175';
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const defaultChrome = process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);
const launchOptions = (process.env.PLAYWRIGHT_EXECUTABLE_PATH || defaultChrome)
  ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || defaultChrome }
  : {};

export default defineConfig({
  testDir: './browser',
  workers: 1,
  reporter: 'list',
  timeout: 30000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    launchOptions,
    trace: 'retain-on-failure'
  },
  webServer: {
    command: `${npmCmd} run dev -- --port ${port} --strictPort`,
    cwd: '../frontend',
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'qa-only-test-client-key',
      VITE_CONTACT_EMAIL: 'team@example.test'
    }
  }
});


