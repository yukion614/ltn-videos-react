import type { NextConfig } from "next";

// 本站以 Node 伺服器服務：Cloud Run 由 Buildpacks 建置，執行 `npm start`（next start）。
// 不使用 `output: "standalone"`——那是為了自建 Docker image 而生，Buildpacks 已經把
// node_modules 一起打包進映像，再產一份 standalone 只是重複輸出、拖慢建置。

const config: NextConfig = {
  images: {
    unoptimized: true, // 已全面改用原生 <img>
  },
};

export default config;
