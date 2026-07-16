# LTN 影音站（SSR + ISR）容器打包 — 本機 Docker 測試與 Cloud Run 部署共用
#
# 本分支未啟用 Next standalone 輸出（next.config.ts 沒有 output:"standalone"，
# 前端原設計是 EC2 上 `next start`），因此執行階段需要完整 node_modules，
# 用 `next start` 啟動（不是精簡版 server.js）。

# HLS 一律直連上游（video.ltn.com.tw），無同源代理，build 不需相關參數。

# Cloud Run 部署：
# gcloud run deploy ltn-video --source . --region asia-east1 --allow-unauthenticated

# ---- 第一階段：build（完整 Node 工具鏈）----
FROM node:22-alpine AS builder
WORKDIR /app

# --legacy-peer-deps：react 目前是 19 RC 版，部分套件的 peer 檢查不認預發布版，
# 不加可能 ERESOLVE 失敗；升到 React 19 正式版後可拿掉
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build

# ---- 第二階段：執行 ----
# 沒有 standalone 輸出，執行階段需要完整 node_modules 才能跑 `next start`；
# 直接沿用 builder 階段裝好的 node_modules，不在這層重新 npm ci。
FROM node:22-alpine
WORKDIR /app

# Cloud Run 慣例：服務聽 8080
ENV NODE_ENV=production \
    PORT=8080

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 8080

# next start 預設吃 -p 參數而非 PORT 環境變數，這裡用 shell 展開把 PORT 帶進去；
# -H 0.0.0.0 讓容器外部連得進來（預設只聽 localhost）
CMD ["sh", "-c", "npx next start -p $PORT -H 0.0.0.0"]
