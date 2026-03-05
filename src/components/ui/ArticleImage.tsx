"use client";

import { useState } from "react";

interface ArticleImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSeed?: string;
}

export default function ArticleImage({
  src,
  alt,
  className = "",
  fallbackSeed,
}: ArticleImageProps) {
  const [error, setError] = useState(false);

  const fallbackUrl = `https://picsum.photos/seed/${fallbackSeed || alt.slice(0, 20)}/800/400`;
  const displaySrc = !src || error ? fallbackUrl : src;

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      onError={() => !error && setError(true)}
    />
  );
}
