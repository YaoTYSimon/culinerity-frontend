import { useState } from 'react';
import { shareText, weekSummary, type Aud, type WeekSwap } from '@culinerity/core';
import { photoUrl } from '../assets/photos';
import { FIELD_EDGE } from './formParts';
import { EmptyPlate } from './illustrations/EmptyPlate';
import { PillButton } from './PillButton';
import { RoundPhoto } from './RoundPhoto';

interface Props {
  week: WeekSwap[] | undefined;
  /** Current ISO time, injected from one place. */
  now: string;
  onRemoveOne: (itemId: string) => void;
  onClear: () => void;
  onSeeSwaps: () => void;
}

/**
 * Money rule: the headline claims whole dollars, rounded DOWN so we never overstate
 * ("$27" for $27.90); under a dollar it shows cents ("$0.60"). Rows and the share text
 * always show cents ("$9.80").
 */
export function headlineAmount(total: Aud): string {
  if (total > 0 && total < 1) return `$${total.toFixed(2)}`;
  return `$${Math.floor(total + 1e-9)}`;
}
const cents = (n: Aud): string => `$${n.toFixed(2)}`;

/** `forText` ties a notice to the week it was about, so it disappears when the week changes. */
type Notice = { kind: 'copied' | 'failed'; forText: string } | null;

/** The shareable week: savings only, never the score, answers, finances, suburb or name. */
export function WeekCard({ week, now, onRemoveOne, onClear, onSeeSwaps }: Props) {
  const summary = weekSummary(week, now);
  const [stored, setNotice] = useState<Notice>(null);
  const text = shareText(summary);
  const notice = stored?.forText === text ? stored : null;

  const share = async () => {
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ text });
        setNotice(null);
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setNotice({ kind: 'copied', forText: text });
        return;
      }
      setNotice({ kind: 'failed', forText: text });
    } catch (e) {
      // Closing the share sheet is not a failure.
      setNotice(e instanceof DOMException && e.name === 'AbortError' ? null : { kind: 'failed', forText: text });
    }
  };

  if (summary.items.length === 0) {
    return (
      <div className="grid gap-4">
        <EmptyPlate size={112} />
        <h1 tabIndex={-1} className="font-display text-[30px] leading-tight font-bold text-balance outline-none">Nothing in your week yet.</h1>
        <p className="text-base text-pretty text-muted">
          When you add a swap, it lands here, and you can share what you saved.
        </p>
        <div>
          <PillButton onClick={onSeeSwaps}>See swaps</PillButton>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <RoundPhoto src={photoUrl('welcome-soup')} size={180} eager />
      <h1 tabIndex={-1} className="font-display text-[32px] leading-tight font-bold text-balance outline-none">
        I saved {headlineAmount(summary.total)} on food in the last 7 days.
      </h1>

      <ul className="grid gap-1">
        {summary.items.map((i) => (
          <li key={i.itemId} className="flex min-h-11 items-center gap-2">
            <span className="min-w-0 flex-1 text-sm break-words">
              {i.name}
              {i.count > 1 ? ` ×${i.count}` : ''}
            </span>
            <span className="shrink-0 text-sm font-extrabold">{cents(i.saving)}</span>
            <PillButton
              variant="text"
              className="shrink-0 text-xs"
              aria-label={`Remove one ${i.name}`}
              onClick={() => onRemoveOne(i.itemId)}
            >
              Remove one
            </PillButton>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted">Made with Culinerity. Savings only: no score, no name.</p>

      <div className="flex flex-wrap items-center gap-3">
        <PillButton onClick={share}>Share</PillButton>
        <PillButton variant="text" onClick={onClear}>Clear week</PillButton>
      </div>

      <div role="status" aria-live="polite" className="text-sm text-muted">
        {notice?.kind === 'copied' && 'Copied'}
        {notice?.kind === 'failed' && "Couldn't share. You can copy it by hand."}
      </div>
      {/* A multi-line box cannot be rounded-full (it would become an ellipse and clip the text): a large fixed radius reads as fully round at this height. */}
      {notice?.kind === 'failed' && (
        <textarea
          readOnly
          aria-label="Text to copy"
          value={text}
          rows={Math.min(10, text.split('\n').length + 1)}
          onFocus={(e) => e.currentTarget.select()}
          className={`focus-ring w-full rounded-[2rem] bg-surface px-5 py-3 text-sm text-ink ${FIELD_EDGE}`}
        />
      )}
    </div>
  );
}
