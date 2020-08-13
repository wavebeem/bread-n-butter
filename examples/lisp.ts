import * as bnb from "../src/bread-n-butter";
import { prettyPrint } from "./util";

type LispSymbol = bnb.ParseNode<"LispSymbol", string>;
type LispNumber = bnb.ParseNode<"LispNumber", number>;
type LispList = bnb.ParseNode<"LispList", LispExpr[]>;
type LispExpr = LispSymbol | LispNumber | LispList;

const lispExpr: bnb.Parser<LispExpr> = bnb.lazy(() => {
  return bnb.choice<LispExpr>(lispSymbol, lispNumber, lispList);
});

const lispSymbol = bnb
  .match(/[a-z_-][a-z0-9_-]*/i)
  .node("LispSymbol")
  .desc(["symbol"]);

const lispNumber = bnb
  .match(/[0-9]+/)
  .map(Number)
  .node("LispNumber")
  .desc(["number"]);

const lispWS = bnb.match(/\s*/);

const lispList = lispExpr
  .trim(lispWS)
  .many0()
  .wrap(bnb.text("("), bnb.text(")"))
  .node("LispList");

const lispFile = lispExpr.trim(lispWS).many0().node("LispFile");

const text = `\
(list 1 2 (cons 1 (list)))
(print 5 golden rings)
`;

const ast = lispFile.parse(text);
prettyPrint(ast);
