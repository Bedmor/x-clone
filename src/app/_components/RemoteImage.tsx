import Image from "next/image";
/* eslint-disable @next/next/no-img-element */

import { isR2ImageUrl } from "~/app/_lib/isR2ImageUrl";

type RemoteImageProps = {
  src?: string | null;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
  onError?: React.ReactEventHandler<HTMLImageElement>;
};

export function RemoteImage({
  src,
  fill,
  className,
  ...props
}: RemoteImageProps) {
  if (!src) {
    return null;
  }

  if (isR2ImageUrl(src)) {
    if (fill) {
      return (
        <img
          src={src}
          alt={props.alt}
          className={className}
          onClick={props.onClick}
          onError={props.onError}
          style={{
            position: "absolute",
            inset: 0,
            height: "100%",
            width: "100%",
            objectFit: "cover",
          }}
        />
      );
    }

    return (
      <img
        src={src}
        alt={props.alt}
        width={props.width}
        height={props.height}
        className={className}
        onClick={props.onClick}
        onError={props.onError}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={props.alt}
      width={props.width}
      height={props.height}
      fill={fill}
      sizes={props.sizes}
      className={className}
      onClick={props.onClick}
      onError={props.onError}
    />
  );
}
