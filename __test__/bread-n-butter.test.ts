import * as bnb from "../src/bread-n-butter";

test("test a test", () => {
  const x = bnb.text("x");
  expect(x.parse("x")).toMatchSnapshot();
});

test("and", () => {
  const x = bnb.text("x");
  const y = bnb.text("y");
  const xy = x.and(y);
  expect(xy.parse("xy")).toMatchSnapshot();
});

test("and triple", () => {
  const x = bnb.text("x");
  const y = bnb.text("y");
  const z = bnb.text("z");
  const xyz = x.and(y).and(z);
  expect(xyz.parse("xyz")).toMatchSnapshot();
});

test("and success triple 2", () => {
  const x = bnb.text("x");
  const y = bnb.text("y");
  const z = bnb.text("z");
  const xyz = x.and(y).chain(([x, y]) => {
    return z.map((z) => {
      return [x, y, z] as const;
    });
  });
  expect(xyz.parse("xyz")).toMatchSnapshot();
});

test("and failure", () => {
  const x = bnb.text("x");
  const y = bnb.text("y");
  const xy = x.and(y);
  expect(xy.parse("x")).toMatchSnapshot();
  expect(xy.parse("y")).toMatchSnapshot();
  expect(xy.parse("yx")).toMatchSnapshot();
  expect(xy.parse("")).toMatchSnapshot();
});

test("sepBy0", () => {
  const a = bnb.text("a");
  const sep = bnb.text(",");
  const list = a.sepBy0(sep);
  expect(list.parse("")).toMatchSnapshot();
  expect(list.parse("a")).toMatchSnapshot();
  expect(list.parse("a,a")).toMatchSnapshot();
  expect(list.parse("a,a,a")).toMatchSnapshot();
  expect(list.parse("a,a,b")).toMatchSnapshot();
  expect(list.parse("b")).toMatchSnapshot();
});

test("sepBy1", () => {
  const a = bnb.text("a");
  const sep = bnb.text(",");
  const list = a.sepBy1(sep);
  expect(list.parse("")).toMatchSnapshot();
  expect(list.parse("a")).toMatchSnapshot();
  expect(list.parse("a,a")).toMatchSnapshot();
  expect(list.parse("a,a,a")).toMatchSnapshot();
  expect(list.parse("a,a,b")).toMatchSnapshot();
  expect(list.parse("b")).toMatchSnapshot();
});

test("many0", () => {
  const a = bnb.text("a");
  const aaa = a.many0();
  expect(aaa.parse("")).toMatchSnapshot();
  expect(aaa.parse("a")).toMatchSnapshot();
  expect(aaa.parse("aa")).toMatchSnapshot();
  expect(aaa.parse("aaa")).toMatchSnapshot();
  expect(aaa.parse("aaaa")).toMatchSnapshot();
  expect(aaa.parse("b")).toMatchSnapshot();
});

test("many0/many1 infinite loop detection", () => {
  const p = bnb.text("");
  const p0 = p.many0();
  const p1 = p.many1();
  expect(() => p0.parse("abc")).toThrow(/infinite loop/i);
  expect(() => p1.parse("abc")).toThrow(/infinite loop/i);
});

test("all", () => {
  const abc = bnb.all(bnb.text("a"), bnb.text("b"), bnb.text("c"));
  expect(abc.parse("a")).toMatchSnapshot();
  expect(abc.parse("aa")).toMatchSnapshot();
  expect(abc.parse("abc")).toMatchSnapshot();
  expect(abc.parse("aaaa")).toMatchSnapshot();
  expect(abc.parse("abb")).toMatchSnapshot();
  expect(abc.parse("")).toMatchSnapshot();
  expect(abc.parse("b")).toMatchSnapshot();
});

test("next", () => {
  const ab = bnb.text("a").next(bnb.text("b"));
  expect(ab.parse("ab")).toMatchSnapshot();
  expect(ab.parse("a")).toMatchSnapshot();
  expect(ab.parse("b")).toMatchSnapshot();
  expect(ab.parse("")).toMatchSnapshot();
  expect(ab.parse("aba")).toMatchSnapshot();
});

test("skip", () => {
  const ab = bnb.text("a").skip(bnb.text("b"));
  expect(ab.parse("ab")).toMatchSnapshot();
  expect(ab.parse("a")).toMatchSnapshot();
  expect(ab.parse("b")).toMatchSnapshot();
  expect(ab.parse("")).toMatchSnapshot();
  expect(ab.parse("aba")).toMatchSnapshot();
});

test("choice", () => {
  const abc = bnb.choice(bnb.text("a"), bnb.text("b"), bnb.text("c"));
  expect(abc.parse("a")).toMatchSnapshot();
  expect(abc.parse("b")).toMatchSnapshot();
  expect(abc.parse("c")).toMatchSnapshot();
  expect(abc.parse("aaaa")).toMatchSnapshot();
  expect(abc.parse("abb")).toMatchSnapshot();
  expect(abc.parse("")).toMatchSnapshot();
});

test("many1", () => {
  const a = bnb.text("a");
  const aaa = a.many1();
  expect(aaa.parse("a")).toMatchSnapshot();
  expect(aaa.parse("aa")).toMatchSnapshot();
  expect(aaa.parse("aaa")).toMatchSnapshot();
  expect(aaa.parse("aaaa")).toMatchSnapshot();
  expect(aaa.parse("")).toMatchSnapshot();
  expect(aaa.parse("b")).toMatchSnapshot();
});

test("or", () => {
  const a = bnb.text("a");
  const b = bnb.text("b");
  const ab = a.or(b);
  expect(ab.parse("a")).toMatchSnapshot();
  expect(ab.parse("b")).toMatchSnapshot();
  expect(ab.parse("c")).toMatchSnapshot();
  expect(ab.parse("ab")).toMatchSnapshot();
  expect(ab.parse("")).toMatchSnapshot();
});

test("matchEOF", () => {
  const eof = bnb.eof;
  expect(eof.parse("")).toMatchSnapshot();
  expect(eof.parse("x")).toMatchSnapshot();
});

test("match", () => {
  const num = bnb.match(/\d+/);
  expect(num.parse("12")).toMatchSnapshot();
  expect(num.parse("abc")).toMatchSnapshot();
  expect(() => bnb.match(/./g)).toThrow();
  expect(() => bnb.match(/./y)).toThrow();
});

test("lisp lists", () => {
  const symbol = bnb.match(/[a-zA-Z_-]+/);
  const lp = bnb.text("(");
  const rp = bnb.text(")");
  const ws = bnb.match(/\s+/);
  const list = lp.next(symbol.sepBy0(ws)).skip(rp);
  expect(list.parse("(a b c)")).toMatchSnapshot();
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
