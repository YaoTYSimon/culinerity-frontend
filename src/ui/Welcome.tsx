import { photoUrl } from '../assets/photos';
import { PillButton } from './PillButton';
import { Plate } from './Plate';
import { RoundPhoto } from './RoundPhoto';

interface Props {
  onFindNumber: () => void;
  onSkip: () => void;
}

const PHOTOS = ['welcome-curry', 'welcome-soup', 'welcome-pancakes'] as const;

/** Shown once to a first-time visitor. Never a gate: "Skip" goes straight to the swaps. */
export function Welcome({ onFindNumber, onSkip }: Props) {
  return (
    <div className="grid gap-6 pb-4 pt-2">
      <div className="grid gap-3">
        <h1 tabIndex={-1} className="font-display text-[30px] text-balance outline-none">How much is food on your mind?</h1>
        <p className="text-base text-pretty text-muted">
          Two minutes, one number out of 100. 100 is secure, 0 is critical. It stays on your phone.
        </p>
      </div>
      <Plate score={null} className="mx-auto max-w-[220px]" />
      <div className="flex justify-center -space-x-3" aria-hidden="true">
        {PHOTOS.map((name) => (
          <RoundPhoto key={name} src={photoUrl(name)} size={88} eager className="ring-4 ring-bg" />
        ))}
      </div>
      <div className="grid justify-items-center gap-2">
        <PillButton onClick={onFindNumber} className="w-full">Find my number</PillButton>
        <PillButton variant="text" onClick={onSkip}>Skip to cheaper swaps</PillButton>
      </div>
    </div>
  );
}
