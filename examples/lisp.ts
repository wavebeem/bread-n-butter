import * as util from "util";
import * as bnb from "../src/bread-n-butter";

type LispSymbol = bnb.ParseNode<"LispSymbol", string>;
type LispNumber = bnb.ParseNode<"LispNumber", number>;
type LispList = bnb.ParseNode<"LispList", LispExpr[]>;
type LispExpr = LispSymbol | LispNumber | LispList;

const lispExpr: bnb.Parser<LispExpr> = bnb.lazy(() => {
  return lispSymbol.or(lispNumber).or(lispList);
});

const lispSymbol = bnb
  .match(/[a-z_-][a-z0-9_-]*/i)
  .node("LispSymbol")
  .desc("symbol");

const lispNumber = bnb
  .match(/[0-9]+/)
  .map(Number)
  .node("LispNumber")
  .desc("number");

const lispWS = bnb.match(/\s*/);

const lispList = lispExpr
  .trim(lispWS)
  .many0()
  .wrap(bnb.str("("), bnb.str(")"))
  .node("LispList");

const lispFile = lispExpr.trim(lispWS).many0().node("LispFile");

const text = `\
(list 1 2 (cons 1 (list)))
(print 5 golden rings)
`;

function prettyPrint(x: any): void {
  console.log(util.inspect(x, { depth: null, colors: true }));
}

const ast = lispFile.parse(text);
prettyPrint(ast);
