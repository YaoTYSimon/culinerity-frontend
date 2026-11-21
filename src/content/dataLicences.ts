export interface DataLicence {
  id: string;
  label: string;
  text: string;
  url: string;
}

/**
 * Credits for the bulk places list. Overture-only: no OpenStreetMap, and Foursquare-derived records are left out.
 * City of Melbourne CLUE (CC BY) is added in Task 2.1 only if it is actually used to match places.
 */
export function buildDataLicences(overtureRelease: string | null): DataLicence[] {
  const release = overtureRelease ? `release ${overtureRelease}` : 'The release is named here when the places list is added';
  return [
    {
      id: 'overture',
      label: 'Overture Maps places',
      text: `Places in the "Not checked by us" list come from Overture Maps Foundation, overturemaps.org (${release}). We filter them but do not check them one by one.`,
      url: 'https://docs.overturemaps.org/guides/places/',
    },
    {
      id: 'cdla-permissive-2.0',
      label: 'CDLA-Permissive-2.0',
      text: 'The Overture places data comes from contributors (Meta, Microsoft, Uberall and others) and is shared under the Community Data License Agreement, Permissive, Version 2.0, with the text available at this link. A small part comes from AllThePlaces under CC0 1.0 (public domain, no credit needed).',
      url: 'https://cdla.dev/permissive-2-0/',
    },
  ];
}

export const DATA_LICENCES: DataLicence[] = buildDataLicences(null);
