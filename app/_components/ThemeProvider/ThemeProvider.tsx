"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextThemesProvider
      attribute="data-theme" //設定名稱 之後透過這個名稱來設定模式
      defaultTheme="system" //預設模式 system 為 作業系統而定
      enableSystem
    >
      {children}
    </NextThemesProvider>
  );
}
