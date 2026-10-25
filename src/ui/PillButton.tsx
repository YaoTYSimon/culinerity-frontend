import type { ComponentProps } from 'react';

type Variant = 'primary' | 'surface' | 'text';

interface Props extends ComponentProps<'button'> {
  variant?: Variant;
  /** 'icon' is a 44px round button for a single glyph. */
  size?: 'default' | 'icon';
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink font-semibold',
  surface: 'bg-surface text-ink font-semibold',
  text: 'bg-transparent text-ink font-semibold underline underline-offset-4',
};

const PADDING: Record<Variant, string> = { primary: 'px-6', surface: 'px-6', text: 'px-3' };

/** The one button shape: fully round, 44px minimum height. */
export function PillButton({ variant = 'primary', size = 'default', type = 'button', className = '', ...rest }: Props) {
  return (
    <button
      type={type}
      data-variant={variant}
      className={`focus-ring motion-colors inline-flex min-h-11 items-center justify-center rounded-full text-center disabled:opacity-60 ${size === 'icon' ? 'size-11 shrink-0 px-0' : PADDING[variant]} ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
}
