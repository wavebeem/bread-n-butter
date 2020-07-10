import * as util from "util";
import * as bnb from "../src/bread-n-butter";

type LispSymbol = bnb.ParseNode<"LispSymbol", string>;
type LispNumber = bnb.ParseNode<"LispNumber", number>;
type LispList = bnb.ParseNode<"LispList", readonly LispExpr[]>;
type LispFile = bnb.ParseNode<"LispFile", readonly LispExpr[]>;
type LispExpr = LispSymbol | LispNumber | LispList;

type LispLanguage = {
  Expr: LispExpr;
  Symbol: LispSymbol;
  Number: LispNumber;
  WS: string;
  List: LispList;
  File: LispFile;
};

const Lisp = bnb.language<LispLanguage>({
  Expr(lang) {
    return lang.Symbol.or(lang.Number).or(lang.List);
  },

  Symbol() {
    return bnb
      .match(/[a-z_-][a-z0-9_-]*/i)
      .node("LispSymbol")
      .desc("symbol");
  },

  Number() {
    return bnb
      .match(/[0-9]+/)
      .map(Number)
      .node("LispNumber")
      .desc("number");
  },

  WS() {
    return bnb.match(/\s*/);
  },

  List(lang) {
    return lang.Expr.trim(lang.WS)
      .many0()
      .wrap(bnb.str("("), bnb.str(")"))
      .node("LispList");
  },

  File(lang) {
    return lang.Expr.trim(lang.WS).many0().node("LispFile");
  },
});

const text = `\
(list 1 2 (cons 1 (list)))
(print 5 golden rings)
`;

function prettyPrint(x: any): void {
  console.log(util.inspect(x, { depth: null, colors: true }));
}

const ast = Lisp.File.parse(text);
prettyPrint(ast);
