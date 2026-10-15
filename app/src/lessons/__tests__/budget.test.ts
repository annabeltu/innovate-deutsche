import {
  budgetScenario,
  budgetRemaining,
  isBudgetCorrect,
  formatMoney,
} from "../budget";
import { challengeCopy } from "../../i18n/challenges";

it.each(["US", "MX", "KE"] as const)(
  "requires the repair to be funded in %s",
  (country) => {
    const scenario = budgetScenario(country);
    expect(budgetRemaining(country, scenario.allocation)).toBe(
      -scenario.repair,
    );
    expect(isBudgetCorrect(country, scenario.allocation)).toBe(false);
    const adjusted = {
      ...scenario.allocation,
      school: scenario.allocation.school - scenario.repair,
    };
    expect(isBudgetCorrect(country, adjusted)).toBe(true);
    expect(budgetRemaining(country, adjusted)).toBe(0);
  },
);
it("rejects a zeroed budget and a plan that removes necessary savings", () => {
  expect(
    isBudgetCorrect("US", {
      rent: 0,
      food: 0,
      transport: 0,
      school: 0,
      saving: 0,
    }),
  ).toBe(false);
  expect(
    isBudgetCorrect("US", {
      rent: 800,
      food: 400,
      transport: 200,
      school: 300,
      saving: 0,
    }),
  ).toBe(false);
});
it("rejects invalid or fractional teaching amounts", () => {
  const { allocation } = budgetScenario("US");
  expect(isBudgetCorrect("US", { ...allocation, school: NaN })).toBe(false);
  expect(
    isBudgetCorrect("US", { ...allocation, school: 99.5, saving: 200.5 }),
  ).toBe(false);
});
it("uses the country's currency for the active language", () => {
  expect(formatMoney("US", "en", 2000)).toBe("$2,000");
  expect(budgetScenario("MX").currency).toBe("MXN");
  expect(budgetScenario("KE").currency).toBe("KES");
});
it.each(["es", "sw"] as const)(
  "has every challenge key translated in %s",
  (language) => {
    expect(Object.keys(challengeCopy[language]).sort()).toEqual(
      Object.keys(challengeCopy.en).sort(),
    );
  },
);
