import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BULK_HOURS_TEXT, BULK_PRICE_TEXT, type BulkPlace } from '@culinerity/core';
import { NearbyBulkRow } from './NearbyBulkRow';

const place: BulkPlace = {
  id: 'ovt-1', name: 'Corner Bakery', kind: 'bakery', lat: -37.8, lng: 144.96, address: '12 High St', postcode: '3056',
  price: 'unknown', source: 'overture', sourceDataset: 'meta', release: '2026-10-21.0', licence: 'CDLA-Permissive-2.0',
};
const draw = (contact?: string) => render(<ul><NearbyBulkRow item={{ place, distanceM: 640 }} reportContact={contact} /></ul>);

describe('NearbyBulkRow', () => {
  it('collapsed shows the name, a kind label for assistive tech, postcode and distance, and not the address, price or hours text', () => {
    draw();
    expect(screen.getByRole('heading', { level: 3, name: 'Corner Bakery' })).toBeInTheDocument();
    expect(screen.getByText(/3056 · /).textContent).toMatch(/3056 · 6[45]0\u00A0m$/);
    expect(screen.getByText(/^Bakery,/)).toHaveClass('sr-only');
    expect(screen.getByText('Bakery · 12 High St · 3056').closest('[hidden]')).not.toBeNull();
    expect(screen.queryByText(BULK_PRICE_TEXT)).toBeNull();
    expect(screen.queryByText(BULK_HOURS_TEXT)).toBeNull();
  });
  it('Details is a button with aria-expanded and aria-controls, named for the place, and opens the address', () => {
    draw();
    const b = screen.getByRole('button', { name: 'Details for Corner Bakery' });
    expect(b).toHaveAttribute('aria-expanded', 'false');
    const panel = document.getElementById(b.getAttribute('aria-controls')!)!;
    expect(panel).toBeInTheDocument();
    expect(panel).not.toBeVisible();
    fireEvent.click(b);
    expect(b).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toBeVisible();
    expect(panel).toHaveTextContent('Bakery · 12 High St · 3056');
    fireEvent.click(b);
    expect(b).toHaveAttribute('aria-expanded', 'false');
  });
  it('lists a safe website behind Details', () => {
    render(<ul><NearbyBulkRow item={{ place: { ...place, website: 'https://www.bakery.example/menu' }, distanceM: 640 }} reportContact="" /></ul>);
    fireEvent.click(screen.getByRole('button', { name: 'Details for Corner Bakery' }));
    expect(screen.getByRole('link', { name: /bakery\.example/ })).toHaveAttribute('href', 'https://www.bakery.example/menu');
    cleanup();
    render(<ul><NearbyBulkRow item={{ place: { ...place, website: 'javascript:alert(1)' }, distanceM: 640 }} reportContact="" /></ul>);
    expect(document.querySelector('a[href^="javascript"]')).toBeNull();
  });
  it('never shows a price band, hours or a cheap, healthy or budget claim', () => {
    const { container } = draw();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/cheap|healthy|budget|\$|low cost|free|affordable|good value/i);
    expect(text).not.toMatch(/\bHours\b/);
  });
  it('has a Maps link naming the place only, at least 44px tall', () => {
    draw();
    const a = screen.getByRole('link', { name: 'Open Corner Bakery in Maps' });
    expect(decodeURIComponent(a.getAttribute('href')!)).not.toMatch(/-37\.8|144\.96/);
    expect(a.className).toContain('size-11');
  });
  it('shows Report a problem only when a contact is set, with the id and name and no position', () => {
    draw('');
    fireEvent.click(screen.getByRole('button', { name: 'Details for Corner Bakery' }));
    expect(screen.queryByRole('link', { name: /Report a problem/ })).toBeNull();
    cleanup();
    draw('reports@example.test');
    expect(screen.queryByRole('link', { name: /Report a problem/ })).toBeNull(); // behind Details until opened
    fireEvent.click(screen.getByRole('button', { name: 'Details for Corner Bakery' }));
    const href = decodeURIComponent(screen.getByRole('link', { name: /Report a problem/ }).getAttribute('href')!);
    expect(href).toMatch(/^mailto:reports@example\.test/);
    expect(href).toContain('ovt-1');
    expect(href).toContain('Corner Bakery');
    expect(href).not.toMatch(/-37\.8|144\.96/);
  });
});
