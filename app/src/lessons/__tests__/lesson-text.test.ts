import {
  cardSections,
  highlightRuns,
  isComparisonBridge,
  scamParts,
  splitSentences,
} from "../lesson-text";

describe("splitSentences", () => {
  it("splits on sentence endings and keeps the punctuation", () => {
    expect(
      splitSentences("Money at home can be lost. A bank keeps it safe!"),
    ).toEqual(["Money at home can be lost.", "A bank keeps it safe!"]);
  });

  it("does not split numbers with decimal points or thousands separators", () => {
    expect(
      splitSentences("Rates fell to 1.5% on KSh 8,000. Shop around."),
    ).toEqual(["Rates fell to 1.5% on KSh 8,000.", "Shop around."]);
  });
});

describe("highlightRuns", () => {
  const keys = (text: string) =>
    highlightRuns(text)
      .filter((run) => run.key)
      .map((run) => run.text);

  it.each([
    ["Save KSh 8,000 by June.", ["KSh 8,000"]],
    ["Send MX$500 or $50 today.", ["MX$500", "$50"]],
    ["In your country, 45% of adults save.", ["45%"]],
    ["Only 3 steps.", ["3"]],
  ])("highlights the numbers and amounts in %p", (text, expected) => {
    expect(keys(text)).toEqual(expected);
  });

  it("keeps the full text when the runs are joined", () => {
    const text = "Send $50 today, 2 times.";

    expect(
      highlightRuns(text)
        .map((run) => run.text)
        .join(""),
    ).toBe(text);
  });

  it("leaves sentence punctuation outside the highlight", () => {
    expect(keys("It costs $300.")).toEqual(["$300"]);
  });
});

it("makes the first sentence the title and the rest short rows", () => {
  expect(
    cardSections("A chama builds the habit. It is not insured. Use both."),
  ).toEqual({
    title: "A chama builds the habit.",
    rows: ["It is not insured.", "Use both."],
  });
});

describe("scamParts", () => {
  it("separates the message from the closing question", () => {
    expect(
      scamParts(
        "A message says: You won a prize! Send $50 today. Is this a scam or safe?",
      ),
    ).toEqual({
      message: "A message says: You won a prize! Send $50 today.",
      question: "Is this a scam or safe?",
    });
  });

  it("keeps the whole text as the message when there is no question", () => {
    expect(scamParts("Send $50 today.")).toEqual({
      message: "Send $50 today.",
      question: "",
    });
  });
});

describe("isComparisonBridge", () => {
  it("treats a Findex comparison as a flip-card bridge", () => {
    expect(
      isComparisonBridge(
        "In your country, 45% of adults save. In richer countries, it is 70%.",
      ),
    ).toBe(true);
  });

  it("treats plain advice written as a bridge as an ordinary card", () => {
    expect(
      isComparisonBridge(
        "Choose a safe place to keep the money. Keep it separate from spending.",
      ),
    ).toBe(false);
  });
});
