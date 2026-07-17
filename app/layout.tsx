import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "./_components/Navbar/Navbar";
import FooterMenu from "./_components/FooterMenu/FooterMenu";
import Footer from "./_components/Footer/Footer";
import ThemeProvider from "./_components/ThemeProvider/ThemeProvider";
import VideoChannelNav from "./_components/VideoChannelNav/VideoChannelNav";
import PvTracker from "./_components/PvTracker/PvTracker";
import Script from "next/script";
// fonts
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  // 站台網域基準：讓下方的 canonical / og:url 等相對路徑能解析成完整網址
  metadataBase: new URL("https://videos.ltn.com.tw"),
  title: "自由影音",
  description: "直擊新聞現場，透過畫面掌握即時新聞脈動。",
  applicationName: "自由時報電子報",
  authors: [{ name: "自由時報電子報" }],
  // 正規網址（避免重複內容被分散權重）；輸出 <link rel="canonical">
  alternates: {
    canonical: "/",
  },
  // Google Search Console 網站擁有權驗證；輸出 <meta name="google-site-verification">
  verification: {
    google: "sPp7Kk7Tqa6LK-wWblS9Fby069Wpy4DNTaMyjKHxveU",
  },
  keywords: [
    "自由影音",
    "自由時報",
    "自由時報電子報",
    "Liberty Times Net",
    "LTN",
  ],
  // 讓搜尋引擎收錄並允許大張圖片預覽（對齊官網 max-image-preview:large）
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  icons: {
    icon: "/faviconV2.png",
    // iOS 加到主畫面用的圖示（官網有、原本專案缺）
    apple: [
      { url: "https://www.ltn.com.tw/assets/images/ltn.png", sizes: "180x180" },
    ],
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "https://www.ltn.com.tw/assets/images/ltn.png",
      },
      // 舊版分享服務抓縮圖用
      {
        rel: "image_src",
        url: "https://video.ltn.com.tw/assets/images/1200_LTN.png",
      },
    ],
  },
  // 首頁層級的 Open Graph 預設值；影片／短影音詳情頁會再各自覆蓋
  openGraph: {
    type: "website",
    siteName: "自由時報電子報",
    title: "自由電子報影音頻道",
    description: "直擊新聞現場，透過畫面掌握即時新聞脈動。",
    // 分享到社群時的正規網址；相對路徑會用 metadataBase 補成完整網址
    url: "/",
    locale: "zh_TW",
    images: [
      {
        url: "https://video.ltn.com.tw/assets/images/1200_LTN.png",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary",
    site: "@ltntw",
    creator: "@ltntw",
    title: "自由電子報影音頻道",
    description: "直擊新聞現場，透過畫面掌握即時新聞脈動。",
    images: ["https://video.ltn.com.tw/assets/images/1200_LTN.png"],
  },
  other: {
    // Google News 專用關鍵字
    news_keywords: "自由影音, 自由時報, 自由時報電子報, Liberty Times Net, LTN",
    copyright: "自由時報電子報",
    "dcterms.rightsHolder": "自由時報電子報",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant-TW" suppressHydrationWarning>
      <head>
        {/* Facebook 應用程式 ID：FB 分享成效統計用。
            必須是 property 形式，FB 爬蟲才讀得到；Next Metadata 的 other 只會輸出
            name=，故在此直接放原生標籤。 */}
        <meta property="fb:app_id" content="140490219413038" />

        {/* Google Tag Manager */}
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-P98PP75');`}
        </Script>
        {/* End Google Tag Manager */}

        {/* Google Analytics (Universal Analytics) */}
        <Script id="ga-ua" strategy="afterInteractive">
          {`(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');
ga('create','UA-31404335-1','auto');
ga('require','displayfeatures');
ga('require','linkid','linkid.js');
ga('send','pageview');`}
        </Script>
        {/* End Google Analytics */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-P98PP75"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}

        <ThemeProvider>
          <VideoChannelNav />
          <Navbar />
          {children}

          {/* ① 先定義 c.js 需要的全域變數，一定要在 c.js 之前 */}
          <Script id="pv-config" strategy="beforeInteractive">
            {`window.pvServer = "pv.ltn.com.tw";`}
          </Script>

          {/* ② 載入 c.js + ③ 首次/換頁計 PV（都在這個 client 元件裡） */}
          <PvTracker />

          <FooterMenu />
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
