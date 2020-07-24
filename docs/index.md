---
layout: "layouts/home.njk"
title: "bread-n-butter"
---

**EXPERIMENTAL: Do not use in production**

# bread-n-butter

Bread 'n Butter (bnb) is a parser combinator library for TypeScript and JavaScript.

With relatively little code and no build step, you can get a proper parser prepared for the language or input of your choice. A few functions and methods, paired with a bit of regular expression experience, is all you need.

## Installation

```
npm i bread-n-butter
```

## Usage

If you are using ES modules:

```js
import * as bnb from "bread-n-butter";
```

If you are using Node.js require:

```js
const bnb = require("bread-n-butter");
```

## Getting Started

bnb is a [parser combinator](https://en.wikipedia.org/wiki/Parser_combinator) library. This means that using combinators (functions that take parsers and return parsers), you can build up complex parsers.

bnb is heavily inspired by [parsimmon](https://github.com/jneen/parsimmon), but written in TypeScript and targeting modern JavaScript engines only.

### Parsing Static Strings

bnb is built upon instances of `bnb.Parser`, but most of the time you will use
helper functions and methods rather than writing parsers from scratch. `bnb.str` will match the exact string passed to it, and `.and` can be used to combine two parsers and return their values as an array.

Typically you will use `.parse` to get the result of parsing a string, but for the sake of brevity, most examples here will use `.tryParse` which is shorter but throws an exception when parsing fails.

```ts
const apple = bnb.str("apple");
const banana = bnb.str("banana");
const applebanana = apple.and(banana);
ab.tryParse("applebanana");
// => ["apple", "banana"]
```

### Parsing with Regular Expressions

`bnb.match` is one of the most powerful functions offered. You can parse anything that a regular expression can parse with that. But don't be alarmed if regular expressions are not your strong suit: regular expressions used with bnb tend to be very short! Rather than writing extremely long regular expressions to try and parse the entire input at once, in bnb they tend to be quite short and only parse very small chunks of your input at a time.

`.map` is one of the most important functions in bnb, allowing you to transform the parsed text into a different kind of value. In this example, `integer` transforms the strings into numbers, then `sepBy1` transforms multiple `integer`s into an array, and finally `.map` collects all those array items into a nice tidy JavaScript object.

```ts
const integer = bnb
  .match(/[0-9]+/)
  .map((str) => Number(str))
  .desc("integer");

const version = integer
  .sepBy1(bnb.string("."))
  .map(([major, minor, patch]) => {
    return { major, minor, patch };
  })
  .desc("version");

version.tryParse("3.14.15");
// { major: 3, minor: 14, patch: 15 }
```

If you've written ad-hoc parsers before using regular expressions or string `split`, this might seem a little heavy handed, but the architecture of bnb scales to larger parsers and for complicated languages.

## Examples

See [the examples](https://github.com/wavebeem/bread-n-butter/tree/main/examples) on GitHub for how to implement various language parsers using bnb.

## API

Read the [full API documentation](api) for more information about every function.

Also, if you are using [Visual Studio Code](https://code.visualstudio.com/) and have installed bnb through npm, you should get automatic API completion with inline documentation so you can save time by never leaving your editor.
