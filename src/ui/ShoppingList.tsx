import { useMemo } from 'react';
import { clearList, listTotalCents, recipesData, removeEntry, type ShoppingEntry } from '@culinerity/core';
import { formatDollars } from './money';
import { PillButton } from './PillButton';
import type { NavTarget } from './views';

interface Props {
  list: ShoppingEntry[];
  /** The new list and a sentence for the status line; the host saves it and offers Undo. */
  onChange: (next: ShoppingEntry[], message: string) => void;
  onNavigate: (to: NavTarget) => void;
}

/** What the person chose to buy. Device only; the sample total shows only when every entry is priced. */
export function ShoppingList({ list, onChange, onNavigate }: Props) {
  const prices = useMemo(() => new Map(recipesData.prices.map((p) => [p.ingredient, p.perKg])), []);
  const total = listTotalCents(list, prices);
  return (
    <section aria-labelledby="shopping-list" className="grid gap-2">
      <h2 id="shopping-list" className="font-display text-[24px]">Shopping list</h2>
      <ul aria-label="Shopping list" className="grid">
        {list.map((e) => (
          <li key={e.id} className="flex min-h-11 items-center gap-2 py-1">
            <span className="min-w-0 flex-1 break-words text-base font-semibold [overflow-wrap:anywhere]">{e.name}</span>
            <PillButton variant="text" className="shrink-0 text-sm" aria-label={`Remove ${e.name} from the list`} onClick={() => onChange(removeEntry(list, e.id).list, `Removed ${e.name} from the list.`)}>Remove</PillButton>
          </li>
        ))}
      </ul>
      {total !== null && <p className="text-base font-semibold">{`Total: about ${formatDollars(total / 100)} (sample data)`}</p>}
      <div><PillButton variant="text" className="-ml-3" onClick={() => onChange(clearList(list).list, 'Your list is cleared.')}>Clear list</PillButton></div>
      <p className="flex flex-wrap items-center gap-x-1 text-base text-muted">
        Looking for something cheaper?
        <PillButton variant="text" onClick={() => onNavigate('swaps')}>See swaps</PillButton>
        <PillButton variant="text" onClick={() => onNavigate('budget')}>Budget</PillButton>
      </p>
    </section>
  );
}
