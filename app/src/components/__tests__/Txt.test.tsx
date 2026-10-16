import React from "react";
import { render, screen } from "@testing-library/react-native";
import { Txt } from "../Txt";
import { useApp } from "../../state/useApp";
import { colors, typeScale } from "../../theme/tokens";

beforeEach(() => {
  useApp.getState().set({ ...useApp.getInitialState() });
});

it("uses the body size from the type scale by default", async () => {
  await render(<Txt>Hello</Txt>);

  expect(screen.getByText("Hello")).toHaveStyle({
    fontSize: typeScale.body.fontSize,
    color: colors.darkBlue,
  });
});

it("grows every variant when larger text is on", async () => {
  useApp.getState().set({ large: true });

  await render(<Txt variant="heading">Saving</Txt>);

  expect(screen.getByText("Saving")).toHaveStyle({
    fontSize: typeScale.heading.largeFontSize,
    lineHeight: typeScale.heading.largeLineHeight,
  });
});

it("switches to white text on dark backgrounds", async () => {
  await render(<Txt light>Ask Kiko</Txt>);

  expect(screen.getByText("Ask Kiko")).toHaveStyle({ color: colors.white });
});
