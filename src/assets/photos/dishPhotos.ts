/**
 * One table: catalogue id (craving, swap food or Cook recipe) to the photo of its dish.
 * Photos are per dish, not per id, so many ids share one file. An id with its own
 * photo (burger, pizza, ...) needs no row. A test checks that every id has a photo
 * through its own file or this table, that no row points at a missing file, and that no id is stale.
 */
export const DISH_PHOTO: Record<string, string> = {
  // Cravings
  'butter-chicken-jar-sauce': 'curry-rice', 'lasagne-frozen': 'spaghetti-bolognese', 'chicken-nuggets': 'fried-chicken', 
  'chinese-takeaway': 'fried-rice', 'tacos-burritos': 'tacos', 'anzac-biscuits': 'biscuits',
  'pad-thai': 'stir-fry', 'takeaway-curry': 'curry-rice', 'creamy-pasta': 'pasta-creamy', 'bacon-and-egg-roll': 'eggs-on-toast',
  'tim-tams': 'biscuits', 'savoury-snacks': 'mixed-nuts', 'pancakes-and-donuts': 'doughnut', 
  // Swap foods
  'smash-burger': 'burger', 'chicken-salad-roll': 'salad', 'oven-wedges': 'hot-chips', 'roast-chickpeas': 'mixed-nuts', 'homemade-milk-tea': 'bubble-tea',
  'fruit-iced-tea': 'soft-drink', 'egg-noodle-stirfry': 'stir-fry', 'egg-fried-rice': 'fried-rice', 'turkish-bread-pizza': 'pizza', 'spaghetti-pomodoro': 'pasta-tomato',
  'banana-pb-toast': 'banana-bread', 'cocoa-yoghurt': 'chocolate', 'baked-drumsticks': 'roast-chicken', 'falafel-wrap': 'falafel', 'chicken-kebab-home': 'kebab',
  'oat-banana-muffin': 'banana-bread', 'fruit-toast-ricotta': 'pastry', 'sparkling-lemon': 'soft-drink', 'unsweetened-iced-tea': 'soft-drink',
  'dal-red-lentil': 'lentil-soup', 'ginisang-monggo': 'bean-stew', 'vegetable-upma': 'rice-bowl', 'idiyappam-coconut': 'rice-bowl', 'hummus-veg-sticks': 'hummus-plate',
  spanakorizo: 'rice-bowl', 'greek-salad': 'salad', 'baked-kibbeh': 'roast-chicken', 'tofu-banh-mi': 'salad', minestrone: 'welcome-soup', 'gigantes-plaki': 'beans-on-toast',
  'shepherds-salad': 'salad', karniyarik: 'roast-chicken', 'chicken-souvlaki-pita': 'kebab', fattoush: 'salad', 'chicken-noodle-bowl': 'noodle-soup',
  'chicken-shish-rice': 'roast-chicken', 'chicken-tomato-curry': 'curry-rice', 'tofu-vegetable-stirfry': 'stir-fry', 'chicken-rice-paper-rolls': 'spring-rolls',
  'choy-sum-garlic-rice': 'stir-fry', 'penne-arrabbiata': 'pasta-tomato', mujaddara: 'rice-bowl', 'pasta-e-fagioli': 'welcome-soup', fasolada: 'lentil-soup',
  'imam-bayildi': 'bean-stew', 'chicken-pho': 'noodle-soup', 'beef-pho': 'noodle-soup', 'pancit-bihon': 'stir-fry', 'arroz-caldo': 'welcome-soup', 'kuru-fasulye': 'bean-stew',
  'rice-mallung': 'rice-bowl', 'chicken-egg-kottu': 'fried-rice', 'curd-rice': 'rice-bowl', 'egg-bhurji': 'eggs-on-toast', 'zucchini-frittata': 'omelette',
  kiribath: 'rice-bowl', 'rice-mung-pongal': 'rice-bowl', 'chicken-adobo-rice': 'roast-chicken', 'tortang-talong': 'omelette', 'tomato-egg-rice': 'fried-rice',
  'chicken-cabbage-dumplings': 'dumplings', 'spaghetti-aglio-olio': 'pasta-tomato', tabbouleh: 'salad', 'chicken-vegetable-fried-rice': 'fried-rice',
  'rice-pol-sambol-egg': 'rice-bowl', 'lemon-rice-peanuts': 'rice-bowl', 'baked-fish-capsicum': 'fish-and-chips', 'tofu-noodle-veg-stir-fry': 'stir-fry',
  'creamy-vegetable-pasta': 'pasta-creamy', 'chicken-pesto-pasta': 'pasta-creamy', 'mini-omelettes': 'omelette', 'spinach-egg-roll-ups': 'omelette',
  'tropical-frozen-yoghurt-bites': 'ice-cream', 'banana-bread-slice': 'banana-bread', 'avocado-salsa-pita-chips': 'hummus-plate', 'spiced-mixed-nuts': 'mixed-nuts',
  'banana-blueberry-pikelets': 'welcome-pancakes', 'pizza-scrolls': 'pizza', 'beef-taco-roll': 'tacos',
  // Cook recipes (shared with swap foods where the id is the same)
  'chana-masala': 'welcome-curry', 'aloo-gobi': 'welcome-curry', 'chicken-veg-nuggets': 'fried-chicken', 'beef-veg-sausage-rolls': 'sausage-roll',
  'lentil-sweet-potato-patties': 'fritters', 'ginger-chicken-veg-stir-fry': 'stir-fry', 'san-choy-bow': 'salad', 'simple-beef-nachos': 'nachos',
  'chicken-avocado-soft-tacos': 'tacos', 'anzac-biscuits-home': 'biscuits', 'carrot-date-oat-biscuit': 'biscuits', 'banana-blueberry-smoothie': 'smoothie',
  'strawberry-yoghurt-smoothie': 'smoothie', 'pumpkin-chickpea-coconut-curry': 'welcome-curry',
  'scrambled-eggs-toast': 'eggs-on-toast', 'egg-and-pea-rice': 'fried-rice', 'tuna-tomato-pasta': 'pasta-tomato', 'lentil-vegetable-soup': 'lentil-soup',
  'banana-porridge': 'banana-bread', 'chickpea-tomato-stew': 'bean-stew', 'potato-pea-mash': 'fritters', 'corn-fritters': 'fritters',
  'salmon-potato-cakes': 'fritters', 'kidney-bean-rice': 'bean-stew', 'cheese-tomato-toastie': 'garlic-bread', 'palak-dal': 'lentil-soup', 'simple-chicken-curry': 'curry-rice',
  'cabbage-poriyal': 'stir-fry', 'tomato-rice': 'rice-bowl', 'egg-curry': 'welcome-curry', 'potato-pea-masala': 'welcome-curry', 'tomato-egg-stir-fry': 'stir-fry',
  'tofu-choy-sum-stir-fry': 'stir-fry', 'wombok-mushroom-noodles': 'stir-fry', 'chicken-broccoli-stir-fry': 'stir-fry', 'pasta-pomodoro': 'pasta-tomato',
  'minestrone-style-soup': 'welcome-soup', 'spaghetti-spinach-ricotta': 'pasta-creamy', 'beef-ragu-spaghetti': 'spaghetti-bolognese', 'village-salad': 'salad',
  'spinach-rice': 'rice-bowl', 'greek-lentil-soup': 'lentil-soup', 'chicken-and-potato-tray': 'roast-chicken', 'hummus-pita-plate': 'hummus-plate', 'lentils-and-rice': 'rice-bowl',
  'pita-salad': 'salad', 'lamb-kofta-plate': 'kebab', 'tofu-noodle-salad': 'stir-fry', 'chicken-cabbage-salad': 'salad', 'tomato-tofu-rice': 'rice-bowl',
  'vinegar-garlic-chicken': 'roast-chicken', 'eggplant-omelette': 'omelette', 'sauteed-cabbage-egg': 'omelette', 'tomato-pepper-eggs': 'eggs-on-toast',
  'tomato-bulgur-pilaf': 'rice-bowl', 'eggplant-chickpea-stew': 'bean-stew', 'coconut-dhal': 'lentil-soup', 'green-bean-coconut-curry': 'welcome-curry',
  'pumpkin-coconut-curry': 'welcome-curry',
};
