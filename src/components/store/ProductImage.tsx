import Image from "next/image";

// Product image with a warm bakery-style placeholder fallback.
export function ProductImage({
  src,
  alt,
  className = "",
  sizes,
}: {
  src: string | null;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-cream-200 to-blush-100 ${className}`}
        aria-label={alt}
        role="img"
      >
        <span className="text-5xl" aria-hidden>
          🍪
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? "(max-width: 768px) 100vw, 360px"}
        className="object-cover"
      />
    </div>
  );
}
