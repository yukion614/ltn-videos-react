import React from "react";
import { createRoot } from "react-dom/client";

// 帶上首頁需要的 CSS 變數與基礎樣式（Tailwind 由 postcss.config.mjs 自動處理）
import "../app/globals.css";

// 直接複用 Next 首頁元件，不經過 app/layout.tsx，
// 因此 Ltnheader / Navbar / Footer 都不會被打包進來 —— 版面只剩 CI 的 header。
import Home from "../app/page";

const MOUNT_ID = "ltn-video-root";

function mount() {
  const el = document.getElementById(MOUNT_ID);
  if (!el) {
    console.warn(`[ltn-video] 找不到掛載點 #${MOUNT_ID}`);
    return;
  }
  createRoot(el).render(
    <React.StrictMode>
      <Home />
    </React.StrictMode>,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
