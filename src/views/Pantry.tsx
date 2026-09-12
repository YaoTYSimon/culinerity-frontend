import { useState } from 'react';
import type { UserProfile, PantryItem } from '../types';
import { storage } from '../lib/storage';

interface Props {
  profile: UserProfile;
}

const CATEGORIES = ['Grains & legumes', 'Protein', 'Vegetables', 'Dairy & eggs', 'Condiments & spices', 'Tinned & preserved', 'Other'];

interface RecipeSuggestion {
  title: string;
  usesItems: string[];
  ingredients: string;
  steps: string[];
  estimatedCost: string;
  culturalNote?: string;
}

function suggestRecipes(items: PantryItem[], cultural: string): RecipeSuggestion[] {
  const names = items.map((i) => i.name.toLowerCase());
  const suggestions: RecipeSuggestion[] = [];

  const hasEggs = names.some((n) => n.includes('egg'));
  const hasRice = names.some((n) => n.includes('rice'));
  const hasPasta = names.some((n) => n.includes('pasta') || n.includes('noodle'));
  const hasTomato = names.some((n) => n.includes('tomato'));
  const hasOnion = names.some((n) => n.includes('onion'));
  const hasLegumes = names.some((n) => n.includes('lentil') || n.includes('bean') || n.includes('chickpea') || n.includes('dal') || n.includes('dhal'));
  const hasGarlic = names.some((n) => n.includes('garlic'));
  const hasOil = names.some((n) => n.includes('oil'));
  const hasChicken = names.some((n) => n.includes('chicken'));
  const hasSpices = names.some((n) => ['cumin', 'turmeric', 'paprika', 'coriander', 'chilli', 'garam masala', 'spice'].some((s) => n.includes(s)));

  if (hasEggs && hasRice) {
    suggestions.push({
      title: 'Egg fried rice',
      usesItems: items.filter((i) => ['egg', 'rice', 'soy', 'garlic', 'onion'].some((k) => i.name.toLowerCase().includes(k))).map((i) => i.name),
      ingredients: 'Rice, eggs, soy sauce, garlic, oil, spring onions',
      steps: ['Use day-old rice for best texture.', 'Scramble eggs in hot wok, fold into rice.', 'Season with soy sauce and sesame oil if available.'],
      estimatedCost: '$1.50–2.50 per serve',
    });
  }

  if (hasLegumes && (hasOnion || hasGarlic) && hasSpices) {
    const isSouthAsian = cultural.toLowerCase().includes('south asian') || cultural.toLowerCase().includes('indian') || cultural.toLowerCase().includes('pakistani');
    suggestions.push({
      title: isSouthAsian ? 'Dal tadka' : 'Spiced lentil soup',
      usesItems: items.filter((i) => ['lentil', 'bean', 'chickpea', 'dal', 'onion', 'garlic', 'spice', 'cumin', 'turmeric'].some((k) => i.name.toLowerCase().includes(k))).map((i) => i.name),
      ingredients: 'Lentils or beans, onion, garlic, spices, oil, tomato if available',
      steps: ['Simmer lentils until soft.', 'Fry onion and garlic until golden, add spices.', 'Combine and cook 10 more minutes. Serve with rice or bread.'],
      estimatedCost: '$1–2 per serve',
      culturalNote: isSouthAsian ? 'Core South Asian dish — add cumin seeds to hot oil (tadka) for authentic flavour base.' : undefined,
    });
  }

  if (hasPasta && hasTomato) {
    suggestions.push({
      title: 'Pasta al pomodoro',
      usesItems: items.filter((i) => ['pasta', 'tomato', 'garlic', 'onion', 'oil'].some((k) => i.name.toLowerCase().includes(k))).map((i) => i.name),
      ingredients: 'Pasta, tinned tomatoes, garlic, olive oil, salt',
      steps: ['Sauté garlic in oil until fragrant.', 'Add tomatoes, simmer 20 min.', 'Toss with pasta and reserved pasta water.'],
      estimatedCost: '$1.50–2.50 per serve',
    });
  }

  if (hasChicken && hasRice && (hasSpices || hasOnion)) {
    suggestions.push({
      title: 'One-pot chicken rice',
      usesItems: items.filter((i) => ['chicken', 'rice', 'onion', 'garlic', 'spice'].some((k) => i.name.toLowerCase().includes(k))).map((i) => i.name),
      ingredients: 'Chicken, rice, onion, garlic, spices, stock or water',
      steps: ['Brown chicken pieces in pot.', 'Add onion and garlic, cook 3 min.', 'Add rice and 2x water/stock, cover and simmer 20 min on low.'],
      estimatedCost: '$2.50–3.50 per serve',
    });
  }

  if (hasEggs && (hasOnion || hasGarlic)) {
    suggestions.push({
      title: 'Shakshuka / baked eggs',
      usesItems: items.filter((i) => ['egg', 'tomato', 'onion', 'garlic', 'spice', 'chilli'].some((k) => i.name.toLowerCase().includes(k))).map((i) => i.name),
      ingredients: 'Eggs, tinned tomatoes, onion, garlic, cumin, paprika',
      steps: ['Fry onion and garlic, add spices, add tomatoes.', 'Simmer 10 min until reduced.', 'Make wells, crack eggs in, cover and cook 5–8 min.'],
      estimatedCost: '$1.50–2 per serve',
      culturalNote: 'North African and Middle Eastern origin — common across many cultures. Serve with flatbread if available.',
    });
  }

  return suggestions.slice(0, 4);
}

