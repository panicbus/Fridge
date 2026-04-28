import React from 'react';

export type CachedMealImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  'src'
> & {
  src: string;
};

/**
 * Recipe thumbnails load from HTTPS in the renderer. A previous disk-cache path
 * returned file:// URLs from the main process; Chromium blocks those from
 * http://localhost (dev) and from many file:// app origins, which showed broken
 * images everywhere.
 */
export default function CachedMealImage({
  src,
  ...imgProps
}: CachedMealImageProps) {
  const url = src?.trim();
  if (!url) return null;
  return <img src={url} {...imgProps} />;
}
