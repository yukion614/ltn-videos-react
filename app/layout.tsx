import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "./_components/Navbar/Navbar";
import FooterMenu from "./_components/FooterMenu/FooterMenu";
import Footer from "./_components/Footer/Footer";
import Ltnheader from "./_components/Ltnheader/Ltnheader";
import ThemeProvider from "./_components/ThemeProvider/ThemeProvider";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant-TW" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <Ltnheader />
          <Navbar />
          {children}
          <FooterMenu />
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
