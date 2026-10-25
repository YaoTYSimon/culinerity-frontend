export interface PhotoCredit {
  itemId: string;
  title: string;
  creator: string;
  licence: string;
  licenceUrl: string;
  sourceUrl: string;
}

/** Credits for every photograph in this folder, from Wikimedia Commons. CC BY and CC BY-SA require this visible credit. */
export const PHOTO_CREDITS: PhotoCredit[] = [
  { itemId: "burger", title: "NCI Visuals Food Hamburger", creator: "Len Rizzi (photographer)", licence: "public domain", licenceUrl: "https://creativecommons.org/publicdomain/mark/1.0/", sourceUrl: "https://commons.wikimedia.org/wiki/File:NCI_Visuals_Food_Hamburger.jpg" },
  { itemId: "hot-chips", title: "Plate of chips at the Chalet Cafe, Cowfold, West Sussex, England", creator: "Acabashi", licence: "CC BY-SA 4.0", licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Plate_of_chips_at_the_Chalet_Cafe,_Cowfold,_West_Sussex,_England.jpg" },
  { itemId: "bubble-tea", title: "Pearl Milk Tea in Chun Shui Tang", creator: "Battlesnake1", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:Pearl_Milk_Tea_in_Chun_Shui_Tang.jpg" },
  { itemId: "instant-noodles", title: "Multi-flavor vegetable instant noodles", creator: "Fumikas Sagisavas", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:Multi-flavor_vegetable_instant_noodles.jpg" },
  { itemId: "pizza", title: "Two pizza slices", creator: "Douglas Perkins", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:Two_pizza_slices.jpg" },
  { itemId: "fried-chicken", title: "Fried Chicken (Unsplash)", creator: "Brian Chan tigerrulezzz", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:Fried_Chicken_(Unsplash).jpg" },
  { itemId: "kebab", title: "Döner Kebab Wrap - What The Pitta", creator: "Andy Li", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:D%C3%B6ner_Kebab_Wrap_-_What_The_Pitta.jpg" },
  { itemId: "pastry", title: "Croissant with jam and butter - Little Miss Piggies", creator: "Andy Li", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:Croissant_with_jam_and_butter_-_Little_Miss_Piggies.jpg" },
  { itemId: "soft-drink", title: "Glass cola", creator: "pic_p_ter", licence: "public domain", licenceUrl: "https://creativecommons.org/publicdomain/mark/1.0/", sourceUrl: "https://commons.wikimedia.org/wiki/File:Glass_cola.jpg" },
  { itemId: "chocolate", title: "Rakhat Kazakhstan dark chocolate bar (square crop)", creator: "Duman Amangali of the Central Asian Student Union, University of British Columbia (UBC)", licence: "CC BY 4.0", licenceUrl: "https://creativecommons.org/licenses/by/4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Rakhat_Kazakhstan_dark_chocolate_bar_(square_crop).jpg" },
];
