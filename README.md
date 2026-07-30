# LTN 影音站

Next.js（App Router，SSR + ISR）打造的 LTN 影音網站。

## 技術棧

- Next.js 15.5 / React 19
- Sass（`*.module.scss`）/ Tailwind CSS 4.3
- Node.js 24.12.0

## 前置需求

- Docker（含可用的 Docker daemon）——本機開發、安裝套件、部署前的驗證，全部透過容器執行，
  電腦本身不需要另外安裝 Node.js/npm

專案沒有 `Dockerfile`：開發直接跑官方 `node:24.12.0` image，部署交給 Cloud Run 的
Buildpacks 自動建置（見「部署」）。

## 啟動開發伺服器

```powershell
# 1. 安裝套件。只有 package.json / package-lock.json 有動時才要重跑。
#    node_modules 就是掛載進去的本機這份，所以必須在 Linux 容器裡裝——Windows 裝出來的
#    原生模組（next-swc、lightningcss、Tailwind oxide）在容器裡一律 MODULE_NOT_FOUND
docker run -it --rm -v "${PWD}:/app" -w /app node:24.12.0 npm ci

# 2. 開發伺服器。之後每天只跑這條
docker run -it --rm -v "${PWD}:/app" -w /app -p 9000:3000 node:24.12.0 npm run dev
```

啟動後開 http://localhost:9000 —— **不是** Next 訊息裡印的 3000，那是容器內部的埠，
`-p 9000:3000` 才是「主機 9000 對應容器 3000」。改檔即熱更新。

| 參數               | 作用                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `-it`              | 前景互動執行，看得到進度與錯誤，Ctrl+C 停掉。**不加的話 npm 判定非終端機，整段安裝不會有任何輸出**，看起來像當掉 |
| `--rm`             | 離開就刪掉容器（只刪容器，不刪映像）                                                                                |
| `-v "${PWD}:/app"` | 把本機專案掛進容器，容器裡的 `/app` 就是這個資料夾本身                                                              |
| `-w /app`          | 容器內的工作目錄                                                                                                     |

`docker run` **不會建立映像**：`node:24.12.0` 是 Node 官方預先打包好的映像，第一次跑會
從 Docker Hub 下載（約 1 GB，只有一次），之後走本機快取。程式碼是掛載進去的，沒有被
打包進任何映像——會建映像的是 `docker build`，而本專案已無 `Dockerfile`。

（以上是 PowerShell 寫法；bash / macOS 把 `"${PWD}:/app"` 換成 `"$(pwd):/app"`。
路徑含空白時**引號不能省**，否則 docker 會報 `invalid reference format`。）

啟動要花一分鐘以上是正常的：`node_modules` 在掛載的 Windows 資料夾裡，Next 得穿過
Docker Desktop 的檔案共享層讀上萬個小檔案。印完 `> next dev` 後停一陣子沒動靜不是當掉，
等 `▲ Next.js` 與 `Ready` 出現即可。

## 環境變數

依 Next 的檔案慣例分兩份，依指令自動選用：

| 檔案               | 何時被讀                          |
| ------------------ | --------------------------------- |
| `.env.development` | `npm run dev`                     |
| `.env.production`  | `npm run build` / `npm run start` |

兩份都進 git，只放非機密的值；新增變數時兩份都要加。
`NEXT_PUBLIC_*` 在 `npm run build` 當下就寫死進 bundle，執行期再設不會生效。

| 變數                   | 用途                                                          |
| ---------------------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE` | 資料 API 的 host（`app/_lib/api.ts`），無預設值               |
| `NEXT_PUBLIC_SITE_ENV` | 站台環境（`app/robots.ts`），不是 `production` 就整站禁止索引 |

## 開發流程

### 常用指令（皆於容器內執行）

| 指令            | 用途                                                          |
| --------------- | ------------------------------------------------------------- |
| `npm run dev`   | 啟動開發伺服器（熱更新）                                      |
| `npm run build` | 產出正式版建置——Buildpacks 部署時跑的就是這條                 |
| `npm run start` | 執行已 build 好的正式版——Buildpacks 的容器啟動指令也是這條    |

`npm run start`（`next start`）會自己讀環境變數 `PORT`（沒設就是 3000），預設綁
`0.0.0.0`，剛好符合 Cloud Run 的要求，所以不需要為部署另外寫啟動腳本。

### 安裝／更新套件

不要在自己電腦（尤其是 Windows）直接跑 `npm install`——套件裡有跟平台相關的原生模組
（例如 Tailwind CSS 的 oxide 引擎），在 Windows 上解析出來的 `package-lock.json`，
跟實際部署用的 Linux 環境可能不一致，會導致 `npm ci` 在部署時失敗。這件事跟用不用
Docker 建置無關，改成 Buildpacks 之後一樣成立——Buildpacks 也是拿這份鎖檔跑 `npm ci`。
務必在 Linux 容器裡跑（用 `node:24.12.0`，與 Buildpacks 的 Ubuntu/glibc 基底相符，
不要用 alpine 的 musl）：

```powershell
# --package-lock-only：只重算相依關係、更新 package-lock.json，不動 node_modules
docker run -it --rm -v "${PWD}:/app" -w /app node:24.12.0 `
  npm install --package-lock-only
```

