import * as bnb from "../src/bread-n-butter";
import { snapTest } from "./util";

test("test a test", () => {
  const x = bnb.text("x");
  snapTest(x, "x");
});

test("and", () => {
  const x = bnb.text("x");
  const y = bnb.text("y");
  const xy = x.and(y);
  snapTest(xy, "xy");
});

test("and triple", () => {
  const x = bnb.text("x");
  const y = bnb.text("y");
  const z = bnb.text("z");
  const xyz = x.and(y).and(z);
  snapTest(xyz, "xyz");
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
  snapTest(xyz, "xyz");
});

test("and failure", () => {
  const x = bnb.text("x");
  const y = bnb.text("y");
  const xy = x.and(y);
  snapTest(xy, "x");
  snapTest(xy, "y");
  snapTest(xy, "yx");
  snapTest(xy, "");
});

test("sepBy 0+", () => {
  const a = bnb.text("a");
  const sep = bnb.text(",");
  const list = a.sepBy(sep);
  snapTest(list, "");
  snapTest(list, "a");
  snapTest(list, "a,a");
  snapTest(list, "a,a,a");
  snapTest(list, "a,a,b");
  snapTest(list, "b");
});

test("sepBy 1+", () => {
  const a = bnb.text("a");
  const sep = bnb.text(",");
  const list = a.sepBy(sep, 1);
  snapTest(list, "");
  snapTest(list, "a");
  snapTest(list, "a,a");
  snapTest(list, "a,a,a");
  snapTest(list, "a,a,b");
  snapTest(list, "b");
});

test("sepBy 2-3", () => {
  const a = bnb.text("a");
  const sep = bnb.text(",");
  const list = a.sepBy(sep, 2, 3);
  snapTest(list, "");
  snapTest(list, "a");
  snapTest(list, "a,a");
  snapTest(list, "a,a,a");
  snapTest(list, "a,a,a,a");
  snapTest(list, "a,a,b");
  snapTest(list, "b");
});

test("sepBy 1-1", () => {
  const a = bnb.text("a");
  const sep = bnb.text(",");
  const list = a.sepBy(sep, 1, 1);
  snapTest(list, "");
  snapTest(list, "a");
  snapTest(list, "a,a");
  snapTest(list, "b");
});

test("repeat with bad range", () => {
  const a = bnb.text("a");
  const sep = bnb.text(" ");
  expect(() => a.sepBy(sep, 5, 3)).toThrow(/bad range/i);
  expect(() => a.sepBy(sep, -2, 0)).toThrow(/bad range/i);
  expect(() => a.sepBy(sep, 1.2, 3.4)).toThrow(/bad range/i);
});

test("repeat 0+", () => {
  const a = bnb.text("a");
  const aaa = a.repeat();
  snapTest(aaa, "");
  snapTest(aaa, "a");
  snapTest(aaa, "aa");
  snapTest(aaa, "aaa");
  snapTest(aaa, "aaaa");
  snapTest(aaa, "b");
});

test("repeat 1+", () => {
  const a = bnb.text("a");
  const aaa = a.repeat(1);
  snapTest(aaa, "a");
  snapTest(aaa, "aa");
  snapTest(aaa, "aaa");
  snapTest(aaa, "aaaa");
  snapTest(aaa, "");
  snapTest(aaa, "b");
});

test("repeat 2-3", () => {
  const a = bnb.text("a");
  const aaa = a.repeat(2, 3);
  snapTest(aaa, "a");
  snapTest(aaa, "aa");
  snapTest(aaa, "aaa");
  snapTest(aaa, "aaaa");
  snapTest(aaa, "");
  snapTest(aaa, "b");
});

test("repeat with bad range", () => {
  const a = bnb.text("a");
  expect(() => a.repeat(5, 3)).toThrow(/bad range/i);
  expect(() => a.repeat(-2, 0)).toThrow(/bad range/i);
  expect(() => a.repeat(1.2, 3.4)).toThrow(/bad range/i);
});

test("repeat infinite loop detection", () => {
  const p = bnb.text("");
  const p0 = p.repeat(0);
  const p1 = p.repeat(1);
  expect(() => p0.parse("abc")).toThrow(/infinite loop/i);
  expect(() => p1.parse("abc")).toThrow(/infinite loop/i);
});

