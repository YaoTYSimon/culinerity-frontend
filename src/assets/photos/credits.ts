export interface PhotoCredit {
  itemId: string;
  title: string;
  creator: string;
  licence: string;
  licenceUrl: string;
  sourceUrl: string;
}

/** Credits for every photograph in this folder, from Wikimedia Commons. All are CC0; credited here as a courtesy. */
export const PHOTO_CREDITS: PhotoCredit[] = [
  { itemId: "burger", title: "GBK Burger (Unsplash)", creator: "Hello Lightbulb hellolightbulb", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:GBK_Burger_(Unsplash).jpg" },
  { itemId: "hot-chips", title: "Truffle Fries (Unsplash)", creator: "Stephanie McCabe stephaniemccabe", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:Truffle_Fries_(Unsplash).jpg" },
  { itemId: "bubble-tea", title: "A bubble tea with tapioca pearls, July 2018", creator: "sam651030 from Pixabay", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:A_bubble_tea_with_tapioca_pearls,_July_2018.jpg" },
  { itemId: "instant-noodles", title: "Ladle of Ramen (Unsplash)", creator: "Piotr Miazga pmiazga", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:Ladle_of_Ramen_(Unsplash).jpg" },
  { itemId: "pizza", title: "A well garnished pizza (Unsplash)", creator: "David Nuescheler uncled", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:A_well_garnished_pizza_(Unsplash).jpg" },
  { itemId: "fried-chicken", title: "Crispy chicken tenders, Ship and Shovell Pub (September 2023)", creator: "Benoît Prieur", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:Crispy_chicken_tenders,_Ship_and_Shovell_Pub_(September_2023).JPG" },
  { itemId: "kebab", title: "Handmade Chicken Shawarma Wrap - Lavash", creator: "Andy Li", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:Handmade_Chicken_Shawarma_Wrap_-_Lavash.jpg" },
  { itemId: "pastry", title: "Rustic Bakery Treats (Unsplash)", creator: "Olenka Kotyk olenka_kotyk", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:Rustic_Bakery_Treats_(Unsplash).jpg" },
  { itemId: "soft-drink", title: "Iced tea (Unsplash)", creator: "Julia D'Alkmin jdalkmin", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:Iced_tea_(Unsplash).jpg" },
  { itemId: "chocolate", title: "Dark-brown-milk-candy (24298960866)", creator: "www.Pixel.la Free Stock Photos", licence: "CC0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", sourceUrl: "https://commons.wikimedia.org/wiki/File:Dark-brown-milk-candy_(24298960866).jpg" },
];
