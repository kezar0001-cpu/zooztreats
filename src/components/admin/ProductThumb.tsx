import Image from "next/image";

export function ProductThumb({
  src,
  alt,
  size = 56,
}: {
  src: string | null;
  alt: string;
  size?: number;
}) {
  if (!src) {
    return (
      <div
        className="flex items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400"
        style={{ width: size, height: size }}
      >
        No image
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-md bg-gray-100"
      style={{ width: size, height: size }}
    >
      <Image src={src} alt={alt} fill sizes={`${size}px`} className="object-cover" />
    </div>
  );
}
