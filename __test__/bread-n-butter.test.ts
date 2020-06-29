import * as bnb from "../src/bread-n-butter";

test("test a test", () => {
  const isX = bnb.matchString("x");
  expect(isX.parse("x")).toMatchSnapshot();
});

test("andThen", () => {
  const isX = bnb.matchString("x");
  const isY = bnb.matchString("y");
  const isXY = isX.andThen(isY);
  expect(isXY.parse("xy")).toMatchSnapshot();
});

test("andThen triple", () => {
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

test("andThen failure", () => {
  const isX = bnb.matchString("x");
  const isY = bnb.matchString("y");
  const isXY = isX.andThen(isY);
  expect(isXY.parse("x")).toMatchSnapshot();
  expect(isXY.parse("y")).toMatchSnapshot();
  expect(isXY.parse("yx")).toMatchSnapshot();
  expect(isXY.parse("")).toMatchSnapshot();
});

test("separatedBy0", () => {
  const isA = bnb.matchString("a");
  const isSep = bnb.matchString(",");
  const isAList = isA.seperatedBy0(isSep);
  expect(isAList.parse("")).toMatchSnapshot();
  expect(isAList.parse("a")).toMatchSnapshot();
  expect(isAList.parse("a,a")).toMatchSnapshot();
  expect(isAList.parse("a,a,a")).toMatchSnapshot();
  expect(isAList.parse("a,a,b")).toMatchSnapshot();
  expect(isAList.parse("b")).toMatchSnapshot();
});

test("separatedBy1", () => {
  const isA = bnb.matchString("a");
  const isSep = bnb.matchString(",");
  const isAList = isA.seperatedBy1(isSep);
  expect(isAList.parse("")).toMatchSnapshot();
  expect(isAList.parse("a")).toMatchSnapshot();
  expect(isAList.parse("a,a")).toMatchSnapshot();
  expect(isAList.parse("a,a,a")).toMatchSnapshot();
  expect(isAList.parse("a,a,b")).toMatchSnapshot();
  expect(isAList.parse("b")).toMatchSnapshot();
});

test("repeat0", () => {
  const isA = bnb.matchString("a");
  const isAAA = isA.repeat0();
  expect(isAAA.parse("")).toMatchSnapshot();
  expect(isAAA.parse("a")).toMatchSnapshot();
  expect(isAAA.parse("aa")).toMatchSnapshot();
  expect(isAAA.parse("aaa")).toMatchSnapshot();
  expect(isAAA.parse("aaaa")).toMatchSnapshot();
  expect(isAAA.parse("b")).toMatchSnapshot();
});

test("repeat1", () => {
  const isA = bnb.matchString("a");
  const isAAA = isA.repeat1();

  expect(isAAA.parse("a")).toMatchSnapshot();
  expect(isAAA.parse("aa")).toMatchSnapshot();
  expect(isAAA.parse("aaa")).toMatchSnapshot();
  expect(isAAA.parse("aaaa")).toMatchSnapshot();

  expect(isAAA.parse("")).toMatchSnapshot();
  expect(isAAA.parse("b")).toMatchSnapshot();
});

test("or", () => {
  const isA = bnb.matchString("a");
  const isB = bnb.matchString("b");
  const isAorB = isA.or(isB);
  expect(isAorB.parse("a")).toMatchSnapshot();
  expect(isAorB.parse("b")).toMatchSnapshot();
  expect(isAorB.parse("c")).toMatchSnapshot();
  expect(isAorB.parse("ab")).toMatchSnapshot();
  expect(isAorB.parse("")).toMatchSnapshot();
});

test("matchEOF", () => {
  const matchEOF = bnb.matchEOF;

  expect(matchEOF.parse("")).toMatchSnapshot();

  expect(matchEOF.parse("x")).toMatchSnapshot();
});

test("matchRegExp", () => {
  const matchNumber = bnb.matchRegExp(/\d+/);

  expect(matchNumber.parse("12")).toMatchSnapshot();

  expect(matchNumber.parse("abc")).toMatchSnapshot();
});
