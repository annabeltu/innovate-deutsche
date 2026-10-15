import type { CountryCode, LanguageCode } from '@/src/types/onboarding';

// MVP countries and languages. Add or replace countries here only.
// No financial facts belong in this file; those come from data/country_packs.

export type LanguageOption = {
  code: LanguageCode;
  labelKey: string;
  /** The language's name in itself, shown so users can find their language. */
  nativeName: string;
};

export type CountryOption = {
  countryCode: CountryCode;
  labelKey: string;
  currencyCode: string;
  currencySymbol: string;
  /** First entry is the default language for the country. */
  supportedLanguages: LanguageCode[];
};

/** Every language the app supports, keyed by code. */
export const LANGUAGES: Record<LanguageCode, LanguageOption> = {
  en: { code: 'en', labelKey: 'onboarding.language.en', nativeName: 'English' },
  es: { code: 'es', labelKey: 'onboarding.language.es', nativeName: 'Español' },
  sw: { code: 'sw', labelKey: 'onboarding.language.sw', nativeName: 'Kiswahili' },
};

/** Supported countries, in the order they appear in the picker. */
export const COUNTRIES: CountryOption[] = [
  {
    countryCode: 'US',
    labelKey: 'onboarding.country.US',
    currencyCode: 'USD',
    currencySymbol: '$',
    supportedLanguages: ['en', 'es'],
  },
  {
    countryCode: 'MX',
    labelKey: 'onboarding.country.MX',
    currencyCode: 'MXN',
    currencySymbol: '$',
    supportedLanguages: ['es', 'en'],
  },
  {
    countryCode: 'KE',
    labelKey: 'onboarding.country.KE',
    currencyCode: 'KES',
    currencySymbol: 'KSh',
    supportedLanguages: ['en', 'sw'],
  },
];

/** Returns the country config for a code, or undefined if unsupported. */
export function getCountry(countryCode: string): CountryOption | undefined {
  return COUNTRIES.find((country) => country.countryCode === countryCode);
}

/** Returns the language options to show once a country is picked. */
export function getLanguagesForCountry(countryCode: CountryCode): LanguageOption[] {
  const country = getCountry(countryCode);
  return country ? country.supportedLanguages.map((code) => LANGUAGES[code]) : [];
}
