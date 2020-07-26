---
layout: "layouts/home.njk"
title: "Tutorial | bread-n-butter"
---

# Tutorial

@[toc]

## Parsing Static Strings

bnb is built upon instances of `bnb.Parser`, but most of the time you will use
helper functions and methods rather than writing parsers from scratch. `bnb.str` will match the exact string passed to it, and `.and` can be used to combine two parsers and return their values as an array.

Typically you will use `.parse` to get the result of parsing a string, but for the sake of brevity, most examples here will use `.tryParse` which is shorter but throws an exception when parsing fails.

```ts
const apple = bnb.text("apple");
const banana = bnb.text("banana");
const applebanana = apple.and(banana);
ab.tryParse("applebanana");
// => ["apple", "banana"]
```

## Parsing with Regular Expressions

`bnb.match` is one of the most powerful functions offered. You can parse anything that a regular expression can parse with that. But don't be alarmed if regular expressions are not your strong suit: regular expressions used with bnb tend to be very short! Rather than writing extremely long regular expressions to try and parse the entire input at once, in bnb they tend to be quite short and only parse very small chunks of your input at a time.

`.map` is one of the most important functions in bnb, allowing you to transform the parsed text into a different kind of value. In this example, `integer` transforms the strings into numbers, then `sepBy1` transforms multiple `integer`s into an array, and finally `.map` collects all those array items into a nice tidy JavaScript object.

```ts
const integer = bnb
  .match(/[0-9]+/)
  .map((str) => Number(str))
  .desc(["integer"]);

const version = integer
  .sepBy1(bnb.string("."))
  .map(([major, minor, patch]) => {
    return { major, minor, patch };
  })
  .desc(["version"]);

version.tryParse("3.14.15");
// { major: 3, minor: 14, patch: 15 }
```

If you've written ad-hoc parsers before using regular expressions or string `split`, this might seem a little heavy handed, but the architecture of bnb scales to larger parsers and for complicated languages.
