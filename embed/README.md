# 嵌入版 build（給 CodeIgniter 首頁用）

把 Next 首頁元件（`app/page.tsx`）打包成單一可掛載的 JS+CSS，塞進 CI 的 `#ltn-video-root`。
**不經過 `app/layout.tsx`**，所以 Next 自帶的 `Ltnheader` / `Navbar` / `Footer` 都不會被打包 —— 版面上只剩 CI 原本的 header。

跟 `next dev` / `next build` 完全獨立，不影響其他頁面。

## 怎麼 build

```bash
npm run build:embed
```

輸出到 CI 專案的 `video/assets/react/home/`（預設路徑寫在 `vite.config.ts` 的 `OUT_DIR`）。
換機器時用環境變數覆蓋：

```bash
CI_ASSETS_HOME=/path/to/video/assets/react/home npm run build:embed
```

## 組成

- `embed/main.tsx` —— 進入點，`createRoot` 掛 `<Home/>` 到 `#ltn-video-root`
- `embed/shims/next-image.tsx` / `next-link.tsx` / `next-dynamic.tsx`
  —— `vite.config.ts` 用 alias 把首頁子樹用到的 `next/*` 換成原生實作，**元件原始碼完全不動**
- 產出 `home.js`（ESM 入口，會相對載入同資料夾的 `*.mjs` chunk）+ `home.css`
  —— react-player 依播放器型別動態載入，所以會有多個 chunk；HLS 只載 `hls-*.mjs`，dash 不會被抓

> ⚠️ 整個 `assets/react/home/` 資料夾要一起部署（home.js 會相對 import 其他 .mjs）。

## CI 端怎麼接（之後做）

把 `application/views/rwd/index.php` 的 `contentIndex` 內容換成：

```html
<link rel="stylesheet" href="assets/react/home/home.css">
<div id="ltn-video-root"></div>
<script type="module" src="assets/react/home/home.js"></script>
```

CI 的 `layout.php` / header / footer 都不用動。

### 兩個要注意的點

1. **HLS 播放**：元件裡把影片網址改寫成 `/hls/...`（原本是 Next dev 的跨網域 workaround）。
   部署在同網域（video.ltn.com.tw）後，加一條 Apache rewrite 讓它解析到實際媒體即可：
   ```apache
   RewriteRule ^hls/(.*)$ /media/$1 [L]
   ```
2. **CSS 全域外溢**：`home.css` 帶有 `globals.css` 的 Tailwind preflight 與 `body{}`、`ul,ol{}`、`label{}`
   等全域規則，注入 CI 頁面後會影響到 CI 的 header/footer。若發現 header 樣式跑掉，
   需在 CI 端把這份 CSS scope 進 `#ltn-video-root`（例如用 postcss prefix 或包一層 scope）。
