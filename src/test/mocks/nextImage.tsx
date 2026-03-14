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
  fill,
  priority,
  ...rest
}: ImageProps) {
  void fill;
  void priority;
  const resolvedSrc = typeof src === "string" ? src : src?.src || "";
  return <img src={resolvedSrc} alt={alt} {...rest} />;
}
