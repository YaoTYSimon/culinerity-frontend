import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BULK_HOURS_TEXT, BULK_PRICE_TEXT, type BulkPlace } from '@culinerity/core';
import { NearbyBulkRow } from './NearbyBulkRow';

const place: BulkPlace = {
  id: 'ovt-1', name: 'Corner Bakery', kind: 'bakery', lat: -37.8, lng: 144.96, address: '12 High St', postcode: '3056',
  price: 'unknown', source: 'overture', sourceDataset: 'meta', release: '2026-10-21.0', licence: 'CDLA-Permissive-2.0',
};
const draw = (contact?: string) => render(<ul><NearbyBulkRow item={{ place, distanceM: 640 }} reportContact={contact} /></ul>);

describe('NearbyBulkRow', () => {
  it('shows the kind label, address with postcode, distance, price text and hours text, as the source gave them', () => {
    draw();
    expect(screen.getByRole('heading', { level: 3, name: 'Corner Bakery' })).toBeInTheDocument();
    expect(screen.getByText(/^Bakery · /)).toHaveTextContent('12 High St 3056');
    expect(screen.getByText(BULK_PRICE_TEXT)).toBeInTheDocument();
    expect(screen.getByText(BULK_HOURS_TEXT)).toBeInTheDocument();
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
    expect(a.className).toContain('min-h-11');
  });
  it('shows Report a problem only when a contact is set, with the id and name and no position', () => {
    draw('');
    expect(screen.queryByRole('link', { name: /Report a problem/ })).toBeNull();
    draw('reports@example.test');
    const href = decodeURIComponent(screen.getByRole('link', { name: /Report a problem/ }).getAttribute('href')!);
    expect(href).toMatch(/^mailto:reports@example\.test/);
    expect(href).toContain('ovt-1');
    expect(href).toContain('Corner Bakery');
    expect(href).not.toMatch(/-37\.8|144\.96/);
  });
});
