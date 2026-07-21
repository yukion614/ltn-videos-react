import { Fragment } from "react";
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
            {crumb.href ? (
              <a href={crumb.href}>{crumb.label}</a>
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
