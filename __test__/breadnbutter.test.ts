import * as bnb from "../src/breadnbutter";

test("test a test", () => {
  const isX = bnb.matchString("x");
  expect(bnb.parse(isX, "x")).toMatchSnapshot();
});

test("andThen success", () => {
  const isX = bnb.matchString("x");
  const isY = bnb.matchString("y");
  const isXY = bnb.andThen(isX, isY);
  expect(bnb.parse(isXY, "xy")).toMatchSnapshot();
});

test("andThen failure 1", () => {
  const isX = bnb.matchString("x");
  const isY = bnb.matchString("y");
  const isXY = bnb.andThen(isX, isY);
  expect(bnb.parse(isXY, "x")).toMatchSnapshot();
});

test("andThen failure 2", () => {
  const isX = bnb.matchString("x");
  const isY = bnb.matchString("y");
  const isXY = bnb.andThen(isX, isY);
  expect(bnb.parse(isXY, "y")).toMatchSnapshot();
});

test("andThen failure 3", () => {
  const isX = bnb.matchString("x");
  const isY = bnb.matchString("y");
  const isXY = bnb.andThen(isX, isY);
  expect(bnb.parse(isXY, "yx")).toMatchSnapshot();
});

test("andThen failure 4", () => {
  const isX = bnb.matchString("x");
  const isY = bnb.matchString("y");
  const isXY = bnb.andThen(isX, isY);
  expect(bnb.parse(isXY, "")).toMatchSnapshot();
});

test("matchEOF success", () => {
  const matchEOF = bnb.matchEOF;
  expect(bnb.parse(matchEOF, "")).toMatchSnapshot();
});

test("matchEOF failure", () => {
  const matchEOF = bnb.matchEOF;
  expect(bnb.parse(matchEOF, "x")).toMatchSnapshot();
});

test("matchRegExp success", () => {
  const matchNumber = bnb.matchRegExp(/\d+/);
  expect(bnb.parse(matchNumber, "12")).toMatchSnapshot();
});

test("matchRegExp failure", () => {
  const matchNumber = bnb.matchRegExp(/\d+/);
  expect(bnb.parse(matchNumber, "abc")).toMatchSnapshot();
});
