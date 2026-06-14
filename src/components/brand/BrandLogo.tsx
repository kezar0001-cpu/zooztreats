import Image from "next/image";
import { LOGO_SRC, LOGO_ALT } from "@/lib/brand";

// Zooz Treats logo. Circular presentation by default to match the brand. The
// image is never distorted (object-contain on a square box). Swap the source in
// src/lib/brand.ts (LOGO_SRC) to use a real photo logo.
export function BrandLogo({
  size = 40,
  className = "",
  rounded = true,
  priority = false,
}: {
  size?: number;
  className?: string;
  rounded?: boolean;
  priority?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-blush-50 ${
        rounded ? "rounded-full" : "rounded-2xl"
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={LOGO_SRC}
        alt={LOGO_ALT}
        width={size}
        height={size}
        priority={priority}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
