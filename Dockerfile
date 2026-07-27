# syntax=docker/dockerfile:1
# LTN 影音站（SSR + ISR）容器打包 — 本機 Docker 測試與 Cloud Run 部署共用
#
# next.config.ts 已設定 output:"standalone"，執行階段只需要
# .next/standalone（內含精簡 server.js 與必要 node_modules），
# 不必帶完整 node_modules，image 更小、啟動更快。
#
# 本站是 SSR + ISR，執行階段一定要有 Node 伺服器（server.js）。
# 不能改用 nginx 之類的純靜態伺服器 —— 那等於回到 output:"export"，
# generateMetadata 產生的 og/canonical 會全部失效（見 next.config.ts 的說明）。

# HLS 一律直連上游（video.ltn.com.tw），無同源代理，build 不需相關參數。

# 本機開發（掛載原始碼，改檔即熱更新）：
#   docker build --target development -t ltn-video:dev .
#   docker run --rm -p 3000:3000 -v "$PWD":/app -v /app/node_modules ltn-video:dev
#
# 本機跑正式版：
#   docker build -t ltn-video . && docker run --rm -p 8080:8080 ltn-video
#
# Cloud Run 部署：
# 由 bat 的 cloudrun_deploy 工具處理，流程是本機 docker build + docker push 到
# Artifact Registry，再 gcloud run deploy --image=<推上去的 image>，不是
# gcloud run deploy --source .（不會上傳原始碼給 Cloud Build 遠端建置）。

# ---- 第一階段：base（共用的 Node 工具鏈與依賴清單）----
FROM node:24.12.0-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./

# ---- 第二階段：development（本機開發用，含完整 devDependencies）----
FROM base AS development

RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

# next dev 預設只聽 localhost，容器外連不進來，要用 -H 指定 0.0.0.0。
# （-H 是 Next 的參數，不是 Vite 的 --host）
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]

# ---- 第三階段：builder（產出 .next/standalone）----
FROM base AS builder

RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

# 接住 cloudrun_deploy 的 service.conf BUILD_ARGS 傳進來的建置期公開變數，
# 沒有這兩行宣告，--build-arg 傳的值會被 docker build 忽略，npm run build
# 讀不到，永遠只會落到 app/_lib/api.ts 裡寫死的預設值。
ARG NEXT_PUBLIC_API_BASE
ARG NEXT_PUBLIC_ENABLE_PV_TRACKER

RUN npm run build

# ---- 第四階段：production（最終要部署的極簡 image）----
# standalone 輸出只帶 server.js 執行所需的最小 node_modules，
# public 與 .next/static 不含在 standalone 裡，要另外複製進去。
FROM node:24.12.0-alpine AS production
WORKDIR /app

# Cloud Run 慣例：服務聽 8080。
# HOSTNAME 不設 0.0.0.0 的話 server.js 只聽 localhost，容器外（含健康檢查）連不進來。
ENV NODE_ENV=production \
    PORT=8080 \
    HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 8080

CMD ["node", "server.js"]
