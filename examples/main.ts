import * as bnb from "../src/bread-n-butter";

const a = bnb.str("a");
const b = bnb.str("b");
const ab = a.and(b);
const aOrB = a.or(b);
const abOrA = ab.or(a);
const balance = bnb
  .str("(")
  .or(bnb.str("["))
  .chain((value) => {
    if (value === "(") {
      return bnb.str(")");
    } else {
      return bnb.str("]");
    }
  });
const alpha = bnb.match(/[a-z]+/i);
const justX = bnb.ok("X");
// TODO: Test parser.thru(fn)
// TODO: Test bnb.location
console.log(alpha.parse("abcABCxyz"));
console.log(alpha.parse("a1"));
console.log(aOrB.parse("a"));
console.log(aOrB.parse("b"));
console.log(aOrB.parse("ab"));
console.log(aOrB.parse(""));
console.log(abOrA.parse("ab"));
console.log(abOrA.parse("aa"));
console.log(abOrA.parse("a"));
console.log(abOrA.parse(""));
console.log(abOrA.parse("aba"));
console.log(balance.parse("()"));
console.log(balance.parse("[]"));
console.log(balance.parse("[)"));
console.log(balance.parse("["));
console.log(justX.parse(""));
