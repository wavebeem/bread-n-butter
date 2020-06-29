import * as bnb from "../src/bread-n-butter";

test("test a test", () => {
  const isX = bnb.matchString("x");
  expect(isX.parse("x")).toMatchSnapshot();
});

test("andThen success", () => {
  const isX = bnb.matchString("x");
  const isY = bnb.matchString("y");
  const isXY = isX.andThen(isY);
  expect(isXY.parse("xy")).toMatchSnapshot();
});

test("andThen failure 1", () => {
  const isX = bnb.matchString("x");
  const isY = bnb.matchString("y");
  const isXY = isX.andThen(isY);
  expect(isXY.parse("x")).toMatchSnapshot();
});

test("andThen failure 2", () => {
  const isX = bnb.matchString("x");
  const isY = bnb.matchString("y");
  const isXY = isX.andThen(isY);
  expect(isXY.parse("y")).toMatchSnapshot();
});

test("andThen failure 3", () => {
  const isX = bnb.matchString("x");
  const isY = bnb.matchString("y");
  const isXY = isX.andThen(isY);
  expect(isXY.parse("yx")).toMatchSnapshot();
});

test("andThen failure 4", () => {
  const isX = bnb.matchString("x");
  const isY = bnb.matchString("y");
  const isXY = isX.andThen(isY);
  expect(isXY.parse("")).toMatchSnapshot();
});

test("matchEOF success", () => {
  const matchEOF = bnb.matchEOF;
  expect(matchEOF.parse("")).toMatchSnapshot();
});

test("matchEOF failure", () => {
  const matchEOF = bnb.matchEOF;
  expect(matchEOF.parse("x")).toMatchSnapshot();
});

test("matchRegExp success", () => {
  const matchNumber = bnb.matchRegExp(/\d+/);
  expect(matchNumber.parse("12")).toMatchSnapshot();
});

test("matchRegExp failure", () => {
  const matchNumber = bnb.matchRegExp(/\d+/);
  expect(matchNumber.parse("abc")).toMatchSnapshot();
});
