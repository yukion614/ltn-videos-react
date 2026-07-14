import type { NextConfig } from "next";

// 本站改以 Node 伺服器服務（EC2 上 `next start`，前面掛 nginx 反向代理）。
//
// 為什麼不再用 output:"export"：
//   靜態匯出沒有 server 端 generateMetadata，影片／節目／短影音頁只能回一份共用
//   外殼、靠瀏覽器 JS 補 meta。社群爬蟲（FB/LINE/X）與搜尋引擎不執行 JS，拿到的
//   永遠是空殼。改走 SSR + ISR 後，這些頁在伺服器就渲染成完整 HTML（含正確 og），
//   爬蟲與真人拿到同一份內容。
//
//   原本改用 SPA 外殼的動機是「新影片不必重 build」——這點由 ISR 接手：
//   動態路由不預先列舉參數，任何影片第一次被請求時即時產生並快取
//   （見各路由的 `export const revalidate`），一樣不必重 build。
//
// rewrites 在 export 下會被整個停用，改回 SSR 後恢復作用，dev 與正式皆生效。
const config: NextConfig = {
  trailingSlash: true, // 沿用既有網址形狀（結尾斜線），避免 canonical 全數變動
  images: {
    unoptimized: true, // 已全面改用原生 <img>
  },
  async rewrites() {
    return [
      // HLS 同源代理。上游 video.ltn.com.tw 只對 *.ltn.com.tw 開 CORS，
      // 本機 dev（localhost）不能直連，需經此代理（見 _lib/videoDetail.ts 的 toProxiedHls）。
      // 正式站部署在 ltn.com.tw 子網域、CORS 直接通，用不到這條，留著當保險。
      {
        source: "/hls/:path*",
        destination: "https://video.ltn.com.tw/media/:path*",
      },
    ];
  },
};

export default config;
