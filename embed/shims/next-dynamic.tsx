import React, { lazy, Suspense } from "react";

/**
 * next/dynamic 的薄殼替身：嵌入版純 CSR，ssr 選項沒有意義，
 * 直接用 React.lazy + Suspense 還原「動態載入 + loading 佔位」的行為。
 * 首頁用法：dynamic(() => import("react-player"), { ssr:false, loading })
 */
interface DynamicOptions {
  ssr?: boolean;
  loading?: () => React.ReactNode;
}

export default function dynamic(
  loader: () => Promise<any>,
  options: DynamicOptions = {},
) {
  const Lazy = lazy(async () => {
    const mod = await loader();
    // react-player v3 走 default export；其餘情況退回模組本身
    const Component = (mod?.default ?? mod) as React.ComponentType<any>;
    return { default: Component };
  });

  const fallback = options.loading ? options.loading() : null;

  return function DynamicComponent(props: Record<string, unknown>) {
    return (
      <Suspense fallback={fallback}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}
