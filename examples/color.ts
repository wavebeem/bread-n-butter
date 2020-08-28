import * as bnb from "../src/bread-n-butter";
import { prettyPrint } from "./util";

class Color {
  constructor(
    public r: number,
    public g: number,
    public b: number,
    public a: number = 1.0
  ) {}

  toString() {
    return (
      `r:${this.r} g:${this.g} b:${this.b}` + (this.a ? ` alpha:${this.a}` : "")
    );
  }
}

// primitives
const sharp = bnb.text("#");

const hexval = bnb.match(/[0-9a-fA-F]/);

const num = bnb.match(/[0-9.]+/);

// parsers
const hexColor1 = sharp
  .next(bnb.all(hexval, hexval, hexval))
  .map(
    ([r, g, b]) =>
      new Color(parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16))
  );
const hexColor2 = sharp
  .next(
    bnb.all(
      bnb.all(hexval, hexval).map((strs) => strs.join("")),
      bnb.all(hexval, hexval).map((strs) => strs.join("")),
      bnb.all(hexval, hexval).map((strs) => strs.join(""))
    )
  )
  .map(
    ([r, g, b]) => new Color(parseInt(r, 16), parseInt(g, 16), parseInt(b, 16))
  );

const rgbColor = bnb
  .text("rgb(")
  .next(num.sepBy1(bnb.text(",")))
  .skip(bnb.text(")"))
  .map(([r, g, b]) => new Color(parseInt(r), parseInt(g), parseInt(b)));

const rgbaColor = bnb
  .text("rgba(")
  .next(num.sepBy1(bnb.text(",")))
  .skip(bnb.text(")"))
  .map(
    ([r, g, b, a]) =>
      new Color(parseInt(r), parseInt(g), parseInt(b), parseFloat(a))
  );

// Note that hexColor2 must be placed before hexColor1
const parsers = bnb.choice(hexColor2, hexColor1, rgbColor, rgbaColor);

const examples = [
  "#fff",
  "#000000",
  "#238945",
  "rgb(47,0,0)",
  "rgba(0,0,0,0.5)",
];

const astList = examples.map((v) => parsers.tryParse(v));

prettyPrint(astList);

astList.map((x) => prettyPrint(x.toString()));
