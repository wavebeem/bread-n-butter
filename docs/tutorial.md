---
layout: "layouts/home"
title: "Tutorial | bread-n-butter"
---

# Tutorial

bread-n-butter has been loaded in the browser as `bnb`, so feel free to open
your dev tools and follow along in the console with any of these examples.

@[toc]

## Parsing Static Strings

bnb is built upon instances of `bnb.Parser`, but most of the time you will use
helper functions and methods rather than writing parsers from scratch.
`bnb.text` will match the exact string passed to it, and `.and` can be used to
combine two parsers and return their values as an array.

Typically you will use `.parse` to get the result of parsing a string, but for
the sake of brevity, most examples here will use `.tryParse` which is shorter
but throws an exception when parsing fails.

```ts
const apple = bnb.text("apple");
const banana = bnb.text("banana");
const applebanana = apple.and(banana);
ab.tryParse("applebanana");
// => ["apple", "banana"]
```

## Parsing With Regular Expressions

`bnb.match` is one of the most powerful functions offered. You can parse
anything that a regular expression can parse with that. But don't be alarmed if
regular expressions are not your strong suit: regular expressions used with bnb
tend to be very short! Rather than writing extremely long regular expressions to
try and parse the entire input at once, in bnb they tend to be quite short and
only parse very small chunks of your input at a time.

`.map` is one of the most important functions in bnb, allowing you to transform
the parsed text into a different kind of value. In this example, `integer`
transforms the strings into numbers, then `sepBy1` transforms multiple
`integer`s into an array, and finally `.map` collects all those array items into
a nice tidy JavaScript object.

```ts
const integer = bnb
  .match(/[0-9]+/)
  .map((str) => Number(str))
  .desc(["integer"]);

const version = integer
  .sepBy1(bnb.text("."))
  .map(([major, minor, patch]) => {
    return { major, minor, patch };
  })
  .desc(["version"]);

version.tryParse("3.14.15");
// { major: 3, minor: 14, patch: 15 }
```

If you've written ad-hoc parsers before using regular expressions or string
`split`, this might seem a little heavy handed, but the architecture of bnb
scales to larger parsers and for complicated languages.

## Choosing Between Different Parsers

