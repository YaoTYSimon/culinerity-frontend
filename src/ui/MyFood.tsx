import { useState } from 'react';
import { sanitizeFoodProfile, type CulturalMeal, type FoodProfile } from '@culinerity/core';
import { PRIVACY_LINE } from './foodCopy';
import {
  AllergiesStep, emptyDraft, OccasionsStep, REVIEW_STEP, ReviewStep, RulesStep, SECTION_STEP, STEP_TITLES, TraditionsStep,
} from './FoodSteps';
import { FocusHeading } from './FocusHeading';
import { FoodSummary, type Notice } from './FoodSummary';
import { PillButton } from './PillButton';
import { StepProgress } from './StepProgress';

interface Props {
  value: FoodProfile | undefined;
  onSave: (v: FoodProfile | undefined) => void;
  onClear: () => void;
  onDone: () => void;
  /** Open the setup even when settings already exist (the Welcome button). */
  startAtWizard?: boolean;
  /** The saved meals, only so "Clear my meals" can offer Undo. Omit to hide that control. */
  meals?: CulturalMeal[];
  onSaveMeals?: (v: CulturalMeal[] | undefined) => void;
  /** Shows a link to the meals tracker on the summary. */
  onOpenMeals?: () => void;
}

type Mode = { kind: 'summary' } | { kind: 'wizard'; step: number; fromReview: boolean };

/** Setup (one question per screen, like the check-in) and, once settings exist, a summary with clear controls. */
export function MyFood({ value, onSave, onClear, onDone, startAtWizard = false, meals, onSaveMeals, onOpenMeals }: Props) {
  const [mode, setMode] = useState<Mode>(() =>
    startAtWizard || !value ? { kind: 'wizard', step: 0, fromReview: false } : { kind: 'summary' });
  const [draft, setDraft] = useState<FoodProfile>(() => emptyDraft(value));
  const [notice, setNotice] = useState<Notice | null>(null);
  // Held in React only, so Undo lasts for this visit and nothing extra is stored.
  const [undo, setUndo] = useState<{ kind: 'food'; prev: FoodProfile | undefined } | { kind: 'meals'; prev: CulturalMeal[] | undefined } | null>(null);

  const openWizard = (step: number) => {
    setDraft(emptyDraft(value));
    setMode({ kind: 'wizard', step, fromReview: false });
  };
  const leaveWizard = () => {
    if (value) setMode({ kind: 'summary' });
    else onDone();
  };

  if (mode.kind === 'summary') {
    return (
      <FoodSummary
        food={value}
        hasMeals={(meals?.length ?? 0) > 0 && onSaveMeals !== undefined}
        notice={notice}
        onChange={(section) => openWizard(SECTION_STEP[section])}
        onSetUp={() => openWizard(0)}
        onClearFood={() => {
          setUndo({ kind: 'food', prev: value });
          setNotice({ kind: 'food' });
          onClear();
        }}
        onClearMeals={() => {
          setUndo({ kind: 'meals', prev: meals });
          setNotice({ kind: 'meals' });
          onSaveMeals?.(undefined);
        }}
        onUndo={() => {
          if (undo?.kind === 'food') onSave(undo.prev);
          if (undo?.kind === 'meals') onSaveMeals?.(undo.prev);
          setUndo(null);
          setNotice(null);
        }}
        onOpenMeals={onOpenMeals}
        onDone={onDone}
      />
    );
  }

  const { step, fromReview } = mode;
  const last = step === REVIEW_STEP;
  const goTo = (to: number, review = false) => setMode({ kind: 'wizard', step: to, fromReview: review });
  const save = () => {
    const clean = sanitizeFoodProfile(draft);
    onSave(clean);
    setUndo(null);
    setNotice({ kind: 'saved', text: clean ? 'Saved.' : 'Nothing chosen, so nothing was saved.' });
    setMode({ kind: 'summary' });
  };
  const stepProps = { draft, onDraft: setDraft };

  return (
    <section aria-label="My food" className="flex min-h-[calc(100svh-9rem)] min-w-0 flex-col text-ink">
      <StepProgress label="My food progress" noun="Step" step={step + 1} total={STEP_TITLES.length} />
      {/* Remounted per step so the new h1 takes focus. */}
      <div key={step} className="mt-6 grid min-w-0 gap-4">
        <FocusHeading>{STEP_TITLES[step]}</FocusHeading>
        <p className="text-sm text-muted">{PRIVACY_LINE}</p>
        {step === 0 && <TraditionsStep {...stepProps} />}
        {step === 1 && <RulesStep {...stepProps} />}
        {step === 2 && <AllergiesStep {...stepProps} />}
        {step === 3 && <OccasionsStep {...stepProps} />}
        {last && <ReviewStep draft={draft} onChange={(section) => goTo(SECTION_STEP[section], true)} />}
      </div>

      <div className="mt-auto grid gap-2 pt-8">
        {last ? (
          <PillButton onClick={save} className="w-full">Save</PillButton>
        ) : (
          <PillButton onClick={() => goTo(fromReview ? REVIEW_STEP : step + 1)} className="w-full">Next</PillButton>
        )}
        <div className="flex items-center justify-between">
          <PillButton variant="text" disabled={step === 0} onClick={() => goTo(Math.max(0, step - 1))} className="-ml-3">
            Back
          </PillButton>
          <PillButton variant="text" onClick={leaveWizard} className="-mr-3">Skip</PillButton>
        </div>
      </div>
    </section>
  );
}
