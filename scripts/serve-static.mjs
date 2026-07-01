// 本機驗證用：服務靜態匯出的 out/，並把 /hls/* 同源代理到上游媒體伺服器。
//
// 為什麼需要這支：output:"export" 不支援 next.config 的 rewrites()，
// 所以靜態站上的 /hls/... 沒有任何東西在服務，影片就播不出來。
// 上游 https://video.ltn.com.tw/media/ 又沒開 CORS，不能直連，
// 因此這裡用「同一個 server 同源代理」重現正式環境該有的那條 rewrite：
//     /hls/(.*)  ->  https://video.ltn.com.tw/media/$1
//
// 用法：
//   npm run build          # 先產生 out/
//   node scripts/serve-static.mjs
//   開 http://localhost:4173/
//
// 純 Node 內建模組，零安裝。

import http from "node:http";
import https from "node:https";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "out");
const PORT = Number(process.env.PORT) || 4173;
const UPSTREAM_HOST = "video.ltn.com.tw";
const UPSTREAM_PREFIX = "/media/"; // /hls/X -> /media/X

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".mp4": "video/mp4",
};

function proxyHls(req, res) {
  // /hls/202606.../index.m3u8  ->  https://video.ltn.com.tw/media/202606.../index.m3u8
  const rest = req.url.slice("/hls/".length);
  const upstreamPath = UPSTREAM_PREFIX + rest;

  const upstreamReq = https.request(
    {
      host: UPSTREAM_HOST,
      path: upstreamPath,
      method: req.method,
      headers: { host: UPSTREAM_HOST }, // 不轉發瀏覽器的 Origin，避免上游回 403
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, {
        "content-type":
          upstreamRes.headers["content-type"] || "application/octet-stream",
        "access-control-allow-origin": "*", // 同源其實用不到，補著以防萬一
        "cache-control": "no-store",
      });
      upstreamRes.pipe(res);
    }
  );

  upstreamReq.on("error", (err) => {
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end("HLS proxy error: " + err.message);
  });
  upstreamReq.end();
}

async function serveStatic(req, res) {
  // 去掉 query，trailingSlash:true 的資料夾對應 index.html
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath.endsWith("/")) urlPath += "index.html";

  let filePath = path.join(OUT_DIR, urlPath);
  // 防穿越
  if (!filePath.startsWith(OUT_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    let info = await stat(filePath).catch(() => null);
    // 沒有副檔名又不是檔案時，試 .html 與 /index.html
    if (!info || info.isDirectory()) {
      const asHtml = filePath.replace(/\/?$/, "") + ".html";
      const asIndex = path.join(filePath, "index.html");
      if ((await stat(asHtml).catch(() => null))?.isFile()) filePath = asHtml;
      else if ((await stat(asIndex).catch(() => null))?.isFile())
        filePath = asIndex;
      else throw new Error("not found");
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME[ext] || "application/octet-stream",
    });
    createReadStream(filePath).pipe(res);
  } catch {
    // 影片詳細頁 SPA fallback：build 後新增、沒有預先產生檔案的影片，
    // 回 client 外殼頁 /video-fallback/（200），由它讀網址 id 即時抓 API 渲染，
    // 免重 build 也不會 404。對應 deploy/nginx.conf 的同名 location。
    if (/^\/(programs\/[^/]+\/video|topic\/video)\//.test(urlPath)) {
      const shell = path.join(OUT_DIR, "video-fallback", "index.html");
      if ((await stat(shell).catch(() => null))?.isFile()) {
        res.writeHead(200, { "content-type": MIME[".html"] });
        createReadStream(shell).pipe(res);
        return;
      }
    }

    // 其餘找不到的頁面：回 404.html（next export 會產生）或純文字
    const notFound = path.join(OUT_DIR, "404.html");
    if ((await stat(notFound).catch(() => null))?.isFile()) {
      res.writeHead(404, { "content-type": MIME[".html"] });
      createReadStream(notFound).pipe(res);
    } else {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("404 Not Found: " + urlPath);
    }
  }
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/hls/")) return proxyHls(req, res);
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`靜態站 + /hls 代理已啟動：http://localhost:${PORT}/`);
  console.log(`服務目錄：${OUT_DIR}`);
  console.log(`/hls/* -> https://${UPSTREAM_HOST}${UPSTREAM_PREFIX}*`);
});
