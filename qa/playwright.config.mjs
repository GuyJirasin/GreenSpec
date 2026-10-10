import {defineConfig} from '@playwright/test';
const port=process.env.QA_PORT||'5175';
export default defineConfig({testDir:'./browser',workers:1,reporter:'list',timeout:30000,use:{baseURL:`http://127.0.0.1:${port}`,launchOptions:{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'},trace:'retain-on-failure'},webServer:{command:`npm.cmd run dev -- --port ${port} --strictPort`,cwd:'../frontend',url:`http://127.0.0.1:${port}`,reuseExistingServer:false,timeout:120000,env:{VITE_SUPABASE_URL:'http://127.0.0.1:54321',VITE_SUPABASE_ANON_KEY:'qa-only-test-client-key',VITE_CONTACT_EMAIL:'team@example.test'}}});

