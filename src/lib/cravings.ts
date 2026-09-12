export interface CravingResult {
  detectedCuisine: string;
  detectedDish: string;
  alternatives: Alternative[];
  recipe: Recipe;
}

export interface Alternative {
  type: 'independent' | 'market' | 'community';
  name: string;
  description: string;
  estimatedCost: string;
  walkTime: string;
  culturalMatch: 'high' | 'medium' | 'low';
  dietaryNote?: string;
}

export interface Recipe {
  title: string;
  servings: number;
  estimatedCost: string;
  prepTime: string;
  cookTime: string;
  ingredients: { item: string; amount: string; swapTip?: string }[];
  steps: string[];
  nutritionNotes: string;
}

interface CuisineEntry {
  cuisine: string;
  keywords: string[];
  alternatives: Omit<Alternative, 'walkTime'>[];
  recipe: Omit<Recipe, 'servings'>;
}

const cuisineDB: CuisineEntry[] = [
  {
    cuisine: 'American fast food',
    keywords: ['big mac', 'mcdonald', 'burger', 'cheeseburger', 'whopper', 'kfc', 'fried chicken', 'nugget', 'fries', 'hot dog'],
    alternatives: [
      { type: 'independent', name: 'Local burger bar', description: 'Family-run grill — same format, locally sourced beef, no franchise margin', estimatedCost: '$12–15', culturalMatch: 'high' },
      { type: 'market', name: 'Butcher market stall', description: 'Mince patties from a market butcher are often half the supermarket price', estimatedCost: '$6–8 for four', culturalMatch: 'medium' },
    ],
    recipe: {
      title: 'Smash burger',
      estimatedCost: '$4–5 per serve',
      prepTime: '10 min',
      cookTime: '8 min',
      ingredients: [
        { item: 'beef mince (20% fat)', amount: '120g per patty', swapTip: 'Chicken mince works — add 1 tsp smoked paprika' },
        { item: 'brioche or burger bun', amount: '1 per serve', swapTip: 'Turkish bread rolls from any bakery are cheaper and good' },
        { item: 'sliced cheese', amount: '1 slice per patty' },
        { item: 'iceberg lettuce', amount: 'a few leaves' },
        { item: 'tomato', amount: '2 slices' },
        { item: 'pickles', amount: 'to taste' },
        { item: 'sauce: mayo + mustard + ketchup', amount: '1 tbsp each', swapTip: 'Add a dash of vinegar for the "special sauce" character' },
      ],
      steps: [
        'Roll mince into a loose ball, do not over-pack.',
        'Heat a cast iron or heavy pan until smoking hot.',
        'Place ball in pan and smash flat with a spatula. Hold pressure for 10 seconds.',
        'Season with salt. Cook 2 minutes until edges crisp.',
        'Flip once, add cheese immediately, cook 1 minute more.',
        'Toast bun cut-side down in the same pan.',
        'Assemble with sauce, lettuce, tomato, pickles.',
      ],
      nutritionNotes: 'Higher protein, less sodium than a chain burger. Adding lettuce and tomato adds folate and vitamin C at negligible cost.',
    },
  },
  {
    cuisine: 'South Asian',
    keywords: ['biryani', 'curry', 'dal', 'dhal', 'butter chicken', 'tikka', 'naan', 'roti', 'samosa', 'saag', 'palak', 'korma', 'vindaloo', 'masala', 'indian', 'pakistani', 'bangladeshi', 'sri lankan'],
    alternatives: [
      { type: 'independent', name: 'Local Indian family restaurant', description: 'Non-franchise South Asian restaurants have similar food to chain delivery at ~40% less', estimatedCost: '$14–18', culturalMatch: 'high', dietaryNote: 'Many offer halal — ask directly' },
      { type: 'market', name: 'Indian grocery + spice store', description: 'Buying whole spices and base sauces from an Indian grocer cuts meal costs significantly', estimatedCost: '$3–5 per meal (bulk)', culturalMatch: 'high' },
    ],
    recipe: {
      title: 'Weeknight chicken biryani',
      estimatedCost: '$3–4 per serve',
      prepTime: '20 min',
      cookTime: '40 min',
      ingredients: [
        { item: 'bone-in chicken thighs', amount: '4 pieces (~700g)', swapTip: 'Drumsticks are cheaper and hold moisture well' },
        { item: 'basmati rice', amount: '2 cups', swapTip: 'Jasmine rice works and is often cheaper' },
        { item: 'plain yoghurt', amount: '½ cup' },
        { item: 'onions', amount: '2 large, thinly sliced' },
        { item: 'garlic', amount: '4 cloves, grated' },
        { item: 'fresh ginger', amount: '1 thumb, grated', swapTip: 'Frozen ginger grates from frozen — zero waste' },
        { item: 'biryani masala or garam masala', amount: '2 tsp' },
        { item: 'turmeric', amount: '½ tsp' },
        { item: 'oil', amount: '3 tbsp' },
        { item: 'saffron or food colouring', amount: 'pinch in 2 tbsp warm water', swapTip: 'Turmeric water is the budget saffron — same colour, negligible flavour difference at this scale' },
      ],
      steps: [
        'Marinate chicken in yoghurt, garlic, ginger, masala, turmeric. 30 min minimum, overnight better.',
        'Rinse and soak rice in cold water for 20 min, drain.',
        'Fry onions in oil until deep brown — this is the flavour base. Do not rush.',
        'Remove half the onions, add marinated chicken, cook 15 min, turning once.',
        'Par-cook rice in boiling salted water for 6 min — it should be 70% cooked. Drain.',
        'Layer rice over chicken in pot. Drizzle saffron water over top.',
        'Seal pot tightly (foil then lid), cook on lowest heat 25 min.',
        'Rest 10 min before opening. Stir gently, top with reserved onions.',
      ],
      nutritionNotes: 'Bone-in chicken provides more collagen. Yoghurt adds calcium and probiotics. A complete protein + carbohydrate meal at a low cost per serve.',
    },
  },
  {
    cuisine: 'South East Asian — Thai',
    keywords: ['pad thai', 'thai', 'pad see ew', 'green curry', 'red curry', 'tom yum', 'massaman', 'larb', 'som tum', 'papaya salad', 'thai basil', 'satay'],
    alternatives: [
      { type: 'independent', name: 'Thai family restaurant', description: 'Smaller Thai restaurants owned by families — often BYO, cheaper, and more authentic', estimatedCost: '$14–17', culturalMatch: 'high' },
      { type: 'market', name: 'Asian grocery store noodles + sauce', description: 'Flat rice noodles + tamarind paste + fish sauce from an Asian grocer is 80% of the way there', estimatedCost: '$3–4 per serve', culturalMatch: 'high' },
    ],
    recipe: {
      title: 'Pad Thai from scratch',
      estimatedCost: '$3–4 per serve',
      prepTime: '15 min',
      cookTime: '12 min',
      ingredients: [
        { item: 'flat rice noodles (5mm)', amount: '200g', swapTip: 'Vermicelli works, just soak less time' },
        { item: 'eggs', amount: '2' },
        { item: 'firm tofu or prawns or chicken', amount: '150g' },
        { item: 'bean sprouts', amount: '1 cup' },
        { item: 'spring onions', amount: '3 stalks' },
        { item: 'garlic', amount: '3 cloves' },
        { item: 'tamarind paste', amount: '2 tbsp', swapTip: 'Lime juice + a little sugar approximates this' },
        { item: 'fish sauce', amount: '2 tbsp', swapTip: 'Soy sauce for a vegetarian version' },
        { item: 'palm sugar or brown sugar', amount: '1 tbsp' },
        { item: 'oil', amount: '2 tbsp' },
        { item: 'crushed peanuts, lime, chilli', amount: 'to serve' },
      ],
      steps: [
        'Soak noodles in cold water 30 min, drain.',
        'Mix tamarind, fish sauce, sugar in a small bowl.',
        'Heat wok until very hot. Add oil, garlic — 20 seconds.',
        'Add protein, cook until just done.',
        'Push to side. Crack eggs in, scramble slightly, then fold into protein.',
        'Add noodles. Pour over sauce. Toss vigorously for 2 minutes over high heat.',
        'Add bean sprouts and spring onions, toss 30 seconds.',
        'Plate with peanuts, lime wedge, dried chilli.',
      ],
      nutritionNotes: 'High protein, complete amino acids if using egg + peanut. Fish sauce is high sodium — reduce if needed. Bean sprouts add crunch and vitamin C.',
    },
  },
  {
    cuisine: 'East Asian',
    keywords: ['ramen', 'fried rice', 'dumpling', 'gyoza', 'dim sum', 'yum cha', 'pho', 'banh mi', 'japanese', 'chinese', 'korean', 'vietnamese', 'noodle', 'sushi', 'teriyaki', 'bao', 'bbq pork', 'char siu'],
    alternatives: [
      { type: 'independent', name: 'Asian grocery + deli', description: 'Many Asian grocers run small cooked-food sections with authentic items at low margins', estimatedCost: '$8–12', culturalMatch: 'high' },
      { type: 'market', name: 'Cabramatta or Footscray market stalls (or local equivalent)', description: 'Community-run Asian food stalls near you — fresher and cheaper than restaurants', estimatedCost: '$7–10', culturalMatch: 'high' },
    ],
    recipe: {
      title: 'Egg fried rice',
      estimatedCost: '$1.50–2.50 per serve',
      prepTime: '5 min',
      cookTime: '10 min',
      ingredients: [
        { item: 'cooked white rice (day-old is best)', amount: '2 cups' },
        { item: 'eggs', amount: '3' },
        { item: 'soy sauce', amount: '2 tbsp' },
        { item: 'sesame oil', amount: '1 tsp' },
        { item: 'garlic', amount: '2 cloves' },
        { item: 'spring onions', amount: '3 stalks' },
        { item: 'frozen peas or corn', amount: '½ cup' },
        { item: 'oil', amount: '2 tbsp' },
        { item: 'any leftover protein', amount: 'optional — whatever is in the fridge' },
      ],
      steps: [
        'Break up cold rice with hands — no clumps.',
        'Heat wok or large pan until smoking.',
        'Add oil and garlic, 20 seconds.',
        'Add rice, spread flat, do not stir — let it crisp on the bottom, 2 minutes.',
        'Push rice to side. Crack eggs in, scramble until just set, mix into rice.',
        'Add peas, soy sauce, sesame oil. Toss constantly, 2 minutes more.',
        'Finish with spring onions. Adjust soy to taste.',
      ],
      nutritionNotes: 'Day-old rice has a lower glycaemic index. Eggs provide complete protein. Adding any vegetables boosts micronutrients at minimal cost.',
    },
  },
  {
    cuisine: 'Middle Eastern and North African',
    keywords: ['falafel', 'shawarma', 'kebab', 'hummus', 'pita', 'za\'atar', 'labneh', 'tabouleh', 'fattoush', 'kofta', 'turkish', 'lebanese', 'moroccan', 'tagine', 'couscous', 'halal snack pack', 'hsp', 'arab', 'persian', 'iranian'],
    alternatives: [
      { type: 'independent', name: 'Lebanese or Turkish family takeaway', description: 'Family-owned Middle Eastern takeaways are typically cheaper than chain kebab stores', estimatedCost: '$10–14', culturalMatch: 'high', dietaryNote: 'Often halal — verify with shop' },
      { type: 'market', name: 'Middle Eastern grocery', description: 'Tinned chickpeas, tahini, lemon, and garlic are the full hummus supply chain at $3–4 total', estimatedCost: '$3–4 for bulk batch', culturalMatch: 'high' },
    ],
    recipe: {
      title: 'Falafel with tahini sauce',
      estimatedCost: '$2–3 per serve',
      prepTime: '15 min + overnight soak',
      cookTime: '20 min',
      ingredients: [
        { item: 'dried chickpeas (not tinned)', amount: '200g, soaked overnight', swapTip: 'Must be dried — tinned chickpeas make mushy falafel' },
        { item: 'onion', amount: '½ large' },
        { item: 'garlic', amount: '3 cloves' },
        { item: 'parsley and coriander', amount: '½ cup each' },
        { item: 'cumin', amount: '1.5 tsp' },
        { item: 'coriander powder', amount: '1 tsp' },
        { item: 'bicarbonate of soda', amount: '½ tsp' },
        { item: 'oil for frying or baking', amount: '500ml (fry) or 2 tbsp (bake)' },
        { item: 'tahini', amount: '3 tbsp' },
        { item: 'lemon juice', amount: '2 tbsp' },
        { item: 'water', amount: 'to thin tahini sauce' },
      ],
      steps: [
        'Drain soaked chickpeas. Blitz in food processor with onion, garlic, herbs, spices until coarse paste.',
        'Mix in bicarb. Rest 30 min in fridge.',
        'Form into flat patties or balls.',
        'Shallow fry in 2cm oil at 180°C, 3 minutes each side. Or bake 200°C 25 min, flip halfway.',
        'Sauce: thin tahini with lemon juice and cold water until pourable. Season with salt.',
        'Serve in pita with salad, pickles, sauce.',
      ],
      nutritionNotes: 'Chickpeas are an excellent plant protein source and high in iron. Parsley contributes significant vitamin C. Very low cost per gram of protein.',
    },
  },
  {
    cuisine: 'Italian and pizza',
    keywords: ['pizza', 'pasta', 'lasagne', 'bolognese', 'carbonara', 'risotto', 'gnocchi', 'tiramisu', 'italian'],
    alternatives: [
      { type: 'independent', name: 'Local Italian trattoria', description: 'Smaller Italian restaurants away from high streets often charge $5–8 less for the same dish', estimatedCost: '$15–20', culturalMatch: 'high' },
      { type: 'market', name: 'Produce market tomatoes + pasta', description: 'A $3 bag of pasta and $2 worth of market tomatoes makes 4 serves of sugo', estimatedCost: '$1–2 per serve', culturalMatch: 'medium' },
    ],
    recipe: {
      title: 'Spaghetti al pomodoro',
      estimatedCost: '$1.50–2.50 per serve',
      prepTime: '5 min',
      cookTime: '25 min',
      ingredients: [
        { item: 'dried spaghetti', amount: '100g per serve' },
        { item: 'whole peeled tinned tomatoes', amount: '400g tin for 3 serves', swapTip: 'Passata works, just simmer 10 min less' },
        { item: 'garlic', amount: '4 cloves' },
        { item: 'olive oil or any neutral oil', amount: '3 tbsp' },
        { item: 'fresh basil or dried', amount: 'handful or 1 tsp' },
        { item: 'parmesan or any hard cheese', amount: 'to finish' },
        { item: 'salt', amount: 'generously in pasta water' },
      ],
      steps: [
        'Bring large pot of very well salted water to a rolling boil.',
        'Warm oil in a wide pan. Add garlic whole or sliced on low heat — do not brown.',
        'Add tomatoes, crush with a spoon. Add ½ cup pasta water. Simmer 20 min on medium-low.',
        'Cook pasta 2 min less than the packet says.',
        'Transfer pasta directly into sauce with tongs. Add more pasta water, toss vigorously until the sauce coats each strand.',
        'Tear basil over. Plate, finish with cheese and a crack of pepper.',
      ],
      nutritionNotes: 'Tinned tomatoes are higher in lycopene than fresh when cooked. A complete carbohydrate + protein meal — add a small protein (egg, cheese, legumes) to balance.',
    },
  },
  {
    cuisine: 'Mexican and Latin American',
    keywords: ['taco', 'burrito', 'quesadilla', 'nachos', 'guacamole', 'enchilada', 'tamale', 'mexican', 'latin', 'empanada', 'arepa', 'ceviche', 'churro'],
    alternatives: [
      { type: 'independent', name: 'Local Mexican taqueria', description: 'Non-franchise taco bars are typically $5–8 cheaper per person than chain Mexican', estimatedCost: '$12–16', culturalMatch: 'high' },
      { type: 'market', name: 'Latin grocery for tortillas and beans', description: 'Dried black beans + cheap tortillas from a Latin grocer make 6 serves for $4', estimatedCost: '$3–4 for a batch', culturalMatch: 'high' },
    ],
    recipe: {
      title: 'Bean and cheese tacos',
      estimatedCost: '$1.50–2 per serve',
      prepTime: '10 min',
      cookTime: '15 min',
      ingredients: [
        { item: 'small flour or corn tortillas', amount: '3–4 per serve' },
        { item: 'tinned black or pinto beans', amount: '400g tin (2–3 serves)' },
        { item: 'cumin', amount: '1 tsp' },
        { item: 'smoked paprika', amount: '½ tsp' },
        { item: 'garlic', amount: '2 cloves' },
        { item: 'cheese (any melting type)', amount: '30g per serve' },
        { item: 'lime', amount: '1' },
        { item: 'salsa or tinned tomatoes + chilli', amount: '½ cup' },
        { item: 'coriander or parsley', amount: 'handful' },
      ],
      steps: [
        'Drain beans. Fry garlic in oil 30 seconds, add beans, cumin, paprika, and a splash of water.',
        'Mash roughly with a fork — leave some texture. Season with salt and lime.',
        'Warm tortillas directly over gas or in a dry pan until charred spots appear.',
        'Fill with beans, top with cheese, salsa, coriander, squeeze of lime.',
      ],
      nutritionNotes: 'Black beans are one of the highest fibre foods available. Lime juice enhances iron absorption from beans. Very high satiety at low cost.',
    },
  },
];

