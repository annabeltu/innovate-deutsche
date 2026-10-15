import React from "react";
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import { render, screen } from "@testing-library/react-native";
import { AppScenery } from "../AppScenery";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

it("fills the screen instead of rendering the scenery at full image size", async () => {
  await render(<AppScenery />);

  expect(screen.getByTestId("app-scenery-image")).toHaveStyle({
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  });
});
