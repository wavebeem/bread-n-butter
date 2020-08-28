import * as bnb from "../src/bread-n-butter";
import { prettyPrint } from "./util";

class Color {
  constructor(
    public r: number,
    public g: number,
    public b: number,
    public a: number = 1.0
  ) {}
}

// Primitives
const ws = bnb.match(/\s*/);
const sharp = bnb.text("#");
const hexDigit = bnb.match(/[0-9a-fA-F]/);
const hex1 = hexDigit.map((d) => parseInt(d + d, 16));
const hex2 = hexDigit.and(hexDigit).map(([d1, d2]) => parseInt(d1 + d2, 16));
const number = bnb.match(/[0-9]+(\.[0-9]*)?/).map(Number);

// Color types
const hexColorShort = sharp
  .next(bnb.all(hex1, hex1, hex1))
  .map(([r, g, b]) => new Color(r, g, b));

const hexColorLong = sharp
  .next(bnb.all(hex2, hex2, hex2))
  .map(([r, g, b]) => new Color(r, g, b));

const rgbColor = bnb
  .text("rgb(")
  .next(number.trim(ws).sepBy1(bnb.text(",")).trim(ws))
  .skip(bnb.text(")"))
  .map(([r, g, b]) => new Color(r, g, b));

const rgbaColor = bnb
  .text("rgba(")
  .next(number.trim(ws).sepBy1(bnb.text(",")).trim(ws))
  .skip(bnb.text(")"))
  .map(([r, g, b, a]) => new Color(r, g, b, a));

// Note that hexColorLong must be placed before hexColorShort. `bnb.choice`
// picks the first parser that matches, and `.parse` and `.tryParse` error if
// your parser does not consume the entire input. If you put `hexColorShort`
// first then the last 3 hex digits would be left over at the end when parsing a
// 6-digit hex color, causing an error.
const cssColor = bnb.choice(hexColorLong, hexColorShort, rgbColor, rgbaColor);

const examples = [
  "#fff",
  "#000000",
  "#238945",
  "rgb(47, 0, 0)",
  "rgba(0, 0, 0, 0.5)",
];

for (const colorText of examples) {
  const color = cssColor.tryParse(colorText);
  prettyPrint(color);
}
