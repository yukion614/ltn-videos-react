import {
  useNavigate,
  useLocation,
  useParams as useRouterParams,
} from "react-router-dom";

/**
 * next/navigation 的薄殼替身：把 App Router 的導航 API 對應到 react-router。
 * 只實作 app 實際用到的：usePathname / useParams / useRouter / notFound / redirect。
 */

// Navbar 用 pathname.includes(...) 判斷 active
export function usePathname() {
  return useLocation().pathname;
}

// programs/[category] 用 params.category；其餘動態頁用 params.id
export function useParams<
  T extends Record<string, string | string[]> = Record<string, string>,
>(): T {
  return useRouterParams() as unknown as T;
}

// programs/[category] 用 router.replace("/programs")
export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => {},
    prefetch: () => {},
  };
}

// CSR 沒有 server 的 notFound，丟出錯誤交給路由的 errorElement 處理
export function notFound(): never {
  throw new Response("Not Found", { status: 404 });
}

// 少數情況用到的 redirect：拋出讓上層處理（app 目前未在 client 路徑使用）
export function redirect(href: string): never {
  throw new Response(null, { status: 302, headers: { Location: href } });
}

export function useSearchParams() {
  const search = useLocation().search;
  return [new URLSearchParams(search)] as const;
}
