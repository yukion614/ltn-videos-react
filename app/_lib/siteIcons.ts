import type { Metadata } from "next";

/** 站台預設分享圖：og:image 與 image_src 的共同後備。 */
export const SITE_SHARE_IMAGE =
  "https://video.ltn.com.tw/assets/images/1200_LTN.png";

const APPLE_TOUCH_ICON = "https://www.ltn.com.tw/assets/images/ltn.png";

/**
 * 組出 metadata.icons。
 *
 * Next 的 metadata 是淺層合併：頁面只要宣告 icons，layout 的整包 icons
 * （favicon、apple-touch-icon…）就會被取代。因此需要讓 image_src 跟著影片變動的
 * 頁面不能只宣告 image_src，必須用這支函式把其餘圖示一併帶上。
 *
 * @param imageSrc 舊版分享服務（image_src）要用的圖；省略時用站台預設圖。
 */
export function buildSiteIcons(
  imageSrc: string = SITE_SHARE_IMAGE,
): Metadata["icons"] {
  return {
    icon: "/faviconV2.png",
    // iOS 加到主畫面用的圖示
    apple: [{ url: APPLE_TOUCH_ICON, sizes: "180x180" }],
    other: [
      { rel: "apple-touch-icon-precomposed", url: APPLE_TOUCH_ICON },
      // 舊版分享服務抓縮圖用
      { rel: "image_src", url: imageSrc },
    ],
  };
}
