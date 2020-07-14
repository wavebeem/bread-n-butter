import * as bnb from "../src/bread-n-butter";

test("test a test", () => {
  const isX = bnb.str("x");
  expect(isX.parse("x")).toMatchSnapshot();
});

test("and", () => {
  const isX = bnb.str("x");
  const isY = bnb.str("y");
  const isXY = isX.and(isY);
  expect(isXY.parse("xy")).toMatchSnapshot();
});

test("and triple", () => {
  const isX = bnb.str("x");
  const isY = bnb.str("y");
  const isZ = bnb.str("z");
  const isXYZ = isX.and(isY).and(isZ);
  expect(isXYZ.parse("xyz")).toMatchSnapshot();
});

test("and success triple 2", () => {
  const isX = bnb.str("x");
  const isY = bnb.str("y");
  const isZ = bnb.str("z");
  const isXYZ = isX.and(isY).chain(([x, y]) => {
    return isZ.map((z) => {
      return [x, y, z] as const;
    });
  });
  expect(isXYZ.parse("xyz")).toMatchSnapshot();
});

test("and failure", () => {
  const isX = bnb.str("x");
  const isY = bnb.str("y");
  const isXY = isX.and(isY);
  expect(isXY.parse("x")).toMatchSnapshot();
  expect(isXY.parse("y")).toMatchSnapshot();
  expect(isXY.parse("yx")).toMatchSnapshot();
  expect(isXY.parse("")).toMatchSnapshot();
});

test("sepBy0", () => {
  const isA = bnb.str("a");
  const isSep = bnb.str(",");
  const isAList = isA.sepBy0(isSep);
  expect(isAList.parse("")).toMatchSnapshot();
  expect(isAList.parse("a")).toMatchSnapshot();
  expect(isAList.parse("a,a")).toMatchSnapshot();
  expect(isAList.parse("a,a,a")).toMatchSnapshot();
  expect(isAList.parse("a,a,b")).toMatchSnapshot();
  expect(isAList.parse("b")).toMatchSnapshot();
});

test("sepBy1", () => {
  const isA = bnb.str("a");
  const isSep = bnb.str(",");
  const isAList = isA.sepBy1(isSep);
  expect(isAList.parse("")).toMatchSnapshot();
  expect(isAList.parse("a")).toMatchSnapshot();
  expect(isAList.parse("a,a")).toMatchSnapshot();
  expect(isAList.parse("a,a,a")).toMatchSnapshot();
  expect(isAList.parse("a,a,b")).toMatchSnapshot();
  expect(isAList.parse("b")).toMatchSnapshot();
});

test("many0", () => {
  const isA = bnb.str("a");
  const isAAA = isA.many0();
  expect(isAAA.parse("")).toMatchSnapshot();
  expect(isAAA.parse("a")).toMatchSnapshot();
  expect(isAAA.parse("aa")).toMatchSnapshot();
  expect(isAAA.parse("aaa")).toMatchSnapshot();
  expect(isAAA.parse("aaaa")).toMatchSnapshot();
  expect(isAAA.parse("b")).toMatchSnapshot();
});

test("many1", () => {
  const isA = bnb.str("a");
  const isAAA = isA.many1();
  expect(isAAA.parse("a")).toMatchSnapshot();
  expect(isAAA.parse("aa")).toMatchSnapshot();
  expect(isAAA.parse("aaa")).toMatchSnapshot();
  expect(isAAA.parse("aaaa")).toMatchSnapshot();
  expect(isAAA.parse("")).toMatchSnapshot();
  expect(isAAA.parse("b")).toMatchSnapshot();
});

test("or", () => {
  const isA = bnb.str("a");
  const isB = bnb.str("b");
  const isAorB = isA.or(isB);
  expect(isAorB.parse("a")).toMatchSnapshot();
  expect(isAorB.parse("b")).toMatchSnapshot();
  expect(isAorB.parse("c")).toMatchSnapshot();
  expect(isAorB.parse("ab")).toMatchSnapshot();
  expect(isAorB.parse("")).toMatchSnapshot();
});

test("matchEOF", () => {
  const isEOF = bnb.eof;
  expect(isEOF.parse("")).toMatchSnapshot();
  expect(isEOF.parse("x")).toMatchSnapshot();
});

test("match", () => {
  const isNumber = bnb.match(/\d+/);
  expect(isNumber.parse("12")).toMatchSnapshot();
  expect(isNumber.parse("abc")).toMatchSnapshot();
});

test("lisp lists", () => {
  const isSymbol = bnb.match(/[a-zA-Z_-]+/);
  const isLP = bnb.str("(");
  const isRP = bnb.str(")");
  const isWS = bnb.match(/\s+/);
  const isList = isLP.chain(() => {
    return isSymbol.sepBy0(isWS).chain((values) => {
      return isRP.map(() => {
        return values;
      });
    });
  });
  expect(isList.parse("(a b c)")).toMatchSnapshot();
});

test("node", () => {
  const identifier = bnb
    .match(/[a-z]+/i)
    .node("Identifier")
    .desc("identifier");
  expect(identifier.parse("abc")).toMatchSnapshot();
});