上面那條是「保留現有 lockfile，只補上 `package.json` 的差異」。若 lockfile 已經被
Windows 汙染、或相依關係亂到 `npm ci` 怎樣都過不了，才用下面這條**整份重生**——
它會把所有相依照 `package.json` 的 semver 範圍重新解析，次版本可能被一起拉高，
所以事後要看一下 diff，不要無腦 commit：

```powershell
docker run -it --rm -v "${PWD}:/app" -w /app node:24.12.0 `
  sh -c "rm -rf node_modules package-lock.json && npm install --package-lock-only"
```

安裝完成後，再跑一次 `npm ci --dry-run`（同樣在容器裡）驗證 `package-lock.json`
真的能被部署流程正確安裝，不要只看 `npm install` 沒報錯就當作沒事：

```powershell
docker run -it --rm -v "${PWD}:/app" -w /app node:24.12.0 `
  npm ci --dry-run
```

`package-lock.json` 要跟 `package.json` 一起 commit，不能漏——Buildpacks 沒有鎖檔
就裝不了套件。

## 部署

不使用 Vercel。透過 `bat` 的 `cloudrun_deploy` 工具部署到 Google Cloud Run。

**不需要 `Dockerfile`**：改由 Cloud Run 的 Buildpacks 直接讀原始碼自動建置映像，
專案裡沒有、也不要再補 `Dockerfile` / `.dockerignore`。前端這邊只要確保下列檔案齊備、
格式正確，Buildpacks 就會自己判斷 Node 版本、跑 `npm ci` → `npm run build` →
`npm start`：

| 檔案                                            | 用途                                        | 現況                                                                                                            |
| ----------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `package.json` 含 `engines.node`                | Buildpacks 判斷 Node 版本                   | ✅ 已有 `">=24.12.0"`                                                                                            |
| `package.json` 含 `build` script                | Buildpacks 自動偵測並執行 `npm run build`   | ✅ 已有 `"build": "next build"`                                                                                  |
| `package-lock.json`                             | Buildpacks 用 `npm ci` 安裝套件，需要這份鎖檔 | 前端需要自行維護，且必須在 Linux 環境產生（這是之前討論過的 Windows/Linux 對不上問題，跟建置方式無關） |
| `.env.production`（只放 `NEXT_PUBLIC_` 開頭變數） | `bat` 解析成 `--set-build-env-vars`         | ✅ 已有，格式符合                                                                                                |

其他配合事項：

- 容器須監聽 `process.env.PORT`（Cloud Run 慣例）——`npm start`（`next start`）
  已預設讀 `PORT`、綁 `0.0.0.0`，不必額外處理
- `next.config.ts` 不設 `output: "standalone"`：那是為自建 Docker image 而生的，
  Buildpacks 產出的映像已含 `node_modules`，再開會多一份重複輸出

## 疑難排解

| 問題                                                                      | 原因                                                                                 | 解法                                                                                                          |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 部署時 `npm ci` 報 `EUSAGE`/`does not satisfy`/`Missing` 等 lockfile 錯誤 | `package-lock.json` 在 Windows 本機解析出的平台相關套件版本，跟 Linux 部署環境不一致 | 依「安裝／更新套件」章節的方式，在容器裡重新產生 `package-lock.json`，並用 `npm ci --dry-run` 驗證過再 commit |
| 部署後 `NEXT_PUBLIC_*` 的值不是預期的那個                                 | `NEXT_PUBLIC_*` 在建置當下就寫死進 bundle，執行期再設不會生效                        | 改 `.env.production`（`bat` 由此帶成 `--set-build-env-vars`）後重新部署，不要只改 Cloud Run 的執行期環境變數  |
| Buildpacks 用錯 Node 版本，或整個沒偵測到這是 Node 專案                   | `package.json` 的 `engines.node` 或 `build` script 缺漏                              | 對照「部署」章節的檔案表，確認四項都齊備                                                                     |
| `docker: invalid reference format`                                        | 專案路徑含空白，`-v` 的值沒加引號被切成兩個參數                                     | `-v "${PWD}:/app"` 的引號不能省                                                                              |
| 容器裡 `Cannot find module '../lightningcss.linux-x64-gnu.node'`（或 `Downloading swc package @next/swc-linux-*` 每次都重跑） | `node_modules` 是在 Windows 裝的，原生模組只有 win32 版             | 先跑「啟動開發伺服器」的第 1 步 `npm ci`（在容器裡裝）                                                       |
| `npm ci` 報 `EIO: i/o error, unlink` 或 Windows 刪 `node_modules` 說 `Access denied` | 有 node 行程（多半是本機殘留的 `next dev` / `next start`）鎖著 `node_modules` 裡的檔案 | `Get-Process node` 找出來停掉，再 `Remove-Item -Recurse -Force node_modules`，然後重跑 `npm ci`  |

## 特色功能

- SSR + ISR：HLS 影音直連上游（`video.ltn.com.tw`），無同源代理
- `schema.org` `VideoObject` JSON-LD（SEO）
- `robots.txt`
