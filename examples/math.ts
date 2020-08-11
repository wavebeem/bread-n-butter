import * as bnb from "../src/bread-n-butter";
import { prettyPrint } from "./util";

// TODO: Ensure that `**` associates right

// ---[ Abstract Syntax Tree and Evaluator Combined ]---

class MathExpr {
  evaluate(): number {
    throw new Error("not implemented");
  }
}

class MathOperator2 extends MathExpr {
  constructor(
    public operator: string,
    public left: MathExpr,
    public right: MathExpr
  ) {
    super();
  }

  evaluate(): number {
    const left = this.left.evaluate();
    const right = this.right.evaluate();
    switch (this.operator) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        return left / right;
      case "**":
        return left ** right;
      default:
        throw new Error(`unexpected operator ${this.operator}`);
    }
  }

  toString() {
    return `(${this.left} ${this.operator} ${this.right})`;
  }
}

class MathOperator1 extends MathExpr {
  constructor(public operator: string, public expression: MathExpr) {
    super();
  }

  evaluate(): number {
    const expression = this.expression.evaluate();
    switch (this.operator) {
      case "-":
        return -expression;
      default:
        throw new Error(`unexpected operator ${this.operator}`);
    }
  }

  toString() {
    return `(${this.operator} ${this.expression})`;
  }
}

class MathNumber extends MathExpr {
  constructor(public value: number) {
    super();
  }

  evaluate(): number {
    return this.value;
  }

  toString() {
    return `${this.value}`;
  }
}

// ---[ Parser ]---

function token<A>(parser: bnb.Parser<A>) {
  return parser.trim(mathWS);
}

function operator<S extends string>(string: S) {
  return bnb.text(string).thru(token);
}

const mathWS = bnb.match(/\s*/);

// Lowest level
const mathNum = bnb
  .match(/-?[0-9]+([.][0-9]+)?/)
  .map((str) => new MathNumber(Number(str)));

// Next level
const mathBasic: bnb.Parser<MathExpr> = bnb.lazy(() => {
  return mathExpr
    .thru(token)
    .wrap(bnb.text("("), bnb.text(")"))
    .or(mathNum)
    .trim(mathWS);
});

// Next level
const mathUnaryPrefix: bnb.Parser<MathExpr> = bnb.lazy(() => {
  return operator("-")
    .and(mathUnaryPrefix)
    .map(([operator, expr]) => new MathOperator1(operator, expr))
    .or(mathBasic);
});

// Next level
const mathAddSub: bnb.Parser<MathExpr> = mathUnaryPrefix.chain((expr) => {
  return operator("+")
    .or(operator("-"))
    .and(mathUnaryPrefix)
    .many0()
    .map((pairs) => {
      return pairs.reduce((accum, [operator, expr]) => {
        return new MathOperator2(operator, accum, expr);
      }, expr);
    });
});

// Next level
const mathMulDiv: bnb.Parser<MathExpr> = mathAddSub.chain((expr) => {
  return operator("*")
    .or(operator("/"))
    .and(mathAddSub)
    .many0()
    .map((pairs) => {
      return pairs.reduce((accum, [operator, expr]) => {
        return new MathOperator2(operator, accum, expr);
      }, expr);
    });
});

// Next level
const mathPow: bnb.Parser<MathExpr> = mathMulDiv.chain((expr) => {
  // Exponentiaton is right associative, meaning that `2 ** 3 ** 4` is
  // equivalent to `2 ** (3 ** 4)` rather than `(2 ** 3) ** 4`, so we can use
  // recursion to process side by side exponentiation into a nested structure.
  return operator("**")
    .and(mathPow)
    .map(([operator, nextExpr]) => {
      return new MathOperator2(operator, expr, nextExpr);
    })
    .or(bnb.ok(expr));
});

// Highest level
const mathExpr = mathPow;

const text = "2 + 3 * 4 - 5 / 7 ** 6";
// const text = "-2+3*4-5/0.25**6";
// -20470
// const text = "3 ** 3 ** 3 ** 3";
// const text = "1 * 2 * 3 * 4";
// const text = "1 ** 2 ** 3 ** 4";
// const text = "3 ** 3";
// const text = "3";

const ast = mathExpr.tryParse(text);
prettyPrint(ast);
console.log();
console.log(text);
console.log();
console.log(`= ${ast}`);
console.log();
console.log(`= ${ast.evaluate()}`);
