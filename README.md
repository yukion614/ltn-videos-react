# LTN 影音站

Next.js（App Router，SSR + ISR）打造的 LTN 影音網站。

## 技術棧

- Next.js 15.5 / React 19
- Tailwind CSS 4.3
- Node.js 24.12.0

## 前置需求

- Docker（含可用的 Docker daemon）——本機開發、安裝套件、部署前的驗證，全部透過容器執行，
  電腦本身不需要另外安裝 Node.js/npm

## 啟動開發伺服器

```bash
docker build --target development -t ltn-video:dev .
docker run --rm -p 3000:3000 -v "$PWD":/app -v /app/node_modules ltn-video:dev
```

`-v /app/node_modules` 這個掛載很重要，讓容器內裝好的 `node_modules` 不會被
`-v "$PWD":/app` 這個掛載本機原始碼覆蓋掉。啟動後開 http://localhost:3000。

## 環境變數

不使用 `.env` 檔案。`NEXT_PUBLIC_API_BASE`、`NEXT_PUBLIC_ENABLE_PV_TRACKER` 等建置期
公開變數，由部署工具（`bat` 的 `cloudrun_deploy`）透過 `service.conf` 的
`BUILD_ARGS`，經 `docker build --build-arg` 注入，不寫死在程式碼或 `.env` 裡。

## 開發流程

### 常用指令（皆於容器內執行）

| 指令 | 用途 |
|---|---|
| `npm run dev` | 啟動開發伺服器（熱更新） |
| `npm run build` | 產出正式版建置 |
| `npm run start` | 本機執行已 build 好的正式版 |

### 安裝／更新套件

不要在自己電腦（尤其是 Windows）直接跑 `npm install`——套件裡有跟平台相關的原生模組
（例如 Tailwind CSS 的 oxide 引擎），在 Windows 上解析出來的 `package-lock.json`，
跟實際部署用的 Linux 容器可能不一致，會導致 `npm ci` 在部署時失敗。務必在跟部署環境
一致的 Linux 容器裡跑：

```powershell
docker run --rm -v "${PWD}:/app" -w /app node:24.12.0-alpine `
  npm install --package-lock-only
```

安裝完成後，再跑一次 `npm ci --dry-run`（同樣在容器裡）驗證 `package-lock.json`
真的能被部署流程正確安裝，不要只看 `npm install` 沒報錯就當作沒事：

```powershell
docker run --rm -v "${PWD}:/app" -w /app node:24.12.0-alpine `
  npm ci --dry-run
```

## 部署

不使用 Vercel。透過 `bat` 的 `cloudrun_deploy` 工具部署到 Google Cloud Run：

- 專案根目錄需自備 `Dockerfile` / `.dockerignore`
- 容器須監聽 `process.env.PORT`（Cloud Run 慣例）
- `Dockerfile` 為多階段建置：`development`（本機開發）/ `builder`（產出
  `.next/standalone`）/ `production`（部署用極簡 image）

## 疑難排解

| 問題 | 原因 | 解法 |
|---|---|---|
| 部署時 `npm ci` 報 `EUSAGE`/`does not satisfy`/`Missing` 等 lockfile 錯誤 | `package-lock.json` 在 Windows 本機解析出的平台相關套件版本，跟 Linux 部署環境不一致 | 依「安裝／更新套件」章節的方式，在容器裡重新產生 `package-lock.json`，並用 `npm ci --dry-run` 驗證過再 commit |
| `service.conf` 改了 `BUILD_ARGS`（如 `NEXT_PUBLIC_API_BASE`）但網站沒有變化 | `Dockerfile` 的 `builder` 階段缺少對應的 `ARG` 宣告，`--build-arg` 傳的值會被忽略 | 確認 `builder` 階段在 `RUN npm run build` 之前，有為每個 `BUILD_ARGS` 變數宣告對應的 `ARG` |

## 特色功能

- SSR + ISR：HLS 影音直連上游（`video.ltn.com.tw`），無同源代理
- `schema.org` `VideoObject` JSON-LD（SEO）
- `robots.txt`
