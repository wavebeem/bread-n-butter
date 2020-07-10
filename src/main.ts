import * as bnb from "./bread-n-butter";

const a = bnb.str("a");
const b = bnb.str("b");
const ab = a.and(b);
// const aOrB = a.or(b);
const abOrA = ab.or(a);
// console.log(aOrB.parse("b"));
debugger;
console.log(abOrA.parse("aa"));
// console.log(abOrA.parse("aa"));
// console.log(abOrA.parse(""));
// console.log(abOrA.parse("aba"));
