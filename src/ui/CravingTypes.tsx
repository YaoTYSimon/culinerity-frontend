import { CRAVING_TYPES, type CravingTypeId, type FoodItem } from '@culinerity/core';
import { photoFor } from '../assets/photos';
import { CRAVING_ICON, CravingTypeIcon } from './cravingTypeIcons';
import { RecipeIcon, iconKindFor } from './recipeIcons';
import { RoundPhoto } from './RoundPhoto';

export type CravingTypeChoice = CravingTypeId | 'all';

const pill = 'focus-ring motion-colors inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold';

/** A horizontally scrollable row of round type pills, "All" first. State lives in the caller. */
export function CravingTypePills({ value, onChange }: { value: CravingTypeChoice; onChange: (v: CravingTypeChoice) => void }) {
  const items: Array<{ id: CravingTypeChoice; label: string }> = [{ id: 'all', label: 'All' }, ...CRAVING_TYPES];
  return (
    <div role="group" aria-label="Craving types" className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((t) => (
        <button
          key={t.id} type="button" aria-pressed={value === t.id} onClick={() => onChange(t.id)}
          className={`${pill} ${value === t.id ? 'bg-accent text-accent-ink' : 'bg-surface text-ink'}`}
        >
          <CravingTypeIcon type={t.id} />
          {t.label}
        </button>
      ))}
    </div>
  );
}

const tile = 'group flex min-h-11 flex-col items-center gap-2 text-center text-sm font-semibold text-ink outline-none';
const ring = 'group-focus-visible:ring-2 group-focus-visible:ring-ink group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-bg';

/** The round photo (or round icon when there is no photo) tiles, one per craving. */
export function CravingTiles({ cravings, onPick }: { cravings: FoodItem[]; onPick: (c: FoodItem) => void }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
      {cravings.map((c, i) => (
        <button key={c.id} type="button" className={tile} onClick={() => onPick(c)}>
          {photoFor(c.id) ? (
            <RoundPhoto itemId={c.id} size={120} fluid eager={i < 4} className={`aspect-square w-full max-w-[140px] ${ring}`} />
          ) : (
            <RecipeIcon kind={CRAVING_ICON[c.id] ?? iconKindFor(c.id)} size="fill" className={ring} />
          )}
          {c.name}
        </button>
      ))}
    </div>
  );
}
