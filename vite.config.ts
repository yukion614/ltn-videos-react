import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * 「嵌入版」build：把 Next 首頁元件打包成單一 JS+CSS，掛進 CodeIgniter 的 #ltn-video-root。
 * 跟原本的 `next dev` / `next build` 完全獨立，不影響其他頁面。
 *
 *   npm run build:embed
 *
 * 輸出位置預設為 CI 專案的 assets/react/home/，可用環境變數覆蓋：
 *   CI_ASSETS_HOME=/path/to/video/assets/react/home npm run build:embed
 */
const OUT_DIR =
  process.env.CI_ASSETS_HOME || "z:/staff/yukon/video/assets/react/home";

export default defineConfig({
  plugins: [react()],
  // 首頁子樹不需要 Next 的 public/ 資產，關掉避免污染 CI 的輸出資料夾
  publicDir: false,
  // lib 模式下沒有 Next runtime，明確指定 production 讓 React 走正式版
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  resolve: {
    alias: {
      // 維持元件裡的 `@/app/...` 路徑別名
      "@": path.resolve(__dirname, "."),
      // 用薄殼替身換掉首頁子樹用到的 next/* 模組，元件原始碼不動
      "next/image": path.resolve(__dirname, "embed/shims/next-image.tsx"),
      "next/link": path.resolve(__dirname, "embed/shims/next-link.tsx"),
      "next/dynamic": path.resolve(__dirname, "embed/shims/next-dynamic.tsx"),
    },
  },
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    cssCodeSplit: false,
    // 把 react / react-dom / react-player 全部打包進來（CI 端沒有 Node 模組）
    lib: {
      entry: path.resolve(__dirname, "embed/main.tsx"),
      formats: ["es"],
      fileName: () => "home.js",
    },
    rollupOptions: {
      output: {
        // CSS 固定輸出成 home.css，其餘資產維持帶 hash 的檔名
        assetFileNames: (info) =>
          info.name && info.name.endsWith(".css")
            ? "home.css"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
});
