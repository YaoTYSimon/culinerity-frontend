import { culturalSources } from '@culinerity/core';

const link = 'underline underline-offset-2 hover:text-ink focus-ring rounded-full';
const CC_BY = 'https://creativecommons.org/licenses/by/4.0/';

/**
 * CC BY 4.0 credit for the food-table values behind the cultural catalogue. The wording and URL come from the
 * generated source record, so the API data and this line cannot drift apart.
 */
export function NutritionCredit() {
  const afcd = culturalSources().find((s) => s.id === 'afcd-r3');
  if (!afcd) return null;
  return (
    <p className="mt-2">
      Nutrition data:{' '}
      <a href={afcd.url} target="_blank" rel="noopener noreferrer" className={link} aria-label="Food Standards Australia New Zealand, Australian Food Composition Database Release 3 (opens in a new tab)">
        Food Standards Australia New Zealand, Australian Food Composition Database Release 3
      </a>
      {', '}
      <a href={CC_BY} target="_blank" rel="noopener noreferrer" className={`${link} whitespace-nowrap`} aria-label="CC BY 4.0 licence (opens in a new tab)">CC BY 4.0</a>
      , adapted (nutrient values summed per recipe).
    </p>
  );
}
