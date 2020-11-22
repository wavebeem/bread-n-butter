import SimpleMath, {
  MathOperator1,
  MathOperator2,
  MathExpr,
} from "../examples/math";
import { snapTest } from "./util";

test("2 part expression", () => {
  const text = `2 * 3 + 4`;
  const expr = SimpleMath.tryParse(text);
  snapTest(SimpleMath, text);
  expect(expr.calculate()).toEqual(10);
  expect(expr.toString()).toEqual(`((2 * 3) + 4)`);
});

test("2 part expression with parentheses", () => {
  const text = `2 * (3 + 4)`;
  const expr = SimpleMath.tryParse(text);
  snapTest(SimpleMath, text);
  expect(expr.calculate()).toEqual(14);
  expect(expr.toString()).toEqual(`(2 * (3 + 4))`);
});

test("unary and binary minus", () => {
  const text = `-1 - -1`;
  const expr = SimpleMath.tryParse(text);
  snapTest(SimpleMath, text);
  expect(expr.calculate()).toEqual(0);
  expect(expr.toString()).toEqual(`((- 1) - (- 1))`);
});

test("large expression", () => {
  const text = `-2 + 3 * 4 - 5 / 7 ** 6`;
  const expr = SimpleMath.tryParse(text);
  snapTest(SimpleMath, text);
  expect(expr.calculate()).toEqual(9.999957500701239);
});

test("MathOperator1", () => {
  const expr: MathExpr = {
    calculate() {
      return 0;
    },
  };
  expect(() => new MathOperator1("bad", expr).calculate()).toThrow();
});

test("MathOperator2", () => {
  const expr: MathExpr = {
    calculate() {
      return 0;
    },
  };
  expect(() => new MathOperator2("bad", expr, expr).calculate()).toThrow();
});
