import { useEffect, useState } from "react";
import { getFoodImage } from "@/lib/food-images";
import { getFoodVisual } from "@/lib/food-display";

/**
 * Food thumbnail: a real photograph where we have one, the emoji otherwise.
 *
 * The fallback swaps to the emoji rather than hiding the image, so a broken or
 * blocked CDN request leaves a complete card instead of an empty square.
 */
interface FoodAvatarProps {
  name: string;
  /** Tailwind sizing classes for the square, e.g. "h-14 w-14". */
  className?: string;
  /** Font size class used when falling back to the emoji. */
  emojiClassName?: string;
  /** Corner rounding; photos read better slightly squared than fully round. */
  rounded?: string;
}

export const FoodAvatar = ({
  name,
  className = "h-14 w-14",
  emojiClassName = "text-2xl",
  rounded = "rounded-xl",
}: FoodAvatarProps) => {
  const visual = getFoodVisual(name);
  const src = getFoodImage(name);
  const [failed, setFailed] = useState(false);

  // A new food in the same slot deserves a fresh attempt at its photo.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center ${rounded} ${visual.ring} ${className} ${emojiClassName}`}
        role="img"
        aria-label={name}
      >
        {visual.emoji}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      width={80}
      height={80}
      onError={() => setFailed(true)}
      className={`shrink-0 bg-muted object-cover ${rounded} ${className}`}
    />
  );
};

export default FoodAvatar;
