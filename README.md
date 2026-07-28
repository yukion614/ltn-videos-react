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

```powershell
# 1. 建 image：--target development 只建到 Dockerfile 的 development 階段，
#    這階段裝了完整 devDependencies，CMD 是 next dev（不是 production 的 server.js）
docker build --target development -t ltn-video:dev .

# 2. 跑容器：
#    -p 3000:3000         主機埠:容器埠。development 階段聽 3000（production 才是 8080）
#    -v "${PWD}:/app"     把本機原始碼掛進容器，改檔即熱更新
#    -v /app/node_modules 匿名 volume，蓋在上一行掛載之上，保住 image 裡裝好的
#                         Linux 版 node_modules，不被本機（Windows）的內容覆蓋
#    -d                   背景執行；--name 方便之後 logs / rm
docker run -d -p 3000:3000 --name ltn-video-dev `
  -v "${PWD}:/app" -v /app/node_modules ltn-video:dev
```

啟動後開 http://localhost:3000。

`-d` 是背景執行，看畫面編譯狀況與錯誤要另外開 log；容器沒加 `--rm`，同名容器還在時
再跑一次 `docker run` 會直接失敗（`name is already in use`），改完 `Dockerfile` 或
`package.json` 要重來時，先砍掉再重建：

```powershell
docker logs -f ltn-video-dev
docker rm -f ltn-video-dev
```

## 環境變數

不使用 `.env` 檔案。`NEXT_PUBLIC_API_BASE`、`NEXT_PUBLIC_ENABLE_PV_TRACKER` 等建置期
公開變數，由部署工具（`bat` 的 `cloudrun_deploy`）透過 `service.conf` 的
`BUILD_ARGS`，經 `docker build --build-arg` 注入，不寫死在程式碼或 `.env` 裡。

## 開發流程

### 常用指令（皆於容器內執行）

| 指令            | 用途                        |
| --------------- | --------------------------- |
| `npm run dev`   | 啟動開發伺服器（熱更新）    |
| `npm run build` | 產出正式版建置              |
| `npm run start` | 本機執行已 build 好的正式版 |

### 安裝／更新套件

不要在自己電腦（尤其是 Windows）直接跑 `npm install`——套件裡有跟平台相關的原生模組
（例如 Tailwind CSS 的 oxide 引擎），在 Windows 上解析出來的 `package-lock.json`，
跟實際部署用的 Linux 容器可能不一致，會導致 `npm ci` 在部署時失敗。務必在跟部署環境
一致的 Linux 容器裡跑：

```powershell
# --package-lock-only：只重算相依關係、更新 package-lock.json，不真的把
# node_modules 裝到本機（本機不需要，跑起來的是容器裡那份）
docker run --rm -v "${PWD}:/app" -w /app node:24.12.0-alpine `
  npm install --package-lock-only
```

上面那條是「保留現有 lockfile，只補上 `package.json` 的差異」。若 lockfile 已經被
Windows 汙染、或相依關係亂到 `npm ci` 怎樣都過不了，才用下面這條**整份重生**——
它會把所有相依照 `package.json` 的 semver 範圍重新解析，次版本可能被一起拉高，
所以事後要看一下 diff，不要無腦 commit：

```powershell
docker run --rm -v "${PWD}:/app" -w /app node:24.12.0-alpine `
  sh -c "rm -rf node_modules package-lock.json && npm install --package-lock-only"
```

不論用哪一條，重生 lockfile 都要在 `docker build` **之前**做完——`Dockerfile` 的
`development` / `builder` 階段一開始就是 `npm ci`，吃的是當下的 `package-lock.json`，
先 build 再改 lock，image 立刻就過期了。

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

| 問題                                                                        | 原因                                                                                 | 解法                                                                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 部署時 `npm ci` 報 `EUSAGE`/`does not satisfy`/`Missing` 等 lockfile 錯誤   | `package-lock.json` 在 Windows 本機解析出的平台相關套件版本，跟 Linux 部署環境不一致 | 依「安裝／更新套件」章節的方式，在容器裡重新產生 `package-lock.json`，並用 `npm ci --dry-run` 驗證過再 commit |
| `service.conf` 改了 `BUILD_ARGS`（如 `NEXT_PUBLIC_API_BASE`）但網站沒有變化 | `Dockerfile` 的 `builder` 階段缺少對應的 `ARG` 宣告，`--build-arg` 傳的值會被忽略    | 確認 `builder` 階段在 `RUN npm run build` 之前，有為每個 `BUILD_ARGS` 變數宣告對應的 `ARG`                    |

## 特色功能

- SSR + ISR：HLS 影音直連上游（`video.ltn.com.tw`），無同源代理
- `schema.org` `VideoObject` JSON-LD（SEO）
- `robots.txt`
