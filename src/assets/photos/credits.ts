export interface PhotoCredit {
  itemId: string;
  title: string;
  creator: string;
  licence: string;
  licenceUrl: string;
  sourceUrl: string;
}

/** Credits for every photograph in this folder, from Wikimedia Commons. All are CC0 or public domain; credited here as a courtesy. */
export const PHOTO_CREDITS: PhotoCredit[] = [
  { itemId: "burger", title: "GBK Burger (Unsplash)", creator: "Hello Lightbulb hellolightbulb", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:GBK_Burger_(Unsplash).jpg" },
  { itemId: "hot-chips", title: "Truffle Fries (Unsplash)", creator: "Stephanie McCabe stephaniemccabe", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:Truffle_Fries_(Unsplash).jpg" },
  { itemId: "bubble-tea", title: "Pearl Milk Tea in Chun Shui Tang", creator: "Battlesnake1", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:Pearl_Milk_Tea_in_Chun_Shui_Tang.jpg" },
  { itemId: "instant-noodles", title: "Ladle of Ramen (Unsplash)", creator: "Piotr Miazga pmiazga", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:Ladle_of_Ramen_(Unsplash).jpg" },
  { itemId: "pizza", title: "A well garnished pizza (Unsplash)", creator: "David Nuescheler uncled", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:A_well_garnished_pizza_(Unsplash).jpg" },
  { itemId: "fried-chicken", title: "Fried Chicken (Unsplash)", creator: "Brian Chan tigerrulezzz", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:Fried_Chicken_(Unsplash).jpg" },
  { itemId: "kebab", title: "Döner Kebab Wrap - What The Pitta", creator: "Andy Li", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:D%C3%B6ner_Kebab_Wrap_-_What_The_Pitta.jpg" },
  { itemId: "pastry", title: "Rustic Bakery Treats (Unsplash)", creator: "Olenka Kotyk olenka_kotyk", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:Rustic_Bakery_Treats_(Unsplash).jpg" },
  { itemId: "soft-drink", title: "Glass cola", creator: "pic_p_ter", licence: "public domain", licenceUrl: "https://creativecommons.org/publicdomain/mark/1.0/", sourceUrl: "https://commons.wikimedia.org/wiki/File:Glass_cola.jpg" },
  { itemId: "chocolate", title: "Dark-brown-milk-candy (24298960866)", creator: "www.Pixel.la Free Stock Photos", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:Dark-brown-milk-candy_(24298960866).jpg" },
];
