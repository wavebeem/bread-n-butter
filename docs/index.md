---
layout: "layouts/home.njk"
title: "bread-n-butter"
description: "bread-n-butter (bnb) is a parser combinator library for TypeScript and JavaScript."
---

# bread-n-butter

**EXPERIMENTAL: Do not use in production**

bread-n-butter (bnb) is a parser combinator library for TypeScript and JavaScript.

With relatively little code and no build step, you can get a proper parser prepared for the language or input of your choice. A few functions and methods, paired with a bit of regular expression experience, is all you need.

## Installation

```shell
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

## Tutorial

Check out the [tutorial](/tutorial) for help getting started.

## Examples

See [the examples](https://github.com/wavebeem/bread-n-butter/tree/main/examples) on GitHub for how to implement various language parsers using bnb.

## API

Read the [full API documentation](/api) for more information about every function.

Also, if you are using [Visual Studio Code](https://code.visualstudio.com/) and have installed bnb through npm, you should get automatic API completion with inline documentation so you can save time by never leaving your editor.
