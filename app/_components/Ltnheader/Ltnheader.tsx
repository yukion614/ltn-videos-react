import Link from "next/link";
import style from "./Ltnheader.module.scss";
import SearchForm from "./SearchForm";
import HeaderKeyword from "./HeaderKeyword";

export default function Ltnheader() {
  return (
    <div
      className={`${style.ltnheader} boxTitle  boxText`}
      data-desc="置頂選單"
    >
      <div className={style.row1}>
        <Link
          title="自由時報"
          href="/home"
          data-desc="自由時報"
          className={style.logo}
        >
          <img
            src="https://cache.ltn.com.tw/images/ltn_logo.png"
            alt="自由時報"
            width={185}
            height={38}
          />
        </Link>

        {/* <!-- 手機側邊欄選單用 --> */}
        <div className="ltnSearch"></div>
        <div className="nav_bar"></div>

        {/* <!-- 關鍵字 --> */}
        <HeaderKeyword />

        {/* 展開搜尋 */}
        <SearchForm />
      </div>

      {/* <!-- Header 選單 --> */}
      <div className={style.row2}>
        <span className={style.slipR}>〉</span>
        <ul>
          {/* <li className="h_kw"><a>關鍵字五字</a></li> */}
          <li>
            <Link
              title="即時"
              href="https://news.ltn.com.tw/list/breakingnews"
              data-desc="即時"
            >
              即時
            </Link>
          </li>
          <li>
            <Link
              title="熱門"
              href="/top"
              // href="https://news.ltn.com.tw/list/breakingnews/popular"
              data-desc="熱門"
            >
              熱門
            </Link>
          </li>
          <li>
            <Link
              title="政治"
              // href="https://news.ltn.com.tw/list/breakingnews/politics"
              href="/politics"
              data-desc="政治"
            >
              政治
            </Link>
          </li>
          <li className="li_rich">
            <Link
              title="財富自由"
              href="https://stock.ltn.com.tw"
              data-desc="財富自由"
              target="_blank"
            >
              財富自由
            </Link>
          </li>
          <li>
            <Link title="軍武" href="https://def.ltn.com.tw" data-desc="軍武">
              軍武
            </Link>
          </li>
          <li>
            <Link
              title="社會"
              href="https://news.ltn.com.tw/list/breakingnews/society"
              data-desc="社會"
            >
              社會
            </Link>
          </li>
          <li>
            <Link
              title="生活"
              href="https://news.ltn.com.tw/list/breakingnews/life"
              data-desc="生活"
            >
              生活
            </Link>
          </li>
          <li>
            <Link
              title="健康"
              href="https://health.ltn.com.tw"
              data-desc="健康"
            >
              健康
            </Link>
          </li>
          <li>
            <Link
              title="國際"
              href="https://news.ltn.com.tw/list/breakingnews/world"
              data-desc="國際"
            >
              國際
            </Link>
          </li>
          <li>
            <Link
              title="地方"
              href="https://news.ltn.com.tw/list/breakingnews/local"
              data-desc="地方"
            >
              地方
            </Link>
          </li>
          <li>
            <Link
              title="蒐奇"
              href="https://news.ltn.com.tw/list/breakingnews/novelty"
              data-desc="蒐奇"
            >
              蒐奇
            </Link>
          </li>
          <li>
            <a title="影音" href="https://video.ltn.com.tw" data-desc="影音">
              影音
            </a>
          </li>
          <li>
            <Link title="財經" href="https://ec.ltn.com.tw" data-desc="財經">
              財經
            </Link>
          </li>
          <li>
            <Link title="娛樂" href="https://ent.ltn.com.tw" data-desc="娛樂">
              娛樂
            </Link>
          </li>
          <li>
            <Link title="汽車" href="https://auto.ltn.com.tw" data-desc="汽車">
              汽車
            </Link>
          </li>
          <li>
            <Link
              title="時尚"
              href="https://istyle.ltn.com.tw"
              data-desc="時尚"
            >
              時尚
            </Link>
          </li>
          <li>
            <Link
              title="體育"
              href="https://sports.ltn.com.tw"
              data-desc="體育"
            >
              體育
            </Link>
          </li>
          <li>
            <Link title="3C" href="https://3c.ltn.com.tw" data-desc="3C">
              3 C
            </Link>
          </li>
          <li>
            <Link title="評論" href="https://talk.ltn.com.tw" data-desc="評論">
              評論
            </Link>
          </li>
          <li>
            <Link title="藝文" href="https://art.ltn.com.tw" data-desc="藝文">
              藝文
            </Link>
          </li>
          <li>
            <Link
              title="玩咖"
              href="https://playing.ltn.com.tw"
              data-desc="玩咖"
            >
              玩咖
            </Link>
          </li>
          <li>
            <Link title="食譜" href="https://food.ltn.com.tw" data-desc="食譜">
              食譜
            </Link>
          </li>
          <li>
            <Link
              title="地產"
              href="https://estate.ltn.com.tw"
              data-desc="地產"
            >
              地產
            </Link>
          </li>
          <li className="li_project">
            <Link title="專區" href="/" data-desc="專區">
              專區
            </Link>
          </li>
          <li className="li_TT">
            <Link
              title="TAIPEI TIMES"
              href="http://www.taipeitimes.com/"
              data-desc="TAIPEI TIMES"
              target="_blank"
            >
              TAIPEI TIMES
            </Link>
          </li>
          <li>
            <Link
              title="求職"
              href="https://ltn_jobs.yes123.com.tw/index.asp"
              data-desc="求職"
              target="_blank"
            >
              求職
            </Link>
          </li>
        </ul>
      </div>

      {/* <!-- 快訊 --> */}
      <div id="marqueeHeader"></div>
    </div>
  );
}
