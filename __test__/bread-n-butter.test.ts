import * as bnb from "../src/bread-n-butter";

test("test a test", () => {
  const isX = bnb.text("x");
  expect(isX.parse("x")).toMatchSnapshot();
});

test("and", () => {
  const isX = bnb.text("x");
  const isY = bnb.text("y");
  const isXY = isX.and(isY);
  expect(isXY.parse("xy")).toMatchSnapshot();
});

test("and triple", () => {
  const isX = bnb.text("x");
  const isY = bnb.text("y");
  const isZ = bnb.text("z");
  const isXYZ = isX.and(isY).and(isZ);
  expect(isXYZ.parse("xyz")).toMatchSnapshot();
});

test("and success triple 2", () => {
  const isX = bnb.text("x");
  const isY = bnb.text("y");
  const isZ = bnb.text("z");
  const isXYZ = isX.and(isY).chain(([x, y]) => {
    return isZ.map((z) => {
      return [x, y, z] as const;
    });
  });
  expect(isXYZ.parse("xyz")).toMatchSnapshot();
});

test("and failure", () => {
  const isX = bnb.text("x");
  const isY = bnb.text("y");
  const isXY = isX.and(isY);
  expect(isXY.parse("x")).toMatchSnapshot();
  expect(isXY.parse("y")).toMatchSnapshot();
  expect(isXY.parse("yx")).toMatchSnapshot();
  expect(isXY.parse("")).toMatchSnapshot();
});

test("sepBy0", () => {
  const isA = bnb.text("a");
  const isSep = bnb.text(",");
  const isAList = isA.sepBy0(isSep);
  expect(isAList.parse("")).toMatchSnapshot();
  expect(isAList.parse("a")).toMatchSnapshot();
  expect(isAList.parse("a,a")).toMatchSnapshot();
  expect(isAList.parse("a,a,a")).toMatchSnapshot();
  expect(isAList.parse("a,a,b")).toMatchSnapshot();
  expect(isAList.parse("b")).toMatchSnapshot();
});

test("sepBy1", () => {
  const isA = bnb.text("a");
  const isSep = bnb.text(",");
  const isAList = isA.sepBy1(isSep);
  expect(isAList.parse("")).toMatchSnapshot();
  expect(isAList.parse("a")).toMatchSnapshot();
  expect(isAList.parse("a,a")).toMatchSnapshot();
  expect(isAList.parse("a,a,a")).toMatchSnapshot();
  expect(isAList.parse("a,a,b")).toMatchSnapshot();
  expect(isAList.parse("b")).toMatchSnapshot();
});

test("many0", () => {
  const isA = bnb.text("a");
  const isAAA = isA.many0();
  expect(isAAA.parse("")).toMatchSnapshot();
  expect(isAAA.parse("a")).toMatchSnapshot();
  expect(isAAA.parse("aa")).toMatchSnapshot();
  expect(isAAA.parse("aaa")).toMatchSnapshot();
  expect(isAAA.parse("aaaa")).toMatchSnapshot();
  expect(isAAA.parse("b")).toMatchSnapshot();
});

test("many0/many1 infinite loop detection", () => {
  const p = bnb.text("");
  const p0 = p.many0();
  const p1 = p.many1();
  expect(() => p0.parse("abc")).toThrow(/infinite loop/i);
  expect(() => p1.parse("abc")).toThrow(/infinite loop/i);
});

test("all", () => {
  const abc = bnb.all([bnb.text("a"), bnb.text("b"), bnb.text("c")]);
  bnb.all();
  expect(abc.parse("a")).toMatchSnapshot();
  expect(abc.parse("aa")).toMatchSnapshot();
  expect(abc.parse("abc")).toMatchSnapshot();
  expect(abc.parse("aaaa")).toMatchSnapshot();
  expect(abc.parse("abb")).toMatchSnapshot();
  expect(abc.parse("")).toMatchSnapshot();
  expect(abc.parse("b")).toMatchSnapshot();
});

test("many1", () => {
  const isA = bnb.text("a");
  const isAAA = isA.many1();
  expect(isAAA.parse("a")).toMatchSnapshot();
  expect(isAAA.parse("aa")).toMatchSnapshot();
  expect(isAAA.parse("aaa")).toMatchSnapshot();
  expect(isAAA.parse("aaaa")).toMatchSnapshot();
  expect(isAAA.parse("")).toMatchSnapshot();
  expect(isAAA.parse("b")).toMatchSnapshot();
});

test("or", () => {
  const isA = bnb.text("a");
  const isB = bnb.text("b");
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
  expect(() => bnb.match(/./g)).toThrow();
  expect(() => bnb.match(/./y)).toThrow();
});

test("lisp lists", () => {
  const isSymbol = bnb.match(/[a-zA-Z_-]+/);
  const isLP = bnb.text("(");
  const isRP = bnb.text(")");
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
    .desc(["identifier"]);
  const multiline = bnb.text("A\nB\nC").node("ABC");
  expect(identifier.parse("abc")).toMatchSnapshot();
  expect(multiline.parse("A\nB\nC")).toMatchSnapshot();
});

test("tryParse", () => {
  const a = bnb.text("a");
  expect(a.tryParse("a")).toEqual("a");
  expect(() => a.tryParse("b")).toThrow();
});

test("desc", () => {
  const num = bnb
    .match(/[0-9]+/)
    .map(Number)
    .desc(["number"]);
  expect(num.parse("9")).toMatchSnapshot();
  expect(num.parse("x")).toMatchSnapshot();
});

test("thru", () => {
  const n = 4;
  const p = bnb.text("");
  const x = p.thru((parser) => {
    expect(parser).toBe(p);
    return n;
  });
  expect(x).toEqual(n);
});

test("wrap", () => {
  const p = bnb.text("x").wrap(bnb.text("<"), bnb.text(">"));
  expect(p.parse("<x>")).toMatchSnapshot();
  expect(p.parse("<x")).toMatchSnapshot();
  expect(p.parse("<")).toMatchSnapshot();
  expect(p.parse("x>")).toMatchSnapshot();
});

test("trim", () => {
  const p = bnb.text("x").trim(bnb.text("~"));
  expect(p.parse("~x~")).toMatchSnapshot();
  expect(p.parse("~x")).toMatchSnapshot();
  expect(p.parse("~")).toMatchSnapshot();
  expect(p.parse("x>")).toMatchSnapshot();
});

test("fail", () => {
  const p = bnb.fail(["apple", "banana"]);
  const q = bnb.text("other").or(p);
  expect(p.parse("")).toMatchSnapshot();
  expect(q.parse("")).toMatchSnapshot();
});

test("lazy", () => {
  type Expr = Item | List;
  type Item = "x";
  type List = Expr[];
  const expr: bnb.Parser<Expr> = bnb.lazy(() => {
    return item.or(list);
  });
  const item = bnb.text("x");
  const list = expr.sepBy0(bnb.text(" ")).wrap(bnb.text("("), bnb.text(")"));
  expect(expr.parse("(x x (x () (x) ((x)) x) x)")).toMatchSnapshot();
});

test("text", () => {
  const items = ["", "abc", "🙂", "1\n2\n3"];
  for (const str of items) {
    expect(bnb.text(str).tryParse(str)).toBe(str);
  }
});

test("emoji length", () => {
  const result = bnb.text("🙂🙂🙂").node("Emoji").parse("🙂🙂🙂");
  expect(result).toMatchSnapshot();
});