When you want to choose between multiple options, [.or](/api#parser-or) and
[.chain](#/api#parser-chain) are useful. You can chain `.or` calls as many times
as you want, and only the first one to succeed parsing is returned.

```ts
const a = bnb.text("a");
const b = bnb.text("b");
const c = bnb.text("c");

const abc = a.or(b).or(c);

abc.tryParse("a"); // => "a"
abc.tryParse("b"); // => "b"
abc.tryParse("c"); // => "c"
```

This works by _back-tracking_---saving the source location and going back to
that saved location if the parser fails. This is useful when you have many
different options that are all equally viable. For example, in a programming
language, a string, number, boolean, array, or object are all valid as
"expressions", so your expression parser should combine all the other parsers
using `.or`.

If you have a lot of parsers combined with `.or`, you can use
[bnb.choice](/api#bnb-choice) instead, which takes as many parsers as you want,
yielding the result from the first one that succeeds.

```ts
const a = bnb.text("a");
const b = bnb.text("b");
const c = bnb.text("c");

const abc = bnb.choice(a, b, c);

abc.tryParse("a"); // => "a"
abc.tryParse("b"); // => "b"
abc.tryParse("c"); // => "c"
```

`.chain` can also let you make choices between multiple options, though it's a
bit different. With `.chain` you can read the value from the last parser and
return a new parser. So you can even use an `if` statement to choose what to
parse next.

```ts
const customString = bnb.match(/[a-z]/);
const lowerUpperAlphaPair = lowerAlphaChar.chain((first) => {
  const upper = first.toUpperCase();
  return bnb.text(upper);
});

lowerUpperAlphaPair.tryParse("aA"); // => ["a", "A"]
lowerUpperAlphaPair.tryParse("bB"); // => ["b", "B"]
lowerUpperAlphaPair.tryParse("bb"); // => Error
lowerUpperAlphaPair.tryParse("Aa"); // => Error
```

You can combine `.chain` with [bnb.ok](/api#bnb-ok) and
[bnb.fail](/api#bnb-fail) to do assertions about the data you just parsed:

```ts
const number = bnb
  .match(/[0-9]+/)
  .map(Number)
  .chain((num) => {
    if (num === 420) {
      return bnb.fail(["appropriate number"]);
    }
    return bnb.ok(num);
  });
```

It would be tricky to specify upfront what kind of parse is allowed here.
Checking the value _after_ parsing is much simpler.

Finally, you can use `.chain` to combine several parsers together and keep track
of all their values.

```ts
const oneChar = bnb.match(/./ms);
const threeChars = oneChar.chain((first) => {
  return oneChar.chain((second) => {
    return oneChar.map((third) => {
      return [first, second, third];
    });
  });
});

threeChars.tryParse("abc"); // => ["a", "b", "c"]
```

Notice that `.map` is used on the final nested call. `.chain` must always return
a parser, not just a plain value. So you could use `.chain` for the final call,
but then you'd have to use `bnb.ok(value)` instead of just the value itself.

As a shortcut, you can use [bnb.all](/api#bnb-all) when you want to match
multiple parsers in a row and use all their values.

```ts
const oneChar = bnb.match(/./ms);
const threeChars = bnb.all(oneChar, oneChar, oneChar);

threeChars.tryParse("abc"); // => ["a", "b", "c"]
```

And if you need to access their values, you can use array destructuring.

```ts
const oneChar = bnb.match(/./ms);
const threeChars = bnb.all(oneChar, oneChar, oneChar).map(([c1, ct, c3]) => {
  return { c1, c2, c3 };
});

threeChars.tryParse("abc");
// => {
//   c1: "a",
//   c2: "b",
//   c3: "c",
// }
```

## Lazy Parsers and Recursive Grammar

Most languages are _recursive_. This means you can put things together like
nesting dolls. In JavaScript, you frequently see objects with objects inside, or
arrays with arrays inside. You can do this as many levels deep as you want.

In order to parse an array, you need to be able to stop and parse an array
inside of it first. This means your parser needs to be able to refer to itself!
Though frequently in parsers you see _indirect recursion_. In JavaScript,
_expressions_ can be arrays (or numbers, or objects, etc.), and arrays are lists
of _expressions_. So you can go from array to expression back to array again.
This is called _indirect recursion_ because there's one intermediate step before
array is nested back inside itself again.

```ts
// We have to use lazy here because `number` and `array` aren't defined yet
const expression = bnb.lazy(() => {
  return number.or(array);
  // NOTE: You can use bnb.choice(...parsers) if you have several parsers
});

const number = bnb.match(/[0-9]+/).map(Number);

// `array` is indirectly recursive because it uses `expression` which
// internally uses `array`
const array = expression
  .sepBy0(bnb.text(" "))
  .wrap(bnb.text("("), bnb.text(")"));

expression.tryParse("12"); // => 12
expression.tryParse("()"); // => []
expression.tryParse("(())"); // => [[]]
expression.tryParse("((1 2) (3 4))"); // => [[1, 2], [3, 4]]
```

## Location and AST Nodes

bnb provides string index and file line/column numbers for error messages, but
sometimes you need this information even when parsing works correctly. For
example, you might be writing a code linter that reports subtle issues with a
program. Without having line/column information, you would be hard pressed to
tell the user where to go to fix the problem. A function might also internally
store the file/line/column where it was defined, so that developer tools can
show you the source code.

The quickest way to add this information to your parse result is using
[.node](#/api#parser-node).

```ts
const number = bnb
  .match(/[0-9]+/)
  .map(Number)
  .node("Number");

number.tryParse("8675309");
// => {
//   type: "ParseNode",
//   name: "Number",
//   value: 8675309,
//   start: { index: 0, line: 1, column: 1 },
//   end: { index: 7, line: 1, column: 8 }
// }
```

Now you can use the `name` property to differentiate this kind of parse node
from other types, as well as `start` and `end` to provide any kind of messages
you want.

It's a good idea to add many `.node` calls throughout your parser so you can use
that information later.

`.node` is not a special parser, though. You can use
[bnb.location](/api#bnb-location) to get the current location (index, line,
column) at any point while parsing. `.node` uses `bnb.location` before and after
your parser. If you don't like the structure of this `ParseNode` object, you can
create your own without too much fuss.

```ts
function node(type: string) {
  return function <A>(parser: bnb.Parser<A>) {
    return bnb
      .all(bnb.location, parser, bnb.location)
      .map(([start, value, end]) => {
        // You could also use classes instead of plain objects
        return { type, value, start, end };
      });
  };
}

const number = bnb
  .match(/[0-9]+/)
  .map(Number)
  .thru(node("Number"));

number.tryParse("8675309");
// => {
//   type: "Number",
//   value: 8675309,
//   start: { index: 0, line: 1, column: 1 },
//   end: { index: 7, line: 1, column: 8 }
// }
```
