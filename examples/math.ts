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

// Each precedence level builds upon the previous one. Meaning that the previous
// parser is used in the next parser, over and over. An astute reader could
// shorten this code using `reduce`, but it becomes much harder to read when you
// do that, in my opinion.

// Highest level
const mathNum = bnb
  .match(/[0-9]+([.][0-9]+)?/)
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
const mathPow: bnb.Parser<MathExpr> = mathUnaryPrefix.chain((expr) => {
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

// Next level
const mathMulDiv: bnb.Parser<MathExpr> = mathPow.chain((expr) => {
  return operator("*")
    .or(operator("/"))
    .and(mathPow)
    .many0()
    .map((pairs) => {
      return pairs.reduce((accum, [operator, expr]) => {
        return new MathOperator2(operator, accum, expr);
      }, expr);
    });
});

// Next level
const mathAddSub: bnb.Parser<MathExpr> = mathMulDiv.chain((expr) => {
  return operator("+")
    .or(operator("-"))
    .and(mathMulDiv)
    .many0()
    .map((pairs) => {
      return pairs.reduce((accum, [operator, expr]) => {
        return new MathOperator2(operator, accum, expr);
      }, expr);
    });
});

// Lowest level
const mathExpr = mathAddSub;

const text = "-2 + 3 * 4 - 5 / 7 ** 6";

const ast = mathExpr.tryParse(text);
// Show the AST
prettyPrint(ast);
console.log();
// Show the text that was parsed
console.log(text);
console.log();
// Show the math expression with parentheses added
console.log(`= ${ast}`);
console.log();
// Show the result of calculating the math expression
console.log(`= ${ast.evaluate()}`);