export default function Pantry({ profile }: Props) {
  const [pantry, setPantry] = useState(() => storage.getPantry());
  const [form, setForm] = useState({ name: '', quantity: '', category: CATEGORIES[0] });
  const [showRecipes, setShowRecipes] = useState(false);

  function add() {
    if (!form.name.trim()) return;
    const item: PantryItem = {
      id: Date.now().toString(),
      name: form.name.trim(),
      quantity: form.quantity.trim(),
      category: form.category,
      addedAt: new Date().toISOString(),
    };
    storage.addPantryItem(item);
    setPantry(storage.getPantry());
    setForm((f) => ({ ...f, name: '', quantity: '' }));
  }

  function remove(id: string) {
    storage.removePantryItem(id);
    setPantry(storage.getPantry());
  }

  const suggestions = suggestRecipes(pantry, profile.culturalBackground);
  const grouped = CATEGORIES.reduce<Record<string, PantryItem[]>>((acc, cat) => {
    acc[cat] = pantry.filter((i) => i.category === cat);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Pantry</h1>
          <p className="text-sm text-muted-foreground mt-1">What you have — cook from it, reduce waste, cut cost</p>
        </div>
        {pantry.length > 0 && (
          <button
            onClick={() => setShowRecipes(!showRecipes)}
            className="px-4 py-2 border border-primary text-primary text-sm rounded hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            {showRecipes ? 'View pantry' : `Cook from this (${suggestions.length})`}
          </button>
        )}
      </div>

      {/* Add item */}
      <div className="bg-card border border-border rounded p-4 mb-5">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Add item</p>
        <div className="flex gap-2 flex-wrap">
          <input
            className="flex-1 min-w-40 border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Item name (e.g. basmati rice)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <input
            className="w-28 border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Qty (e.g. 2kg)"
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
          />
          <select
            className="border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button
            onClick={add}
            disabled={!form.name.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">In a full implementation, you'd also be able to scan barcodes or photograph your fridge.</p>
      </div>

      {!showRecipes ? (
        <>
          {pantry.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded text-muted-foreground">
              <p className="text-sm">Your pantry is empty.</p>
              <p className="text-xs mt-1">Add items above to get culturally-relevant recipe suggestions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {CATEGORIES.filter((c) => grouped[c].length > 0).map((cat) => (
                <div key={cat} className="bg-card border border-border rounded p-4">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">{cat}</p>
                  <div className="space-y-1.5">
                    {grouped[cat].map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm">{item.name}</span>
                          {item.quantity && <span className="text-xs text-muted-foreground font-mono">{item.quantity}</span>}
                        </div>
                        <button onClick={() => remove(item.id)} className="text-xs text-muted-foreground hover:text-accent">remove</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Recipes you can make from your pantry — ranked for your cultural background ({profile.culturalBackground})</p>
          {suggestions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded text-muted-foreground">
              <p className="text-sm">Not enough items to generate suggestions yet.</p>
              <p className="text-xs mt-1">Add more pantry items for recipes to appear.</p>
            </div>
          ) : (
            suggestions.map((s, i) => (
              <div key={i} className="bg-card border border-border rounded p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-base font-semibold">{s.title}</h3>
                  <span className="text-xs font-mono text-muted-foreground flex-shrink-0">{s.estimatedCost}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {s.usesItems.map((item) => (
                    <span key={item} className="text-xs border border-success/40 bg-success/5 text-success rounded px-2 py-0.5">{item}</span>
                  ))}
                </div>
                {s.culturalNote && <p className="text-xs text-muted-foreground mb-3 italic">{s.culturalNote}</p>}
                <p className="text-xs text-muted-foreground mb-2">Also needs: {s.ingredients}</p>
                <ol className="space-y-1">
                  {s.steps.map((step, j) => (
                    <li key={j} className="text-sm flex gap-2">
                      <span className="text-muted-foreground font-mono flex-shrink-0">{j + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
