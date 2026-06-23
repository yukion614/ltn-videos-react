import { Fragment } from "react";
import Link from "next/link";
import styles from "./Crumb.module.scss";

interface crumbsProps {
  href: string;
  label: string;
}

export default function Crumb({ crumbs }: { crumbs: crumbsProps[] }) {
  return (
    <nav className={styles.crumbs} aria-label="頁面路徑">
      {crumbs.map((crumb, index) => {
        return (
          <Fragment key={index}>
            <Link href={crumb.href}>{crumb.label}</Link>
            {index !== crumbs.length - 1 && <span aria-hidden="true">›</span>}
          </Fragment>
        );
      })}
    </nav>
  );
}
