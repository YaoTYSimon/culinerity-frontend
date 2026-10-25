import { photoFor } from '../assets/photos';
import { FoodIllustration } from './illustrations';

interface Props {
  /** Explicit image URL; wins over the item's photo. */
  src?: string;
  /** Catalogue item id: its photo, or its drawn illustration when it has none. */
  itemId?: string;
  /** Diameter in px. */
  size: number;
  /** Decorative by default; pass text only when the photo carries meaning. */
  alt?: string;
  eager?: boolean;
  className?: string;
}

/** A photo cropped as a round plate; the drawn illustration (also masked round) when there is no photo. */
export function RoundPhoto({ src, itemId, size, alt = '', eager = false, className = '' }: Props) {
  const url = src ?? (itemId ? photoFor(itemId) : undefined);
  const box = { width: size, height: size };
  if (!url) {
    return (
      <span className={`inline-block shrink-0 overflow-hidden rounded-full bg-surface ${className}`} style={box}>
        <FoodIllustration id={itemId ?? ''} className="size-full" />
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      width={size}
      height={size}
      decoding="async"
      loading={eager ? 'eager' : 'lazy'}
      className={`shrink-0 rounded-full bg-surface object-cover ${className}`}
      style={box}
    />
  );
}
