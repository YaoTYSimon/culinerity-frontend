import { useState } from 'react';
import type { SupermarketCycle } from '../types';
import { storage } from '../lib/storage';
import { usePersistentState } from '../lib/persist';

const SUPERMARKETS = ['Woolworths', 'Coles', 'Aldi', 'IGA', 'Harris Farm', 'Costco', 'Other'];

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function getNextSaleEstimate(cycle: SupermarketCycle): { label: string; urgent: boolean } {
  const days = daysSince(cycle.lastSaleDate);
  const remaining = cycle.estimatedFrequencyDays - days;

  if (remaining <= 0) return { label: 'Overdue — may be on sale now', urgent: true };
  if (remaining <= 7) return { label: `~${remaining} days`, urgent: true };
  if (remaining <= 14) return { label: `~${remaining} days`, urgent: false };
  return { label: `~${Math.round(remaining / 7)} weeks`, urgent: false };
}

function getSaving(cycle: SupermarketCycle): string {
  const saving = cycle.regularPrice - cycle.salePrice;
  const pct = ((saving / cycle.regularPrice) * 100).toFixed(0);
  return `Save $${saving.toFixed(2)} (${pct}% off)`;
}

export default function HalfPrice() {
  const [cycles, setCycles] = useState(() => storage.getCycles());
  const [form, setForm] = usePersistentState('halfprice_form', {
    itemName: '',
    supermarket: 'Woolworths',
    regularPrice: 0,
    salePrice: 0,
    unit: '',
    lastSaleDate: new Date().toISOString().split('T')[0],
    saleDurationDays: 7,
    estimatedFrequencyDays: 28,
  });
  const [showForm, setShowForm] = usePersistentState('halfprice_show_form', false);

  function add() {
    if (!form.itemName.trim() || form.regularPrice <= 0) return;
    const item: SupermarketCycle = {
      id: Date.now().toString(),
      ...form,
    };
    storage.addCycle(item);
    setCycles(storage.getCycles());
    setForm((f) => ({ ...f, itemName: '', unit: '' }));
    setShowForm(false);
  }

  function remove(id: string) {
    storage.removeCycle(id);
    setCycles(storage.getCycles());
  }

  function markSaleNow(cycle: SupermarketCycle) {
    const updated = { ...cycle, lastSaleDate: new Date().toISOString().split('T')[0] };
    storage.updateCycle(updated);
    setCycles(storage.getCycles());
  }

  const urgent = cycles.filter((c) => {
    const days = daysSince(c.lastSaleDate);
    return (c.estimatedFrequencyDays - days) <= 7;
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Half-Price Cycles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your staples' sale patterns — get flagged when to buy
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition-opacity flex-shrink-0"
        >
          Track a staple
        </button>
      </div>

      <div className="mb-5 p-4 bg-card border border-border rounded text-sm text-muted-foreground">
        <p>
          Australian supermarkets (Woolworths, Coles) operate predictable specials cycles — most items go half-price for 1–2 weeks roughly every 4–8 weeks. Log when an item goes on sale and this tracker estimates the next window.
        </p>
      </div>

      {/* Urgent alerts */}
      {urgent.length > 0 && (
        <div className="mb-5 border border-accent/40 bg-accent/5 rounded p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-accent mb-2">Sale likely now</p>
          <div className="space-y-2">
            {urgent.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{c.itemName}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{c.supermarket}</span>
                  <span className="font-mono text-accent text-xs">{getSaving(c)}</span>
                  <button
                    onClick={() => markSaleNow(c)}
                    className="text-xs border border-border rounded px-2 py-1 hover:border-primary transition-colors"
                  >
                    Mark as bought
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-card border border-border rounded p-5 mb-5">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">Add a staple to track</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2">
              <label className="block text-sm mb-1.5">Item name</label>
              <input
                className="w-full border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="e.g. Basmati rice 5kg, chicken thighs, halal mince"
                value={form.itemName}
                onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Supermarket</label>
              <select
                className="w-full border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none"
                value={form.supermarket}
                onChange={(e) => setForm((f) => ({ ...f, supermarket: e.target.value }))}
              >
                {SUPERMARKETS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1.5">Unit (e.g. 5kg, per kg)</label>
              <input
                className="w-full border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="5kg"
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Regular price ($)</label>
              <input
                type="number" min={0} step={0.01}
                className="w-full border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.regularPrice || ''}
                onChange={(e) => setForm((f) => ({ ...f, regularPrice: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Sale price ($)</label>
              <input
                type="number" min={0} step={0.01}
                className="w-full border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.salePrice || ''}
                onChange={(e) => setForm((f) => ({ ...f, salePrice: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Last sale date</label>
              <input
                type="date"
                className="w-full border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none"
                value={form.lastSaleDate}
                onChange={(e) => setForm((f) => ({ ...f, lastSaleDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Estimated cycle (days)</label>
              <select
                className="w-full border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none"
                value={form.estimatedFrequencyDays}
                onChange={(e) => setForm((f) => ({ ...f, estimatedFrequencyDays: parseInt(e.target.value) }))}
              >
                <option value={14}>~2 weeks</option>
                <option value={28}>~4 weeks (common)</option>
                <option value={42}>~6 weeks</option>
                <option value={56}>~8 weeks</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-border rounded text-sm hover:border-primary transition-colors">Cancel</button>
            <button onClick={add} disabled={!form.itemName.trim() || form.regularPrice <= 0} className="flex-1 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 disabled:opacity-40 transition-opacity">
              Start tracking
            </button>
          </div>
        </div>
      )}

      {/* Cycles list */}
      {cycles.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded text-muted-foreground">
          <p className="text-sm">No staples tracked yet.</p>
          <p className="text-xs mt-1">Add items you buy regularly — the app will tell you when to stock up.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cycles.map((cycle) => {
            const next = getNextSaleEstimate(cycle);
            const saving = getSaving(cycle);
            return (
              <div key={cycle.id} className={`border rounded p-4 bg-card flex items-center justify-between gap-4 ${next.urgent ? 'border-accent/40' : 'border-border'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{cycle.itemName}</p>
                    {cycle.unit && <span className="text-xs text-muted-foreground">{cycle.unit}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{cycle.supermarket} · {saving}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-mono ${next.urgent ? 'text-accent font-semibold' : 'text-muted-foreground'}`}>{next.label}</p>
                  <p className="text-xs text-muted-foreground">next sale</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {next.urgent && (
                    <button
                      onClick={() => markSaleNow(cycle)}
                      className="text-xs border border-border rounded px-2 py-1 hover:border-primary transition-colors"
                    >
                      Got it
                    </button>
                  )}
                  <button onClick={() => remove(cycle.id)} className="text-xs text-muted-foreground hover:text-accent">
                    remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
