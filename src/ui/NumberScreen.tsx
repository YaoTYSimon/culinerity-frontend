import { bandHeadline, rankNudge, scoreBand, SUPPORT_BELOW, trendSummary, type Profile, type RankNudge } from '@culinerity/core';
import { BudgetDisclosure } from './BudgetDisclosure';
import { PillButton } from './PillButton';
import { Plate } from './Plate';
import { RoundPhoto } from './RoundPhoto';

interface Props {
  /** A profile that has a score. */
  profile: Profile;
  onSeeSwaps: () => void;
  onCheckIn: () => void;
  onOpenSupport: () => void;
  /** Opens the weekly spending tracker. */
  onOpenBudget?: () => void;
  /** Called with the whole updated profile when the budget changes. */
  onChange: (next: Profile) => void;
}

const NUDGES: Record<RankNudge, { title: string; reason: string; photo: string; button: string }> = {
  cheapest: {
    title: 'Cheapest swaps first',
    reason: 'Because food is heavy right now',
    photo: 'burger',
    button: 'See cheaper swaps',
  },
  balanced: {
    title: 'A balance of cheap and healthy',
    reason: 'Because there is a little room to choose',
    photo: 'pizza',
    button: 'See cheaper swaps',
  },
  healthiest: {
    title: 'Healthiest swaps first',
    reason: 'Because you have room to pick what sits well',
    photo: 'hot-chips',
    button: 'See healthier swaps',
  },
};

/** "Up 9 since your first check-in: 33, 35, 36, 40, 42"; never "Up 0". */
function trendLine(profile: Profile): string | null {
  const trend = trendSummary(profile.scoreHistory);
  if (!trend) return null;
  const word = trend.delta > 0 ? `Up ${trend.delta}` : trend.delta < 0 ? `Down ${-trend.delta}` : 'Steady';
  return `${word} since your first check-in: ${trend.scores.join(', ')}`;
}

/** Home once there is a score: the number, where it has been, and one clear next step. */
export function NumberScreen({ profile, onSeeSwaps, onCheckIn, onOpenSupport, onOpenBudget, onChange }: Props) {
  const score = profile.score as number;
  const nudge = NUDGES[rankNudge(score)];
  const trend = trendLine(profile);

  return (
    <div className="grid gap-6 pb-2">
      <h1 tabIndex={-1} className="font-display text-[30px] text-balance outline-none">{bandHeadline(score)}</h1>
      <Plate score={score} band={scoreBand(score)} animate className="mx-auto" />
      <div className="grid gap-1 text-sm text-pretty text-muted">
        <p>100 is secure, 0 is critical.</p>
        {trend && <p>{trend}</p>}
      </div>

      <div className="flex items-center gap-3">
        <RoundPhoto itemId={nudge.photo} size={52} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{nudge.title}</p>
          <p className="text-sm text-muted">{nudge.reason}</p>
        </div>
      </div>

      <div className="grid justify-items-center gap-2">
        <PillButton onClick={onSeeSwaps} className="w-full">{nudge.button}</PillButton>
        <PillButton variant="text" onClick={onCheckIn}>Check in again</PillButton>
      </div>

      {score < SUPPORT_BELOW && (
        <div className="grid gap-1">
          <p className="text-sm text-muted">If money is tight this week, there is free food close by.</p>
          <PillButton variant="surface" onClick={onOpenSupport} className="w-full">Free food near you</PillButton>
        </div>
      )}

      <div className="grid justify-items-start gap-1">
        <BudgetDisclosure value={profile} onChange={onChange} />
        {onOpenBudget && <PillButton variant="text" className="-ml-3" onClick={onOpenBudget}>See this week's spending</PillButton>}
      </div>
    </div>
  );
}
