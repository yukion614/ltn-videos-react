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
  title: "自由影音",
  description: "自由影音首頁",
  icons: {
    icon: "/faviconV2.png",
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
