---
layout: "layouts/home.njk"
title: "API | bread-n-butter"
---

# API

@[toc]

## Parser Creators

### bnb.str

Returns a parser that matches the exact text supplied.

This is typically used for things like parsing keywords (`for`, `while`, `if`,
`else`, `let`...), or parsing static characters such as `{`, `}`, `"`, `'`...

```ts
const keywordWhile = bnb.str("while");
const paren = bnb.str("(").and(bnb.str(")"));
keywordWhile.tryParse("while"); // => "while"
paren.tryParse("()"); // => ["(", ")"]
```

### bnb.match

Returns a parser that matches the entire regular expression at the current
parser position.

Currently only supports regular expressions with no flags or just the `/.../i`
flag.

**Note:** Do not use the `^` anchor at the beginning of your regular expression.
This internally uses sticky (`/.../y`) regular expressions with `lastIndex` set
to the current parsing index.

**Note:** Capture groups `()` are not significant to this parser. The entire
match is returned regardless of any capture groups used.

```ts
const identifier = bnb.match(/[a-z_]+/i);
identifier.tryParse("internal_toString");
// => "internal_toString"

const number = bnb.match(/[0-9]+/);
number.tryParse("404");
// => 404
```

### bnb.lazy

Takes a callback that returns a parser. The callback is called at most once, and
only right when the parse action needs to happen.

**Note:** This function exists so you can reference parsers that have not yet
been defined. Many grammars are recursive, but JavaScript variables are not, so
this is a workaround. Typically you will want to use `lazy` on parsers that
parse expressions or statements, with lots of `or` calls chained together.

**Note:** Recursive references can confuse TypeScript. Whenever you use `lazy`
you should manually supply the type parameter so that TypeScript doesn't assume
it's `any`.

`lazy` must be used here in order to reference variables `item` and `list`
before they are defined. You could try to put `expr` at the end of the file, but
then `list` would reference `expr` before it's defined, so `list` would have to
be wrapped in `lazy` instead.

```ts
type XExpr = XItem | XList;
type XItem = string;
type XList = XExpr[];
const expr: bnb.Parser<XExpr> = bnb.lazy(() => {
  return list.or(item);
});
const item: bnb.Parser<XItem> = bnb.match(/[a-z]+/i);
const list: bnb.Parser<XList> = expr
  .sepBy0(bnb.str(","))
  .wrap(bnb.str("["), bnb.str("]"));
expr.tryParse("[a,b,[c,d,[]],[[e]]]");
// => ["a", "b", ["c", "d", []], [["e"]]]
```

### bnb.ok

Returns a parser that yields the given value and consumes no input.

Usually used as a fallback parser in case you want the option of parsing nothing
at all.

```ts
const sign = bnb.str("+").or(bnb.str("-")).or(bnb.of(""));
sign.tryParse("+"); // => "+"
sign.tryParse("-"); // => "-"
sign.tryParse(""); // => ""
```

### bnb.fail

Returns a parser that fails with the given messages and consumes no input.
Usually used in the `else` branch of a `chain` callback function.

**Note:** Messages are are typically displayed as part of a comma separated list
of "expected" values, like "expected list, number, object", so it's best to keep
your failure messages limited to nouns. If you used a message like "number too
big" instead, then you might end up showing the user an error message like
"expected number too big" which doesn't make any sense at all.

```ts
const number = bnb.match(/[0-9]+/).chain((s) => {
  const n = Number(s);
  if (Number.isFinite(n)) {
    return bnb.ok(n);
  } else {
    return bnb.fail(["smaller number"]);
  }
});

number.tryParse("1984");
// => 1984

number.tryParse("9".repeat(999));
// => error: expected smaller number
```

## Parser Methods

### parser.parse

Returns a `ParseResult` with the parse value if successful, otherwise a failure
value indicating where the error is and what values we were looking for at the
time of failure. Use `isOK` to check if the parse succeeded or not.

**Note:** `parse` assumes you are parsing the entire input and will
fail unless you do so.

```ts
const a = bnb.str("a");
const result1 = a.parse("a");
if (result.isOK()) {
  console.log(result.value);
  // => "a"
} else {
  const { location, expected } = result;
  console.error("error at line", location.line, "column", location.column);
  console.error("expected one of", expected.join(", "));
}
```

### parser.tryParse

Return the result from successfully parsing.

If the parse fails, throws an error with a message describing the line/column
and what values were expected. This method is provided for convenience in case
you are not interested in handling the failure case.

**Note:** If you plan on handling failures, use `parse` directly to get full
information about went wrong so you can present the error message better for our
application.

```ts
const a = bnb.str("a");
const value = a.tryParse("a");
value; // => "a"
```

### parser.and

Combines two parsers one after the other, yielding the results of both in an
array.

```ts
const a = bnb.str("a");
const b = bnb.str("b");
const ab = a.and(b);
const result = ab.tryParse("a;
result.value;
// => ["a", "b"]
```

### parser.or

Try to parse using the current parser. If that fails, parse using the second
parser.

