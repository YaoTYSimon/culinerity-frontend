import { EQUIPMENT, equipmentPhrase, type EquipmentId } from '@culinerity/core';
import { Disclosure } from './Disclosure';
import { EquipmentIcon } from './equipmentIcons';

interface Props {
  have: readonly EquipmentId[];
  onChange: (next: EquipmentId[]) => void;
}

/** "My kitchen": a closed row of round toggle pills, one per kind of equipment. Nothing ticked means nothing is filtered. */
export function KitchenPicker({ have, onChange }: Props) {
  const toggle = (id: EquipmentId) => {
    const next = new Set(have);
    if (!next.delete(id)) next.add(id);
    onChange(EQUIPMENT.map((e) => e.id).filter((x) => next.has(x)));
  };
  const chosen = EQUIPMENT.filter((e) => have.includes(e.id));
  return (
    <Disclosure
      className="w-full"
      summary={
        <span className="inline-flex items-center gap-2">
          My kitchen
          {chosen.map((e) => <EquipmentIcon key={e.id} id={e.id} className="size-4 text-muted" />)}
          {chosen.length > 0 && <span className="sr-only">{chosen.map((e) => e.label).join(', ')}</span>}
        </span>
      }
    >
      <div role="group" aria-label="My kitchen equipment" className="flex flex-wrap gap-2 pb-2">
        {EQUIPMENT.map((e) => {
          const on = have.includes(e.id);
          return (
            <button
              key={e.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(e.id)}
              className={`focus-ring motion-colors inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-base font-semibold ${on ? 'bg-accent text-accent-ink' : 'bg-surface text-ink'}`}
            >
              <EquipmentIcon id={e.id} />
              {e.label}
            </button>
          );
        })}
      </div>
    </Disclosure>
  );
}
