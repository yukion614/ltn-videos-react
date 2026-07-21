import { Fragment } from "react";
import Link from "next/link";
import styles from "./Crumb.module.scss";

interface crumbsProps {
  href?: string; // 省略時視為「目前頁面」，不可點擊
  label: string;
}

export default function Crumb({ crumbs }: { crumbs: crumbsProps[] }) {
  return (
    <nav className={styles.crumbs} aria-label="頁面路徑">
      {crumbs.map((crumb, index) => {
        return (
          <Fragment key={index}>
            {/* 關掉 prefetch：麵包屑一載入就在畫面內，預設會自動預抓上層頁而發出 ?_rsc= */}
            {crumb.href ? (
              <Link href={crumb.href} prefetch={false}>
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page">{crumb.label}</span>
            )}
            {index !== crumbs.length - 1 && (
              <span aria-hidden="true">&nbsp;›&nbsp;</span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
