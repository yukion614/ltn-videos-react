import React from "react";

/**
 * next/link 的薄殼替身：嵌入版沒有 Next client router，
 * 直接渲染原生 <a>。首頁子樹只會傳 href / className / draggable / children。
 * 過濾掉 <a> 不認得的 Next 專屬 props（prefetch / scroll / replace / shallow）。
 */
interface NextLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string | { pathname?: string };
  prefetch?: boolean;
  scroll?: boolean;
  replace?: boolean;
  shallow?: boolean;
}

export default function Link({
  href,
  children,
  prefetch,
  scroll,
  replace,
  shallow,
  ...rest
}: NextLinkProps) {
  const url = typeof href === "string" ? href : href?.pathname ?? "#";
  return (
    <a href={url} {...rest}>
      {children}
    </a>
  );
}
