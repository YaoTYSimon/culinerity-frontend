import { photoFor } from '../assets/photos';
import { iconKindFor, RecipeIcon } from './recipeIcons';
import { RoundPhoto } from './RoundPhoto';

const PX = { sm: 48, lg: 80 } as const;

/** The round photo of a recipe's dish; the drawn icon only when its id has no photo. Decorative: the name is printed beside it. */
export function RecipeImage({ recipeId, size = 'sm', className = '' }: { recipeId: string; size?: keyof typeof PX; className?: string }) {
  if (!photoFor(recipeId)) return <RecipeIcon kind={iconKindFor(recipeId)} size={size} className={className} />;
  return <RoundPhoto itemId={recipeId} size={PX[size]} className={className} />;
}
