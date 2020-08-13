import * as bnb from "../src/bread-n-butter";
import { prettyPrint } from "./util";

///////////////////////////////////////////////////////////////////////

// Use the JSON standard's definition of whitespace rather than Parsimmon's.
const whitespace = bnb.match(/\s*/m);

// JSON is pretty relaxed about whitespace, so let's make it easy to ignore
// after most text.
function token<A>(parser: bnb.Parser<A>) {
  return parser.trim(whitespace);
}

// Several parsers are just strings with optional whitespace.
function word(str: string) {
  return bnb.text(str).thru(token);
}

type JSONValue =
  | { [key: string]: JSONValue }
  | JSONValue[]
  | string
  | number
  | null
  | true
  | false;

// This is the main entry point of the parser: a full JSON value.
const jsonValue: bnb.Parser<JSONValue> = bnb.lazy(() => {
  return bnb
    .choice<JSONValue>(
      jsonObject,
      jsonArray,
      jsonString,
      jsonNumber,
      jsonNull,
      jsonTrue,
      jsonFalse
    )
    .thru(token);
});

// The basic tokens in JSON, with optional whitespace afterward.
const jsonLBrace = word("{");
const jsonRBrace = word("}");
const jsonLCurly = word("[");
const jsonRCurly = word("]");
const jsonComma = word(",");
const jsonColon = word(":");
const jsonNull = word("null").map<null>(() => null);
const jsonTrue = word("true").map<true>(() => true);
const jsonFalse = word("false").map<false>(() => false);

// A string escape sequence
const strEscape = bnb.choice(
  bnb.match(/\\u[0-9a-fA-F]{4}/).map((str) => {
    return String.fromCharCode(parseInt(str.slice(2), 16));
  }),
  bnb.text("\\b").map(() => "\b"),
  bnb.text("\\n").map(() => "\n"),
  bnb.text("\\f").map(() => "\f"),
  bnb.text("\\r").map(() => "\r"),
  bnb.text("\\t").map(() => "\t"),
  bnb.match(/\\./).map((str) => str.slice(1))
);

// One or more characters that aren't `"` or `\`
const strChunk = bnb.match(/[^"\\]+/);

const strPart = strEscape.or(strChunk);

const jsonString = strPart
  .many0()
  .map((parts) => parts.join(""))
  .trim(bnb.text('"'))
  .thru(token)
  .desc(["string"]);

const numSign = bnb.text("-").or(bnb.text(""));
const numInt = bnb.match(/[1-9][0-9]*/).or(bnb.text("0"));
const numFrac = bnb.match(/\.[0-9]+/).or(bnb.text(""));
const numExp = bnb.match(/e[+-]?[0-9]+/i).or(bnb.ok(""));

// You could write this as one giant regular expression, but breaking it up
// makes it easier to read, write, and test
//
// ```ts
// /-?(0|[1-9][0-9]*)([.][0-9]+)?([eE][+-]?[0-9]+)?/
// ```
const jsonNumber = bnb
  .all(numSign, numInt, numFrac, numExp)
  .map(([sign, integer, fractional, exp]) => {
    // Seeing as JSON numbers are a subset of JS numbers, we can cheat by
    // passing the whole thing off to the `Number` function, so we don't
    // have to evaluate the number ourselves
    return Number(sign + integer + fractional + exp);
  })
  .thru(token)
  .desc(["number"]);

// Array parsing is ignoring brackets and commas and parsing as many nested JSON
// documents as possible. Notice that we're using the parser `jsonValue` we just
// defined above. Arrays and objects in the JSON grammar are recursive because
// they can contain any other JSON document within them.
const jsonArray = jsonValue.sepBy0(jsonComma).wrap(jsonLCurly, jsonRCurly);

// Object parsing is a little trickier because we have to collect all the key-
// value pairs in order as length-2 arrays, then manually copy them into an
// object.
const objPair = jsonString.and(jsonColon.chain(() => jsonValue));

const jsonObject = objPair
  .sepBy0(jsonComma)
  .wrap(jsonLBrace, jsonRBrace)
  .map((pairs) => {
    const obj: { [key: string]: JSONValue } = {};
    for (const [key, value] of pairs) {
      obj[key] = value;
    }
    return obj;
  });

///////////////////////////////////////////////////////////////////////

const text = `\
{
  "id": "a thing\\nice\tab",
  "another property!"
    : "also cool"
  , "weird formatting is ok too........😂": 123.45e1,
  "": [
    true, false, null,
    "",
    " ",
    {},
    {"": {}}
  ]
}
`;

export function parse(json: string): JSONValue {
  return jsonValue.tryParse(json);
}

if (require.main === module) {
  prettyPrint(parse(text));
}
