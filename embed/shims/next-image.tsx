import React from "react";

/**
 * next/image 的薄殼替身：嵌入版不跑在 Next runtime，沒有圖片最佳化伺服器，
 * 直接渲染原生 <img>。處理首頁實際用到的 props：src / alt / width / height /
 * fill / sizes / style / className。
 */
type ImgSrc = string | { src: string };

interface NextImageProps {
  src: ImgSrc;
  alt?: string;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  sizes?: string;
  style?: React.CSSProperties;
  className?: string;
}

export default function Image({
  src,
  alt = "",
  width,
  height,
  fill,
  sizes,
  style,
  className,
}: NextImageProps) {
  const realSrc = typeof src === "string" ? src : src?.src;

  // fill 模式：Next 會讓圖片絕對定位填滿「position:relative 的父層」。
  // 這裡用同樣的方式還原，objectFit 等則沿用呼叫端傳進來的 style。
  const finalStyle: React.CSSProperties = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style }
    : { ...style };

  return (
    <img
      src={realSrc}
      alt={alt}
      sizes={sizes}
      className={className}
      style={finalStyle}
      {...(fill ? {} : { width, height })}
    />
  );
}
