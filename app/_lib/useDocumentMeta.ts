"use client";

import { useEffect } from "react";

// 靜態匯出（output:"export"）站的動態外殼頁沒有 server 端 generateMetadata，
// 只能在瀏覽器把 API 回來的 SEO 資料補進 <head>。此 hook 就負責這件事：
// 依傳入的資料 upsert <title>、description、canonical 與 OG / Twitter 標籤，
// 元件卸載（SPA 換頁）時再把改動還原，避免舊頁的 meta 殘留到下一頁。
//
// ※ 社群爬蟲（FB/LINE/X）不執行 JS，拿不到這裡注入的標籤；這只保證瀏覽器分頁
//   標題、以及會跑 JS 的消費端（如站內、部分預覽服務）能取得正確 meta。
//   完整的分享預覽仍需該頁在 build 時被預先產生。
export interface DocMeta {
  title?: string;
  description?: string;
  canonicalUrl?: string; // 同時用於 <link rel="canonical"> 與 og:url
  imageUrl?: string; // og:image / twitter:image
  ogType?: string; // og:type，預設 website
}

export function useDocumentMeta(meta: DocMeta | null | undefined) {
  const { title, description, canonicalUrl, imageUrl, ogType } = meta ?? {};

  useEffect(() => {
    // 全空就什麼都不做（例如資料還沒回來）
    if (!title && !description && !canonicalUrl && !imageUrl) return;

    const head = document.head;
    // 卸載時逐一還原（後進先出）
    const restores: Array<() => void> = [];

    // upsert 一個 <meta>：存在就改 content（記錄舊值以還原），不存在就新建（卸載時移除）
    const setMeta = (attr: "name" | "property", key: string, content?: string) => {
      if (!content) return;
      let el = head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (el) {
        const prev = el.getAttribute("content");
        const node = el;
        el.setAttribute("content", content);
        restores.push(() => {
          if (prev === null) node.removeAttribute("content");
          else node.setAttribute("content", prev);
        });
      } else {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        el.setAttribute("content", content);
        head.appendChild(el);
        const node = el;
        restores.push(() => node.remove());
      }
    };

    // upsert <link rel="canonical">
    const setLink = (rel: string, href?: string) => {
      if (!href) return;
      let el = head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (el) {
        const prev = el.getAttribute("href");
        const node = el;
        el.setAttribute("href", href);
        restores.push(() => {
          if (prev === null) node.removeAttribute("href");
          else node.setAttribute("href", prev);
        });
      } else {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        el.setAttribute("href", href);
        head.appendChild(el);
        const node = el;
        restores.push(() => node.remove());
      }
    };

    if (title) {
      const prevTitle = document.title;
      document.title = title;
      restores.push(() => {
        document.title = prevTitle;
      });
    }

    setMeta("name", "description", description);
    setLink("canonical", canonicalUrl);

    setMeta("property", "og:type", ogType || "website");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:image", imageUrl);

    setMeta("name", "twitter:card", imageUrl ? "summary_large_image" : "summary");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", imageUrl);

    return () => {
      for (let i = restores.length - 1; i >= 0; i--) restores[i]();
    };
  }, [title, description, canonicalUrl, imageUrl, ogType]);
}
