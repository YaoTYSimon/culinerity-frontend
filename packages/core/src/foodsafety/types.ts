/** One official page the Food safety view was written from. */
export interface FoodSafetySource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  /** The page's own copyright or licence wording, and how it is used here. */
  licence: string;
  /** ISO date the page was read. */
  accessed: string;
  /** ISO date the page says it was last reviewed or updated; left out when the page gives none. */
  reviewed?: string;
}

/** One plain sentence, with the sources it came from. */
export interface FoodSafetyLine {
  text: string;
  sourceIds: string[];
}

export interface FoodSafetySection {
  id: string;
  title: string;
  lines: FoodSafetyLine[];
}

export interface FoodSafetyContact {
  id: string;
  name: string;
  /** The number as people read it. */
  display: string;
  /** Digits only, for a tel: link. */
  tel: string;
  hours: string;
  sourceId: string;
}

export interface FoodSafetyData {
  generatedAt: string;
  checked: string;
  sources: FoodSafetySource[];
  sections: FoodSafetySection[];
  contacts: FoodSafetyContact[];
  notFound: string[];
}
