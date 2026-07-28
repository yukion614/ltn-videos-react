import type { NextConfig } from "next";

// 本站以 Node 伺服器服務（Cloud Run 跑 `.next/standalone` 的 server.js）。
//

const config: NextConfig = {
  // 產出獨立部署包（.next/standalone）：只帶必要的 node_modules 與精簡 server.js，
  // 適合裝進 Docker image，映像更小、不必在容器內完整 npm install。
  output: "standalone",
  images: {
    unoptimized: true, // 已全面改用原生 <img>
  },
};

export default config;