test("all", () => {
  const abc = bnb.all(bnb.text("a"), bnb.text("b"), bnb.text("c"));
  snapTest(abc, "a");
  snapTest(abc, "aa");
  snapTest(abc, "abc");
  snapTest(abc, "aaaa");
  snapTest(abc, "abb");
  snapTest(abc, "");
  snapTest(abc, "b");
});

test("next", () => {
  const ab = bnb.text("a").next(bnb.text("b"));
  snapTest(ab, "ab");
  snapTest(ab, "a");
  snapTest(ab, "b");
  snapTest(ab, "");
  snapTest(ab, "aba");
});

test("skip", () => {
  const ab = bnb.text("a").skip(bnb.text("b"));
  snapTest(ab, "ab");
  snapTest(ab, "a");
  snapTest(ab, "b");
  snapTest(ab, "");
  snapTest(ab, "aba");
});

test("choice", () => {
  const abc123 = bnb.choice(
    bnb.text("a"),
    bnb.text("b"),
    bnb.text("c"),
    bnb.text("1").map(() => 1 as const),
    bnb.text("2").map(() => 2 as const),
    bnb.text("3").map(() => 3 as const)
  );
  snapTest(abc123, "a");
  snapTest(abc123, "b");
  snapTest(abc123, "c");
  snapTest(abc123, "1");
  snapTest(abc123, "2");
  snapTest(abc123, "3");
  snapTest(abc123, "aaaa");
  snapTest(abc123, "abb");
  snapTest(abc123, "");
});

test("or", () => {
  const a = bnb.text("a");
  const b = bnb.text("b");
  const ab = a.or(b);
  snapTest(ab, "a");
  snapTest(ab, "b");
  snapTest(ab, "c");
  snapTest(ab, "ab");
  snapTest(ab, "");
});

test("matchEOF", () => {
  const eof = bnb.eof;
  snapTest(eof, "");
  snapTest(eof, "x");
});

test("match", () => {
  const num = bnb.match(/\d+/);
  snapTest(num, "12");
  snapTest(num, "abc");
  expect(() => bnb.match(/./g)).toThrow();
  expect(() => bnb.match(/./y)).toThrow();
});

test("lisp lists", () => {
  const symbol = bnb.match(/[a-zA-Z_-]+/);
  const lp = bnb.text("(");
  const rp = bnb.text(")");
  const ws = bnb.match(/\s+/);
  const list = lp.next(symbol.sepBy(ws, 0)).skip(rp);
  snapTest(list, "(a b c)");
});

test("node", () => {
  const identifier = bnb
    .match(/[a-z]+/i)
    .node("Identifier")
    .desc(["identifier"]);
  const multiline = bnb.text("A\nB\nC").node("ABC");
  snapTest(identifier, "abc");
  snapTest(multiline, "A\nB\nC");
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
  snapTest(num, "9");
  snapTest(num, "x");
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
  snapTest(p, "<x>");
  snapTest(p, "<x");
  snapTest(p, "<");
  snapTest(p, "x>");
});

test("trim", () => {
  const p = bnb.text("x").trim(bnb.text("~"));
  snapTest(p, "~x~");
  snapTest(p, "~x");
  snapTest(p, "~");
  snapTest(p, "x>");
});

test("fail", () => {
  const p = bnb.fail(["apple", "banana"]);
  const q = bnb.text("other").or(p);
  snapTest(p, "bad");
  snapTest(q, "bad");
});

test("lazy", () => {
  type Expr = Item | List;
  type Item = "x";
  type List = Expr[];
  const expr: bnb.Parser<Expr> = bnb.lazy(() => {
    return item.or(list);
  });
  const item = bnb.text("x");
  const list = expr.sepBy(bnb.text(" "), 0).wrap(bnb.text("("), bnb.text(")"));
  snapTest(expr, "(x x (x () (x) ((x)) x) x)");
});

test("text", () => {
  const items = ["", "abc", "🙂", "1\n2\n3"];
  for (const str of items) {
    expect(bnb.text(str).tryParse(str)).toBe(str);
  }
});

test("emoji length", () => {
  const smiles = "🙂🙂🙂";
  const result = bnb.text(smiles).node("Emoji");
  snapTest(result, smiles);
});
