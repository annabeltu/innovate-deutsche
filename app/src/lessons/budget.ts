import type { Country, Language } from "../state/useApp";

export const budgetCategories = [
  "rent",
  "food",
  "transport",
  "school",
  "saving",
] as const;
export type BudgetCategory = (typeof budgetCategories)[number];
export type BudgetAllocation = Record<BudgetCategory, number>;
const COUNTRIES = {
  US: { income: 2000, currency: "USD" },
  MX: { income: 32000, currency: "MXN" },
  KE: { income: 40000, currency: "KES" },
} as const;
const STARTING_PERCENT = {
  rent: 40,
  food: 20,
  transport: 10,
  school: 20,
  saving: 10,
};
const MINIMUM_PERCENT = {
  rent: 30,
  food: 10,
  transport: 5,
  school: 0,
  saving: 5,
};
const REPAIR_PERCENT = 15;
const PERCENT_TOTAL = 100;

/** Synthetic teaching scenario; all amounts use whole currency units. */
export function budgetScenario(country: Country) {
  const { income, currency } = COUNTRIES[country];
  const portion = income / PERCENT_TOTAL;
  const allocation = Object.fromEntries(
    budgetCategories.map((category) => [
      category,
      STARTING_PERCENT[category] * portion,
    ]),
  ) as BudgetAllocation;
  const minimums = Object.fromEntries(
    budgetCategories.map((category) => [
      category,
      MINIMUM_PERCENT[category] * portion,
    ]),
  ) as BudgetAllocation;
  return {
    income,
    currency,
    repair: REPAIR_PERCENT * portion,
    step: portion,
    allocation,
    minimums,
  };
}

/** Remaining money includes the unexpected repair, so it cannot be forgotten. */
export function budgetRemaining(
  country: Country,
  allocation: BudgetAllocation,
) {
  const scenario = budgetScenario(country);
  return (
    scenario.income -
    scenario.repair -
    budgetCategories.reduce((sum, category) => sum + allocation[category], 0)
  );
}

/** Accept a balanced plan that preserves the scenario's stated minimum needs. */
export function isBudgetCorrect(
  country: Country,
  allocation: BudgetAllocation,
) {
  const { income, minimums } = budgetScenario(country);
  return (
    budgetCategories.every(
      (category) =>
        Number.isInteger(allocation[category]) &&
        allocation[category] >= minimums[category] &&
        allocation[category] <= income,
    ) && budgetRemaining(country, allocation) === 0
  );
}

/** Format synthetic whole-unit amounts using the active language and currency. */
export function formatMoney(
  country: Country,
  language: Language,
  amount: number,
) {
  return new Intl.NumberFormat(language, {
    style: "currency",
    currency: COUNTRIES[country].currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