This is good for parsing things like _expressions_ or _statements_ in
programming languages, where many different types of things are applicable.

```ts
const a = bnb.str("a");
const b = bnb.str("b");
const ab = a.or(b);
ab.tryParse("a"); // => "a"
ab.tryParse("b"); // => "b"

// You can also use this to implement optional parsers
const aMaybe = bnb.str("a").or(bnb.ok(null));
aMaybe.tryParse("a"); // => "a"
aMaybe.tryParse(""); // => null
```

### parser.chain

Parse using the current parser. If it succeeds, pass the value to the
callback function, which returns the next parser to use. Similar to `and`,
but you get to choose which parser comes next based on the value of the
first one.

This is good for parsing things like _expressions_ or _statements_ in
programming languages, where many different types of things are applicable.

```ts
const balance = bnb
  .str("(")
  .or(bnb.str("["))
  .chain((first) => {
    if (first === "(") {
      return bnb.str(")").map((last) => [first, last]);
    } else {
      return bnb.str("]").map((last) => [first, last]);
    }
  });
balance.tryParse("()"); // => ["(", ")"]
balance.tryParse("[]"); // => ["[", "]"]
```

### parser.map

Yields the value from the parser after being called with the callback.

```ts
const num = bnb.match(/[0-9]+/).map((str) => Number(str));
num.tryParse("1312"); // => 1312
num.tryParse("777"); // =>  777

const yes = bnb.str("yes").map(() => true);
const no = bnb.str("no").map(() => false);
const bool = yes.or(no);
bool.tryParse("yes"); // => true
bool.tryParse("no"); // => false
```

### parser.desc

Returns a parser which parses the same value, but discards other error messages,
using the one supplied instead.

This function should only be used on tokens within your grammar. That means
things like strings or numbers usually. You do not want to use it large things
like class definitions. You should generally use this after any parser that uses
a regular expression, otherwise your parse failure message will just be the
regular expression source code.

```ts
const jsonNumber1 = bnb
  .match(/-?(0|[1-9][0-9]*)([.][0-9]+)?([eE][+-]?[0-9]+)?/)
  .map(Number);
const jsonNumber2 = jsonNumber1.desc("number");

jsonNumber1.tryParse("x");
// => ["/-?(0|[1-9][0-9]*)([.][0-9]+)?([eE][+-]?[0-9]+)?/"]

jsonNumber2.tryParse("x");
// => ["number"]
```

### parser.wrap

Wraps the current parser with before and after parsers.

Useful for adding the brackets onto an array parser, object parser, or argument
list parser, for example.

```ts
const item = bnb.str("a");
const comma = bnb.str(",");
const lbrack = bnb.str("[");
const rbrack = bnb.str("]");
const list = item.sepBy0(comma).wrap(lbrack, rbrack);
list.tryParse("[a,a,a]"); // => ["a", "a", "a"]
```

### parser.trim

Ignores content before and after the current parser, based on the supplied
parser. Generally used with a parser that parses optional whitespace.

**Note:** Whitespace parsers typically also parse code comments, since
those are generally ignored when parsing, just like whitespace.

```ts
const whitespace = bnb.match(/\s+/);
const optWhitespace = whitespace.or(bnb.ok(""));
const item = bnb.str("a").trim(optWhitespace);
item.tryParse("     a "); // => "a"
```

### parser.many0

Repeats the current parser zero or more times, yielding the results in an array.

Given that this can match **zero** times, take care not to parse this
accidentally. Usually this parser should come up in the context of some other
characters that must be present, such as `{}` to indicate a code block, with
zero or more statements inside.

```ts
const identifier = bnb.match(/[a-z]+/i);
const expression = identifier.and(bnb.str("()")).map(([first]) => first);
const statement = expression.and(bnb.str(";")).map(([first]) => first);
const block = statement.many0().wrap(bnb.str("{"), bnb.str("}"));
block.tryParse("{apple();banana();coconut();}");
// => ["apple", "banana", "coconut"];
```

### parser.many1