const fallback: CuisineEntry = {
  cuisine: 'Homestyle',
  keywords: [],
  alternatives: [
    { type: 'independent', name: 'Local café or eatery', description: 'Independent eateries near you often serve equivalent food at lower prices than chains', estimatedCost: '$12–16', culturalMatch: 'medium' },
    { type: 'market', name: 'Farmers market produce', description: 'Fresh seasonal produce from a local market is often 20–40% cheaper than supermarket equivalents', estimatedCost: '$5–8 for a meal\'s worth', culturalMatch: 'medium' },
  ],
  recipe: {
    title: 'Egg and vegetable stir-through',
    estimatedCost: '$2–3 per serve',
    prepTime: '10 min',
    cookTime: '10 min',
    ingredients: [
      { item: 'eggs', amount: '2–3' },
      { item: 'any seasonal vegetables', amount: '2 cups, chopped' },
      { item: 'garlic', amount: '2 cloves' },
      { item: 'soy sauce or salt', amount: 'to taste' },
      { item: 'oil', amount: '1 tbsp' },
      { item: 'cooked rice or bread', amount: 'to serve' },
    ],
    steps: [
      'Heat oil in a pan. Add garlic, cook 30 seconds.',
      'Add vegetables in order of density — hardest first.',
      'Push to side. Add eggs, scramble, then fold together.',
      'Season. Serve over rice or with bread.',
    ],
    nutritionNotes: 'Eggs are one of the most nutrient-dense affordable foods. Seasonal vegetables maximise micronutrient value at lowest cost.',
  },
};

export function detectCraving(input: string): CravingResult {
  const lower = input.toLowerCase().trim();
  let match = cuisineDB.find((entry) => entry.keywords.some((kw) => lower.includes(kw)));
  if (!match) match = fallback;

  const alts: Alternative[] = match.alternatives.map((a, i) => ({
    ...a,
    walkTime: i === 0 ? '8–15 min walk' : '5–10 min walk',
  }));

  const recipe: Recipe = {
    ...match.recipe,
    servings: 4,
  };

  return {
    detectedCuisine: match.cuisine,
    detectedDish: input,
    alternatives: alts,
    recipe,
  };
}
