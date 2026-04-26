import React, { useEffect, useState } from 'react';

export type CachedMealImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  'src'
> & {
  src: string;
};

/**
 * In Electron, resolves TheMealDB image URLs through the main-process disk cache
 * (see electron/imageCache.ts). In the browser (e.g. vite preview), uses src directly.
 */
export default function CachedMealImage({
  src,
  ...imgProps
}: CachedMealImageProps) {
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    const api = window.mealImageCache;
    if (!api) {
      setResolved(src);
      return;
    }
    setResolved(null);
    let cancelled = false;
    void api.resolve(src).then((url) => {
      if (!cancelled) setResolved(url);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!resolved) {
    return null;
  }

  return <img src={resolved} {...imgProps} />;
}
