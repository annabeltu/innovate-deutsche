// Kompass brand tokens. The UI chrome always uses these blues.
export const colors = {
  deepBlue: '#0018A8',
  darkBlue: '#000E5C',
  midBlue: '#2A5BD7',
  brightBlue: '#3D8BFF',
  lightBlue: '#A9C8FF',
  iceBlue: '#E8F0FF',
  grey: '#C9D1E0',
  white: '#FFFFFF',
  success: '#1FA463',
  error: '#E5484D',
  coinGold: '#F5B700',
} as const;

// Regional accents: only the roadmap background changes by country.
export const regionAccents = {
  IN: '#F39C12', // India
  KE: '#E0A82E', // Kenya
  DE: '#2E7D4F', // Germany
} as const;

export type ColorToken = keyof typeof colors;
export type CountryCode = keyof typeof regionAccents;
