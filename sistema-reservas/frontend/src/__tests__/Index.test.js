import React from "react";
import ReactDOM from "react-dom/client";
import App from "../App";

jest.mock("react-dom/client", () => ({
  createRoot: jest.fn().mockReturnValue({
    render: jest.fn(),
  }),
}));

describe("index.js", () => {
  it("renders without crashing", () => {
    const rootDiv = document.createElement("div");
    rootDiv.setAttribute("id", "root");
    document.body.appendChild(rootDiv);

    require("../index");

    expect(ReactDOM.createRoot).toHaveBeenCalledWith(rootDiv);
  });
});
