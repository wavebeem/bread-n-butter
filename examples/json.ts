import * as util from "util";
import * as bnb from "../src/bread-n-butter";

///////////////////////////////////////////////////////////////////////

// Turn escaped characters into real ones (e.g. "\\n" becomes "\n").
function interpretEscapes(str: string): string {
  return str.replace(/\\(u[0-9a-fA-F]{4}|[^u])/, (_, escape: string) => {
    const type = escape.charAt(0);
    switch (type) {
      case "u":
        const hex = escape.slice(1);
        return String.fromCharCode(parseInt(hex, 16));
      case "b":
        return "\b";
      case "f":
        return "\f";
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "\t";
      default:
        return type;
    }
  });
}

function objectFromPairs(
  pairs: [string, JSONValue][]
): Record<string, JSONValue> {
  const obj: Record<string, any> = {};
  for (const [key, value] of pairs) {
    obj[key] = value;
  }
  return obj;
}

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
const jsonValue: bnb.Parser<JSONValue> = bnb.lazy(() =>
  jsonObject
    .or(jsonArray)
    .or(jsonString)
    .or(jsonNumber)
    .or(jsonNull)
    .or(jsonTrue)
    .or(jsonFalse)
    .thru(token)
);

// The basic tokens in JSON, with optional whitespace afterward.
const jsonLbrace = word("{");
const jsonRbrace = word("}");
const jsonLbracket = word("[");
const jsonRbracket = word("]");
const jsonComma = word(",");
const jsonColon = word(":");
const jsonNull = word("null").map<null>(() => null);
const jsonTrue = word("true").map<true>(() => true);
const jsonFalse = word("false").map<false>(() => false);

// Regexp based parsers should generally be named for better error reporting.
const jsonString = bnb
  // Zero or more backslash escaped pieces of text, or anything besides `"`
  .match(/(\\.|[^"])*/)
  .trim(bnb.text('"'))
  .thru(token)
  .map(interpretEscapes)
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
const jsonNumber = numSign
  .chain((sign) => {
    return numInt.chain((integer) => {
      return numFrac.chain((fractional) => {
        return numExp.map((exp) => {
          return Number(sign + integer + fractional + exp);
        });
      });
    });
  })
  .thru(token)
  .desc(["number"]);

// Array parsing is ignoring brackets and commas and parsing as many nested JSON
// documents as possible. Notice that we're using the parser `jsonValue` we just
// defined above. Arrays and objects in the JSON grammar are recursive because
// they can contain any other JSON document within them.
const jsonArray = jsonValue.sepBy0(jsonComma).wrap(jsonLbracket, jsonRbracket);

// Object parsing is a little trickier because we have to collect all the key-
// value pairs in order as length-2 arrays, then manually copy them into an
// object.
const objPair = jsonString.and(jsonColon.chain(() => jsonValue));

const jsonObject = objPair
  .sepBy0(jsonComma)
  .wrap(jsonLbrace, jsonRbrace)
  .map(objectFromPairs);

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

function prettyPrint(x: any): void {
  console.log(util.inspect(x, { depth: null, colors: true }));
}

const ast = jsonValue.tryParse(text);
prettyPrint(ast);
