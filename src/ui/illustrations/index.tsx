import type { ComponentType } from 'react';
import * as D from './dishes';
import type { IllustrationProps } from './parts';

const BY_ID: Record<string, ComponentType<IllustrationProps>> = {
  burger: D.Burger,
  'hot-chips': D.HotChips,
  'bubble-tea': D.BubbleTea,
  'instant-noodles': D.InstantNoodles,
  pizza: D.Pizza,
  chocolate: D.Chocolate,
  'fried-chicken': D.FriedChicken,
  kebab: D.Kebab,
  pastry: D.Pastry,
  'soft-drink': D.SoftDrink,
  'smash-burger': D.SmashBurger,
  'chicken-salad-roll': D.ChickenSaladRoll,
  'oven-wedges': D.OvenWedges,
  'roast-chickpeas': D.RoastChickpeas,
  'homemade-milk-tea': D.HomemadeMilkTea,
  'fruit-iced-tea': D.FruitIcedTea,
  'egg-noodle-stirfry': D.EggNoodleStirfry,
  'egg-fried-rice': D.EggFriedRice,
  'turkish-bread-pizza': D.TurkishBreadPizza,
  'spaghetti-pomodoro': D.SpaghettiPomodoro,
  'banana-pb-toast': D.BananaPbToast,
  'cocoa-yoghurt': D.CocoaYoghurt,
  'baked-drumsticks': D.BakedDrumsticks,
  'falafel-wrap': D.FalafelWrap,
  'chicken-kebab-home': D.ChickenKebabHome,
  'oat-banana-muffin': D.OatBananaMuffin,
  'fruit-toast-ricotta': D.FruitToastRicotta,
  'sparkling-lemon': D.SparklingLemon,
  'unsweetened-iced-tea': D.UnsweetenedIcedTea,
};

/** True when the item has its own drawing (not the generic fallback). */
export const hasIllustration = (id: string): boolean => Object.prototype.hasOwnProperty.call(BY_ID, id);

/** The drawing for a catalogue item id, decorative (aria-hidden). Unknown ids get a generic plate. */
export function FoodIllustration({ id, className }: { id: string; className?: string }) {
  const Drawing = hasIllustration(id) ? BY_ID[id] : D.GenericDish;
  return <Drawing className={className} />;
}

export { HeroStillLife } from './HeroStillLife';
