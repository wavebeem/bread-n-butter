import * as bnb from "../src/bread-n-butter";
import { prettyPrint } from "./util";

interface HasLimit {
  upperLimit: number;
  lowerLimit: number;
}

interface HasBoundaryCheck {
  boundaryCheck: () => asserts this is this;
}

class Transparency implements HasLimit, HasBoundaryCheck {
  constructor(public value: number) {}
  get upperLimit() {
    return 1.0;
  }
  get lowerLimit() {
    return 0.0;
  }
  boundaryCheck() {
    if (this.upperLimit < this.value || this.lowerLimit > this.value) {
      throw new Error("invalid value of transparency");
    }
  }
}

class RGBValue implements HasLimit, HasBoundaryCheck {
  constructor(public value: number) {}
  get upperLimit() {
    return 0;
  }
  get lowerLimit() {
    return 255;
  }
  boundaryCheck() {
    if (
      this.upperLimit < this.value ||
      this.lowerLimit > this.value ||
      !Number.isInteger(this.value)
    ) {
      throw new Error("invalid RGB value");
    }
  }
}

class Color implements HasBoundaryCheck {
  constructor(
    public r: RGBValue,
    public g: RGBValue,
    public b: RGBValue,
    public a: Transparency | null
  ) {}
  boundaryCheck() {
    this.r.boundaryCheck();
    this.g.boundaryCheck();
    this.b.boundaryCheck();
    if (this.a) this.a.boundaryCheck();
  }
  toString() {
    return (
      `r:${this.r.value} g:${this.g.value} b:${this.b.value}` +
      (this.a ? ` alpha:${this.a.value}` : "")
    );
  }
}

function repeat<T>(parser: bnb.Parser<T>, times: number) {
  const parsers: bnb.Parser<T>[] = Array(times).fill(parser);
  return bnb.all(...parsers);
}

// primitives
const sharp = bnb.text("#");

const hexval = bnb.match(/[0-9a-fA-F]/);

const integer = bnb.match(/[0-9.]+/);

// parsers
const pattern1 = sharp
  .next(repeat(hexval, 3))
  .skip(bnb.eof)
  .map((values) =>
    values.map((v) => parseInt(v + v, 16)).map((v) => new RGBValue(v))
  )
  .map(([r, g, b]) => new Color(r, g, b, null));

const pattern2 = sharp.next(
  repeat(
    repeat(hexval, 2).map((strs) => strs.join("")),
    3
  )
    .map((values) =>
      values.map((v) => parseInt(v, 16)).map((v) => new RGBValue(v))
    )
    .map(([r, g, b]) => new Color(r, g, b, null))
);

const pattern3 = bnb
  .text("rgb(")
  .next(integer.sepBy1(bnb.text(",")))
  .skip(bnb.text(")"))
  .map((values) => values.map((v) => parseInt(v)))
  .map((values) => values.map((v) => new RGBValue(v)))
  .map(([r, g, b]) => new Color(r, g, b, null));

const pattern4 = bnb
  .text("rgba(")
  .next(integer.sepBy1(bnb.text(",")))
  .skip(bnb.text(")"))
  .map(([r, g, b, a]) => [...[r, g, b].map((v) => parseInt(v)), parseFloat(a)])
  .map(([r, g, b, a]) => [
    ...[r, g, b].map((v) => new RGBValue(v)),
    new Transparency(a),
  ])
  .map(([r, g, b, a]) => new Color(r, g, b, a));

const parsers = bnb.choice(pattern1, pattern2, pattern3, pattern4);

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
