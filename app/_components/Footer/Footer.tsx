import Image from "next/image";
import style from "./Footer.module.scss";

export default function Footer() {
  return (
    <footer
      className={`${style.features_footer} ${style.boxTitle}`}
      data-desc="底部選單"
    >
      <a href="https://www.ltn.com.tw/" title="自由時報" data-desc="自由時報">
        <Image
          src="https://cache.ltn.com.tw/images/logo_foot.png"
          width={110}
          height={30}
          alt="自由時報"
          title="自由時報"
        />
      </a>
      <p>
        自由時報版權所有不得轉載{" "}
        <span>
          © 2026 The Liberty Times. All Rights Reserved.<span></span>
        </span>
      </p>
    </footer>
  );
}
