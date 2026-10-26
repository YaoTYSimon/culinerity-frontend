import type { BudgetSummary } from '@culinerity/core';
import { formatDollars } from './money';

interface Props {
  summary: BudgetSummary;
  budget: number | undefined;
  className?: string;
}

const CX = 130;
const RIM_R = 112;
const FULL = 100;

/** Amount text shrinks as it grows so it stays inside the inner plate. */
const amountSize = (text: string): number => (text.length <= 4 ? 80 : text.length <= 6 ? 50 : text.length <= 8 ? 42 : 34);

/** The week as a plate: the rim fills with the share spent; the centre says what is left (or over, or spent). */
export function BudgetPlate({ summary, budget, className = '' }: Props) {
  const hasBudget = summary.percentSpent !== null && budget !== undefined;
  const over = summary.pace === 'over';
  const amount = formatDollars(!hasBudget ? summary.spent : over ? summary.over : (summary.remaining ?? 0));
  const word = !hasBudget ? 'spent' : over ? 'over' : 'left';
  const fill = hasBudget ? Math.min(FULL, Math.max(0, summary.percentSpent ?? 0)) : 0;

  return (
    <svg role="img" aria-label={`${amount} ${word}`} viewBox="0 0 260 260" className={`block aspect-square w-full max-w-[260px] ${className}`} fontFamily="inherit">
      <circle cx={CX} cy={CX} r="126" className="fill-surface" />
      <circle cx={CX} cy={CX} r="98" className="fill-bg" />
      {hasBudget ? (
        fill > 0 && (
          <circle
            data-rim
            cx={CX}
            cy={CX}
            r={RIM_R}
            pathLength={FULL}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${fill} ${FULL}`}
            transform={`rotate(-90 ${CX} ${CX})`}
            className="stroke-ink plate-rim-animate"
          />
        )
      ) : (
        <circle cx={CX} cy={CX} r={RIM_R} fill="none" strokeWidth="5" strokeDasharray="2 12" strokeLinecap="round" opacity="0.5" className="stroke-ink" />
      )}
      <text x={CX} y={CX + amountSize(amount) * 0.12} textAnchor="middle" fontWeight="800" fontSize={amountSize(amount)} className="fill-ink">
        {amount}
      </text>
      <text x={CX} y={CX + 52} textAnchor="middle" fontSize="20" fontWeight="600" className="fill-muted">
        {word}
      </text>
    </svg>
  );
}
