# LTN 影音站（SSR + ISR）容器打包 — 本機 Docker 測試與 Cloud Run 部署共用
#
# next.config.ts 已設定 output:"standalone"，執行階段只需要
# .next/standalone（內含精簡 server.js 與必要 node_modules），
# 不必帶完整 node_modules，image 更小、啟動更快。

# HLS 一律直連上游（video.ltn.com.tw），無同源代理，build 不需相關參數。

# Cloud Run 部署：
# gcloud run deploy ltn-video --source . --region asia-east1 --allow-unauthenticated

# ---- 第一階段：build（完整 Node 工具鏈）----
FROM node:24.12.0-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

# ---- 第二階段：執行 ----
# standalone 輸出只帶 server.js 執行所需的最小 node_modules，
# public 與 .next/static 不含在 standalone 裡，要另外複製進去。
FROM node:24.12.0-alpine
WORKDIR /app

# Cloud Run 慣例：服務聽 8080
ENV NODE_ENV=production \
    PORT=8080 \
    HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 8080

CMD ["node", "server.js"]
