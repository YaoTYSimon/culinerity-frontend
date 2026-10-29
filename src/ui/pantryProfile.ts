import { sanitizePantry, type PantryState, type Profile, type ShoppingEntry } from '@culinerity/core';

/** The profile with its pantry set (the key is dropped when there is nothing to keep). */
export function withPantry(profile: Profile, state: PantryState): Profile {
  const { pantry: _dropped, ...rest } = profile;
  const clean = sanitizePantry(state);
  return clean ? { ...rest, pantry: clean } : rest;
}

/** The profile with its shopping list set (the key is dropped when the list is empty). */
export function withShopping(profile: Profile, list: ShoppingEntry[]): Profile {
  const { shoppingList: _dropped, ...rest } = profile;
  return list.length > 0 ? { ...rest, shoppingList: list } : rest;
}
