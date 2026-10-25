import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'surface' | 'text';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink px-6 font-semibold',
  surface: 'bg-surface text-ink px-6 font-semibold',
  text: 'bg-transparent text-ink px-3 font-semibold underline underline-offset-4',
};

/** The one button shape: fully round, 44px minimum height. */
export function PillButton({ variant = 'primary', type = 'button', className = '', ...rest }: Props) {
  return (
    <button
      type={type}
      data-variant={variant}
      className={`focus-ring motion-colors inline-flex min-h-11 items-center justify-center rounded-full text-center disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
}
