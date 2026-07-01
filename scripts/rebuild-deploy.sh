#!/usr/bin/env bash
#
# 定期重新 build 靜態站並原子式換上線。
#
# 為什麼需要：output:"export" 是 build 當下的快照，後端「之後」新增的影片只有
# 靠 /video-fallback 外殼即時渲染（能看、但社群預覽是通用資訊）。重新 build 會把
# 這些新影片轉為預先產生的頁面，補回完整的 per-video SEO/OG。
# 搭配 cron 定期執行，新影片的 SEO 就會自動補齊。
#
# 用法：
#   DEPLOY_DIR=/var/www/ltn-video bash scripts/rebuild-deploy.sh
#
# cron 範例（每 30 分鐘一次，日誌寫到檔案）：
#   */30 * * * * DEPLOY_DIR=/var/www/ltn-video bash /path/to/repo/scripts/rebuild-deploy.sh >> /var/log/ltn-rebuild.log 2>&1
#
# 需要的環境變數：
#   DEPLOY_DIR  nginx root 指到的目錄（out/ 內容要放這；預設 /var/www/ltn-video）

set -euo pipefail

# 專案根目錄（本腳本在 repo/scripts/ 底下）
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/ltn-video}"

cd "$REPO_DIR"

echo "[$(date '+%F %T')] 開始重新 build：$REPO_DIR -> $DEPLOY_DIR"

# 相依套件：有 lockfile 用 npm ci（乾淨、可重現），否則退回 npm install
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

# 產生靜態站到 out/
npm run build

if [ ! -d "$REPO_DIR/out" ]; then
  echo "錯誤：找不到 out/，build 可能失敗，取消部署。" >&2
  exit 1
fi

# 原子式換上線：先 rsync 到暫存目錄，再一次性搬移，避免使用者讀到半套檔案。
# --delete 會清掉上線目錄裡已不存在於 out/ 的舊檔（例如下架影片的舊頁）。
mkdir -p "$DEPLOY_DIR"
rsync -a --delete "$REPO_DIR/out/" "$DEPLOY_DIR/"

echo "[$(date '+%F %T')] 部署完成。"
