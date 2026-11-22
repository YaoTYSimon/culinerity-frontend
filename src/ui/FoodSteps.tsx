import type { ReactNode } from 'react';
import {
  DIET_RULES, MAX_TAGS, matchAllergies, normaliseTradition, occasionDefs, traditions,
  type DietRule, type FoodProfile, type OccasionId,
} from '@culinerity/core';
import { ALLERGY_NOTE, RULE_COPY } from './foodCopy';
import { FoodSections, type FoodSection } from './FoodSections';
import { PillButton } from './PillButton';
import { TagInput } from './TagInput';

/** The steps in order; each section's "Change" opens the step with the same index. */
export const STEP_TITLES = [
  'Which food traditions fit you?',
  'Any food rules?',
  'Anything you need to avoid, like an allergy?',
  'Any occasions you would like a heads-up for?',
  'Here is what you chose',
] as const;
export const REVIEW_STEP = STEP_TITLES.length - 1;
export const SECTION_STEP: Record<FoodSection, number> = { traditions: 0, rules: 1, allergies: 2, occasions: 3 };

export const emptyDraft = (from?: FoodProfile): FoodProfile => ({
  traditions: [...(from?.traditions ?? [])],
  rules: [...(from?.rules ?? [])],
  allergies: [...(from?.allergies ?? [])],
  occasions: [...(from?.occasions ?? [])],
  dismissed: [...(from?.dismissed ?? [])],
});

interface StepProps {
  draft: FoodProfile;
  onDraft: (next: FoodProfile) => void;
}

/** A round pill that toggles; the colour change is backed by aria-pressed, never colour alone. */
function Pill({ label, selected, onToggle, disabled, describedBy }: {
  label: string; selected: boolean; onToggle: () => void; disabled?: boolean; describedBy?: string;
}) {
  return (
    <PillButton
      variant={selected ? 'primary' : 'surface'}
      aria-pressed={selected}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={onToggle}
      className="max-w-full px-5"
    >
      {label}
    </PillButton>
  );
}

const toggled = <T,>(list: T[], item: T): T[] => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

function Lead({ children }: { children: ReactNode }) {
  return <p className="text-base text-pretty text-muted">{children}</p>;
}

export function TraditionsStep({ draft, onDraft }: StepProps) {
  const starters = traditions();
  const isStarter = (t: string) => starters.some((s) => s.id === t);
  const own = draft.traditions.filter((t) => !isStarter(t));
  const chosenStarters = draft.traditions.length - own.length;
  const atCap = draft.traditions.length >= MAX_TAGS;
  const set = (list: string[]) => onDraft({ ...draft, traditions: list });
  // Own text that equals a starter becomes that starter's pill, never a second tag.
  const setOwn = (list: string[]) => {
    const merged = [...draft.traditions.filter(isStarter), ...list.map((t) => normaliseTradition(t, starters))];
    const seen = new Set<string>();
    set(merged.filter((t) => !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase())));
  };
  return (
    <>
      <Lead>Pick any, or add your own. Food styles, not a guess about you.</Lead>
      <div role="group" aria-label="Food traditions" className="flex flex-wrap gap-2">
        {starters.map((t) => {
          const selected = draft.traditions.includes(t.id);
          return <Pill key={t.id} label={t.label} selected={selected} disabled={!selected && atCap} onToggle={() => set(toggled(draft.traditions, t.id))} />;
        })}
      </div>
      <TagInput
        label="Add your own"
        values={own}
        onChange={setOwn}
        max={MAX_TAGS - chosenStarters}
        hint={`Up to ${MAX_TAGS}, shown as you type them.`}
      />
    </>
  );
}

export function RulesStep({ draft, onDraft }: StepProps) {
  return (
    <>
      <Lead>Choose what fits you. We use these to leave out swaps that do not match. This is a guide, not a certification.</Lead>
      <div role="group" aria-label="Food rules" className="grid gap-4">
        {DIET_RULES.map((rule: DietRule) => (
          <div key={rule} className="grid gap-1">
            <Pill
              label={RULE_COPY[rule].label}
              selected={draft.rules.includes(rule)}
              describedBy={`rule-${rule}`}
              onToggle={() => onDraft({ ...draft, rules: toggled(draft.rules, rule) })}
            />
            <p id={`rule-${rule}`} className="px-3 text-center text-sm text-pretty text-muted">{RULE_COPY[rule].meaning}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export function AllergiesStep({ draft, onDraft }: StepProps) {
  const { unmatched } = matchAllergies(draft.allergies);
  return (
    <>
      <Lead>{ALLERGY_NOTE}</Lead>
      <TagInput
        label="Things to avoid"
        values={draft.allergies}
        onChange={(allergies) => onDraft({ ...draft, allergies })}
        max={MAX_TAGS}
        hint="For example peanuts, egg or sesame."
      />
      {unmatched.length > 0 && (
        <p className="min-w-0 text-sm text-pretty text-muted [overflow-wrap:anywhere]">
          We do not know {unmatched.join(', ')} yet, so swaps will ask you to check the ingredients.
        </p>
      )}
    </>
  );
}

export function OccasionsStep({ draft, onDraft }: StepProps) {
  const defs = occasionDefs().filter((o) => o.selectable);
  return (
    <>
      <Lead>
        Choose any that matter to you and we will mention them as they get close. Dates for lunar occasions are
        about, and can shift by a day.
      </Lead>
      <div role="group" aria-label="Occasions" className="flex flex-wrap gap-2">
        {defs.map((o) => (
          <Pill
            key={o.id}
            label={o.label}
            selected={draft.occasions.includes(o.id as OccasionId)}
            onToggle={() => onDraft({ ...draft, occasions: toggled(draft.occasions, o.id as OccasionId) })}
          />
        ))}
      </div>
      <p className="text-sm text-pretty text-muted">Not listed? We cannot give dates for your own occasion yet.</p>
    </>
  );
}

export function ReviewStep({ draft, onChange }: { draft: FoodProfile; onChange: (section: FoodSection) => void }) {
  return (
    <>
      <Lead>You chose these. Nothing is saved until you press Save. These stay with this profile on this device.</Lead>
      <FoodSections food={draft} onChange={onChange} />
    </>
  );
}
