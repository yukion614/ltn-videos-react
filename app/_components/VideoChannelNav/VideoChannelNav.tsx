"use client";
import Link from "next/link";
import style from "./VideoChannelNav.module.scss";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/app/hooks/useIsMobile";

// 白色置頂選單 —— 取自 https://video.ltn.com.tw/ 的 <div class="ltnheader"> .channel
const menuLinks = [
  { title: "即時", href: "https://news.ltn.com.tw/list/breakingnews" },
  { title: "熱門", href: "https://news.ltn.com.tw/list/breakingnews/popular" },
  { title: "政治", href: "https://news.ltn.com.tw/list/breakingnews/politics" },
  {
    title: "財富自由",
    href: "https://stock.ltn.com.tw",
    external: true,
    rich: true,
  },
  { title: "軍武", href: "https://def.ltn.com.tw" },
  { title: "社會", href: "https://news.ltn.com.tw/list/breakingnews/society" },
  { title: "生活", href: "https://news.ltn.com.tw/list/breakingnews/life" },
  { title: "健康", href: "https://health.ltn.com.tw" },
  { title: "國際", href: "https://news.ltn.com.tw/list/breakingnews/world" },
  { title: "地方", href: "https://news.ltn.com.tw/list/breakingnews/local" },
  { title: "蒐奇", href: "https://news.ltn.com.tw/list/breakingnews/novelty" },
  { title: "影音", href: "https://video.ltn.com.tw" },
  { title: "財經", href: "https://ec.ltn.com.tw" },
  { title: "娛樂", href: "https://ent.ltn.com.tw" },
  { title: "汽車", href: "https://auto.ltn.com.tw" },
  { title: "時尚", href: "https://istyle.ltn.com.tw" },
  { title: "體育", href: "https://sports.ltn.com.tw" },
  { title: "3C", href: "https://3c.ltn.com.tw", label: "3 C" },
  { title: "評論", href: "https://talk.ltn.com.tw" },
  { title: "藝文", href: "https://art.ltn.com.tw" },
  { title: "玩咖", href: "https://playing.ltn.com.tw" },
  { title: "食譜", href: "https://food.ltn.com.tw" },
  { title: "地產", href: "https://estate.ltn.com.tw" },
  {
    title: "求職",
    href: "https://ltn_jobs.yes123.com.tw/index.asp",
    external: true,
  },
];

export default function VideoChannelNav() {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  if (isMobile && pathname.startsWith("/shorts")) return null;
  return (
    <div className={style.ltnheader} data-desc="置頂選單">
      <div className={style.channel}>
        <Link
          href="https://www.ltn.com.tw"
          className={style.logo}
          title="自由時報"
          data-desc="自由時報"
        >
          <img
            src="https://cache.ltn.com.tw/images/ltn_logo.png"
            alt="自由時報"
            title="自由時報"
            width={160}
            height={33}
          />
        </Link>

        <ul>
          {menuLinks.map((link) => (
            <li
              key={link.href}
              className={link.rich ? style.li_rich : undefined}
            >
              <Link
                href={link.href}
                title={link.title}
                data-desc={link.title}
                target={link.external ? "_blank" : undefined}
              >
                {link.label ?? link.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
