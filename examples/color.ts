import * as bnb from "../src/bread-n-butter";

function rgba(r: number, g: number, b: number, a: number) {
  return { r, g, b, a };
}

// Primitives
const ws = bnb.match(/\s*/).desc(["whitespace"]);
const sharp = bnb.text("#");
const hexDigit = bnb.match(/[0-9a-fA-F]/).desc(["a hex digit"]);
const hex1 = hexDigit.map((d) => parseInt(d + d, 16));
const hex2 = hexDigit.and(hexDigit).map(([d1, d2]) => parseInt(d1 + d2, 16));
const number = bnb
  .match(/[0-9]+(\.[0-9]*)?/)
  .map(Number)
  .desc(["a number"]);

// Color types
const hexColorShort = sharp
  .next(bnb.all(hex1, hex1, hex1))
  .map(([r, g, b]) => rgba(r, g, b, 1));

const hexColorLong = sharp
  .next(bnb.all(hex2, hex2, hex2))
  .map(([r, g, b]) => rgba(r, g, b, 1));

const rgbColor = bnb
  .text("rgb(")
  .next(number.trim(ws).sepBy(bnb.text(","), 3, 3).trim(ws))
  .skip(bnb.text(")"))
  .map(([r, g, b]) => rgba(r, g, b, 1));

const rgbaColor = bnb
  .text("rgba(")
  .next(number.trim(ws).sepBy(bnb.text(","), 4, 4).trim(ws))
  .skip(bnb.text(")"))
  .map(([r, g, b, a]) => rgba(r, g, b, a));

// Note that hexColorLong must be placed before hexColorShort. `bnb.choice`
// picks the first parser that matches, and `.parse` and `.tryParse` error if
// your parser does not consume the entire input. If you put `hexColorShort`
// first then the last 3 hex digits would be left over at the end when parsing a
// 6-digit hex color, causing an error.
const Color = bnb.choice(hexColorLong, hexColorShort, rgbColor, rgbaColor);

export default Color;
