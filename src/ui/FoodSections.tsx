import { labelFor, occasionDefs, type FoodProfile } from '@culinerity/core';
import { RULE_COPY } from './foodCopy';
import { PillButton } from './PillButton';

export type FoodSection = 'traditions' | 'rules' | 'allergies' | 'occasions';

const HEADINGS: Record<FoodSection, string> = {
  traditions: 'Food traditions',
  rules: 'Food rules',
  allergies: 'To avoid',
  occasions: 'Occasions',
};

/** The person's choices in their own words, one list per section. Own text is shown back verbatim. */
function lines(food: FoodProfile, section: FoodSection): string[] {
  switch (section) {
    case 'traditions':
      return food.traditions.map((t) => labelFor(t));
    case 'rules':
      return food.rules.map((r) => RULE_COPY[r].label);
    case 'allergies':
      return food.allergies;
    case 'occasions': {
      const defs = occasionDefs();
      return food.occasions.map((id) => defs.find((d) => d.id === id)?.label ?? id);
    }
  }
}

interface Props {
  food: FoodProfile | undefined;
  /** Opens the step for that section. */
  onChange: (section: FoodSection) => void;
}

/** What the person chose, section by section, each with a "Change" button. Shared by the review step and the summary. */
export function FoodSections({ food, onChange }: Props) {
  const sections = Object.keys(HEADINGS) as FoodSection[];
  return (
    <dl className="grid gap-4">
      {sections.map((section) => {
        const items = food ? lines(food, section) : [];
        return (
          <div key={section} className="grid min-w-0 gap-1">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-base font-semibold">{HEADINGS[section]}</dt>
              <PillButton variant="text" aria-label={`Change ${section}`} onClick={() => onChange(section)} className="-mr-3 shrink-0">
                Change
              </PillButton>
            </div>
            <dd className="min-w-0 text-base text-pretty [overflow-wrap:anywhere]">
              {items.length > 0 ? items.join(', ') : <span className="text-muted">Nothing chosen</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
