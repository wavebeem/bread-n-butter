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

### parser.many1

### parser.sepBy0

### parser.sepBy1

### parser.node

### parser.thru

### bnb.Parser

### parser.action

## Built-in Parsers

### bnb.eof

### bnb.location

## Other

### context.input

### context.location

### context.ok

### context.fail

### actionResult.merge

### what else?
