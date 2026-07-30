import type { Metadata } from "next";

/**
 * 站台網域。全站唯一來源：layout 的 metadataBase 也用這個，換網域只改這一行。
 */
export const SITE_ORIGIN = "https://videos.ltn.com.tw";

/**
 * 站台預設分享圖：og:image 與 image_src 的共同後備。檔案在 public/1200_LTN.png。
 *
 * 這裡組成完整網址而非直接寫 "/1200_LTN.png"：openGraph / twitter 的圖 Next 會用
 * metadataBase 自動補上網域，但 icons（image_src 屬於它）不會，相對路徑會原樣輸出，
 * 不執行 JS 的舊分享服務解不出來。
 */
export const SITE_SHARE_IMAGE = `${SITE_ORIGIN}/1200_LTN.png`;

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
