import { photoFor } from '../assets/photos';
import { FoodIllustration } from './illustrations';

interface Props {
  id: string;
  /** Sizing and shape classes; applied to the photo, or to the drawing when there is no photo. */
  className?: string;
  /** Natural size in px of the square photo, used to reserve space. */
  size?: number;
  eager?: boolean;
}

/** A real photograph when the item has one, otherwise its drawn illustration. */
export function CravingPicture({ id, className = '', size = 560, eager = false }: Props) {
  const src = photoFor(id);
  if (!src) return <FoodIllustration id={id} className={className} />;
  return (
    <img
      src={src} alt="" width={size} height={size} decoding="async" loading={eager ? 'eager' : 'lazy'}
      className={`aspect-square object-cover ${className}`}
    />
  );
}
