import type { ReactNode } from 'react';
import { photoUrl, type PhotoName } from '../assets/photos';
import { RoundPhoto } from './RoundPhoto';

interface Props {
  /** Which bundled photograph sits beside the heading. */
  photo: PhotoName;
  /** The heading (and an optional sentence) on the left. */
  children: ReactNode;
  /** Diameter in px; one size at every width keeps the heading from reflowing between viewports. */
  size?: number;
}

/** A screen's heading with one round photograph beside it: the photo is decorative, so it has no alt text. */
export function PageHeader({ photo, children, size = 96 }: Props) {
  return (
    <div className="flex items-start gap-4">
      <div className="grid min-w-0 flex-1 gap-3">{children}</div>
      <RoundPhoto src={photoUrl(photo)} size={size} eager className="mt-1" />
    </div>
  );
}
