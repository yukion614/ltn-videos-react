"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/styles/videopage.module.scss";

// 影片內文：手機版若內容過長，先收合並顯示「更多內容」，點擊展開／收合。
// 收合的高度上限只在手機斷點（<=640px）生效，桌機不夾高，
// 因此桌機量到的 scrollHeight === clientHeight，collapsible 為 false，不顯示按鈕。
export default function ExpandableContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [collapsible, setCollapsible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 內容實際高度超過收合高度才需要「更多內容」；展開時不比對（此時無夾高）
    const check = () => {
      if (expanded) return;
      setCollapsible(el.scrollHeight > el.clientHeight + 4);
    };

    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [html, expanded]);

  return (
    <div className={styles.expandable}>
      <div
        ref={ref}
        className={`${styles.articleContent} ${
          expanded ? styles.contentExpanded : styles.contentCollapsed
        }`}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {collapsible ? (
        <button
          type="button"
          className={styles.moreToggle}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? "收合" : "更多內容"}
          <svg
            className={expanded ? styles.moreIconUp : styles.moreIcon}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M6 9l6 6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
