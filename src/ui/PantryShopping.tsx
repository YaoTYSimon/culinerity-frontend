import { formatDollars } from './money';
import type { ShoppingEntry } from '@culinerity/core';
import { PillButton } from './PillButton';

interface Props {
  list: ShoppingEntry[];
  /** Sample total in cents, or null when any entry has no price or amount. */
  totalCents: number | null;
  onRemove: (entry: ShoppingEntry) => void;
  onClear: () => void;
  onSwaps: () => void;
  onBudget: () => void;
}

/** What the person chose to buy. Device only; the total shows only when every entry is priced. */
export function PantryShopping({ list, totalCents, onRemove, onClear, onSwaps, onBudget }: Props) {
  return (
    <section aria-labelledby="pantry-shopping" className="grid gap-2">
      <h2 id="pantry-shopping" className="font-display text-[24px]">Shopping list</h2>
      <ul aria-label="Shopping list" className="grid">
        {list.map((e) => (
          <li key={e.id} className="flex min-h-11 items-center gap-2 py-1">
            <span className="min-w-0 flex-1 break-words text-base font-semibold [overflow-wrap:anywhere]">{e.name}</span>
            <PillButton variant="text" className="shrink-0 text-sm" aria-label={`Remove ${e.name} from the list`} onClick={() => onRemove(e)}>Remove</PillButton>
          </li>
        ))}
      </ul>
      {totalCents !== null && <p className="text-base font-semibold">{`Total: about ${formatDollars(totalCents / 100)} (sample data)`}</p>}
      <div><PillButton variant="text" className="-ml-3" onClick={onClear}>Clear list</PillButton></div>
      <p className="flex flex-wrap items-center gap-x-1 text-base text-muted">
        Looking for something cheaper?
        <PillButton variant="text" onClick={onSwaps}>See swaps</PillButton>
        <PillButton variant="text" onClick={onBudget}>Budget</PillButton>
      </p>
    </section>
  );
}