Parsers the current parser **one** or more times. See
[parser.many0](#parser.many0) for more details.

### parser.sepBy0

Returns a parser that parses zero or more times, separated by the separator
parser supplied. Useful for things like arrays, objects, argument lists, etc.

```ts
const item = bnb.str("a");
const comma = bnb.str(",");
const list = item.sepBy0(comma);
list.tryParse("a,a,a"); // => ["a", "a", "a"]
```

### parser.sepBy1

Returns a parser that parses one or more times, separated by the separator
parser supplied.

Useful for things parsing non-empty lists, such as a list of interfaces
implemented by a class.

```ts
const identifier = bnb.match(/[a-z]+/i);
const classDecl = bnb
  .str("class ")
  .and(identifier)
  .chain(([, name]) => {
    return bnb
      .str(" implements ")
      .and(identifier.sepBy1(bnb.str(", ")))
      .map(([, interfaces]) => {
        return {
          type: "Class",
          name: name,
          interfaces: interfaces,
        };
      });
  });
classDecl.tryParse("class A implements I, J, K");
// => { type: "Class", name: "A", interfaces: ["I", "J", "K"] }
```

### parser.node

Returns a parser that adds name and start/end location metadata.

This should be used heavily within your parser so that you can do proper error
reporting. You may also wish to keep this information available in the runtime
of your language for things like stack traces.

This is just a convenience method built around `location`. Don't hesitate to
avoid this function and instead use `thru` call your own custom node creation
function that fits your domain better.

Location `index` is 0-indexed and `line`/`column` information is 1-indexed.

**Note:** The `end` location is _exclusive_ of the parse (one character further)

```ts
const identifier = bnb.match(/[a-z]+/i).node("Identifier");
identifier.tryParse("hello");
// => {
//   type: "ParseNode",
//   name: "Identifier",
//   value: "hello",
//   start: SourceLocation { index: 0, line: 1, column: 1 },
//   end: SourceLocation { index: 5, line: 1, column: 6 } }
// }

// Create type aliases for TypeScript use
type LispSymbol = bnb.ParseNode<"LispSymbol", string>;
type LispNumber = bnb.ParseNode<"LispNumber", number>;
type LispList = bnb.ParseNode<"LispList", LispExpr[]>;
type LispExpr = LispSymbol | LispNumber | LispList;
```

### parser.thru

Returns the callback called with the parser.

Useful so you can put functions in the middle of a method chain.

```ts
function paren(parser) {
  return parser.wrap(bnb.str("("), bnb.str(")"));
}

const paren1 = bnb.str("a").thru(paren).desc("(a)");
// --- vs ---
const paren2 = paren(bnb.str("a")).desc("(a)");

paren1.tryParse("(a)"); // => "a"
paren2.tryParse("(a)"); // => "a"
```

### bnb.Parser

Creates a new custom parser that performs the given parsing action.

**Note:** That use of this constructor is an advanced feature and not needed for
most parsers.

See also:

- [context.input](#context.input)
- [context.location](#context.location)
- [context.ok](#context.ok)
- [context.fail](#context.fail)

```ts
const number = new bnb.Parser((context) => {
  const start = context.location.index;
  const end = context.location.index + 2;
  if (context.input.slice(start, end) === "AA") {
    // Return how far we got, and what value we found
    return context.ok(end, "AA");
  }
  // Return how far we got, and what value we were looking for
  return context.fail(start, ["AA"]);
});
```

### parser.action

The parsing action.

Takes a parsing [Context](#Context) and returns an [ActionResult](#ActionResult)
representing success or failure.

This should only be called directly when writing custom parsers using
[bnb.Parser](#bnb.Parser).

Make sure to use [actionResult.merge](#actionResult.merge) when combining
multiple `ActionResult`s or else you will lose important parsing information.

## Built-in Parsers

### bnb.eof

This parser succeeds if the input has already been fully parsed. Typically
you won't need to use this since `parse` already checks this for you. But if
your language uses newlines to terminate statements, you might want to check
for newlines **or** eof in case the text file doesn't end with a trailing
newline (many text editors omit this character).

```ts
const endline = bnb.match(/\r?\n/).or(bnb.eof);
const statement = bnb
  .match(/[a-z]+/i)
  .and(endline)
  .map(([first]) => first);
const file = statement.many0();
file.tryParse("A\nB\nC"); // => ["A", "B", "C"]
```

### bnb.location

Parser that yields the current [SourceLocation](#SourceLocation), containing
properties `index`, `line` and `column`. Useful when used before and after a
given parser, so you can know the source range for highlighting errors. Used
internally by [parser.node](#parser.node).

```ts
const identifier = location.chain((start) => {
  return bnb.match(/[a-z]+/i).chain((name) => {
    return location.map((end) => {
      return { type: "Identifier", name, start, end };
    });
  });
});
identifier.tryParse("abc");
// => {
//   type: "Identifier",
//   name: "abc",
//   start: SourceLocation { index: 0, line: 1, column: 1 },
//   end: SourceLocation { index: 2, line: 1, column: 3 }
// }
```

## Context

Represents the current parsing context. `input` is the string being parsed and
`location` is the current parse location (with `index`, `line`, and `column`
properties).

This is not constructable directly, but is passed to every custom parser action.
Generally you will return a call to the `ok` or `fail` methods from inside a
custom parser.

```ts
const bracket = new bnb.Parser<"[" | "]">((context) => {
  const start = context.location.index;
  const end = start + 1;
  const ch = context.input.slice(start, end);
  if (ch === "[" || ch === "]") {
    return context.ok(end, ch);
  }
  return context.fail(start, ["[", "]"]);
});
```

### context.input

The current parsing input (a string).

### context.location

The current parsing location, an object with `index`, `line`

### context.ok

TODO

### context.fail

TODO

### context.withLocation

TODO

## ActionResult

TODO

### actionResult.merge

TODO

## SourceLocation

An object containing:

- `index`: The string index
- `line`: The line number (1-indexed)
- `column`: The column number (1-indexed)

The `index` is counted as you would normally index a string for use with
`.slice` and such. But the `line` and `column` properly count complex Unicode
characters like emojis. Each `\n` character separates lines.
