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

test("andThen success triple", () => {
  const isX = bnb.matchString("x");
  const isY = bnb.matchString("y");
  const isZ = bnb.matchString("z");
  const isXYZ = isX.andThen(isY).andThen(isZ);
  expect(isXYZ.parse("xyz")).toMatchSnapshot();
});

test("andThen success triple 2", () => {
  const isX = bnb.matchString("x");
  const isY = bnb.matchString("y");
  const isZ = bnb.matchString("z");
  const isXYZ = isX.andThen(isY).flatMap(([x, y]) => {
    return isZ.map((z) => {
      return [x, y, z] as const;
    });
  });
  expect(isXYZ.parse("xyz")).toMatchSnapshot();
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

test("repeat0 success", () => {
  const isA = bnb.matchString("a");
  const isAAA = isA.repeat0();
  expect(isAAA.parse("")).toMatchSnapshot();
  expect(isAAA.parse("a")).toMatchSnapshot();
  expect(isAAA.parse("aa")).toMatchSnapshot();
  expect(isAAA.parse("aaa")).toMatchSnapshot();
  expect(isAAA.parse("aaaa")).toMatchSnapshot();
});

test("repeat0 failure", () => {
  const isA = bnb.matchString("a");
  const isAAA = isA.repeat0();
  expect(isAAA.parse("b")).toMatchSnapshot();
});

test("repeat1 success", () => {
  const isA = bnb.matchString("a");
  const isAAA = isA.repeat1();
  expect(isAAA.parse("a")).toMatchSnapshot();
  expect(isAAA.parse("aa")).toMatchSnapshot();
  expect(isAAA.parse("aaa")).toMatchSnapshot();
  expect(isAAA.parse("aaaa")).toMatchSnapshot();
});

test("repeat1 failure", () => {
  const isA = bnb.matchString("a");
  const isAAA = isA.repeat1();
  expect(isAAA.parse("")).toMatchSnapshot();
  expect(isAAA.parse("b")).toMatchSnapshot();
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
