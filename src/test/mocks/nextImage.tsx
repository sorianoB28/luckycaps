import React from "react";

type ImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string | { src: string };
  alt: string;
  fill?: boolean;
  priority?: boolean;
};

export default function NextImage({
  src,
  alt,
  fill: _fill,
  priority: _priority,
  ...rest
}: ImageProps) {
  const resolvedSrc = typeof src === "string" ? src : src?.src || "";
  return <img src={resolvedSrc} alt={alt} {...rest} />;
}

