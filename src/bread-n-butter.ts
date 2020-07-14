import { ActionResult, ActionFail } from "./action-result";
import { Context } from "./context";
import { ParseFail, ParseOK, ParseResult } from "./parse-result";
import { SourceLocation } from "./source-location";

/**
 * Represents a parsing action. Avoid using `new Parser(action)` unless you
 * absolutely have to. Most parsing can be done using the exported basic parsers
 * or parser constructors (e.g. [[location]] or [[str]] or [[match]]) and the
 * Parser methods such as [[chain]] and [[map]] and [[or]] and [[and]].
 *
 * @typeParam A the type of value yielded by this parser if it succeeds
 */
export class Parser<A> {
  /**
   * The parsing action. Takes a parsing Context and returns an ActionResult
   * representing success or failure.
   */
  action: (context: Context) => ActionResult<A>;

  /**
   * Creates a new custom parser that performs the given parsing action.
   * **Note:** That use of this constructor is an advanced feature and not
   * needed for most parsers.
   *
   * @param action the parsing action, which should return either [[context.ok]]
   * or [[context.fail]]
   *
   * ```ts
   * const number = new bnb.Parser((context) => {
   *   const start = context.location.index;
   *   const end = context.location.index + 2;
   *   if (context.input.slice(start, end) === "AA") {
   *     // Return how far we got, and what value we found
   *     return context.ok(end, "AA");
   *   }
   *   // Return how far we got, and what value we were looking for
   *   return context.fail(start, ["AA"]);
   * });
   * ```
   */
  constructor(action: (context: Context) => ActionResult<A>) {
    this.action = action;
  }

  /**
   * Returns a [[ParseResult]] with the parse value if successful, otherwise a
   * failure value indicating where the error is and what values we were looking
   * for at the time of failure. Use [[isOK]] to check if the parse succeeded or
   * not. Note that [[parse]] assumes you are parsing the entire input and will
   * fail unless you do so.
   *
   * @param input the string to parse
   *
   * ```ts
   * const a = bnb.str("a");
   * const result1 = a.parse("a");
   * if (result.isOK()) {
   *   console.log(result.value);
   *   // => "a"
   * } else {
   *   const { location, expected } = result;
   *   console.error("error at line", location.line, "column", location.column);
   *   console.error("expected one of", expected.join(", "));
   * }
   * ```
   */
  parse(input: string): ParseResult<A> {
    const location = new SourceLocation(0, 1, 1);
    const context = new Context(input, location);
    const result = this.and(eof).action(context);
    if (result.isOK()) {
      return new ParseOK(result.value[0]);
    }
    return new ParseFail(result.furthest, result.expected);
  }

  /**
   * Return the result from successfully parsing. If the parse fails, throws an
   * error with a message describing the line/column and what values were
   * expected. This method is provided for convenience in case you are not
   * interested in handling the failure case. If you plan on handling failures,
   * use [[parse]] directly to get full information about went wrong so you can
   * present the error message better for our application.
   *
   * @param input the string to parse
   *
   * ```ts
   * const a = bnb.str("a");
   * const value = a.tryParse("a");
   * value; // => "a"
   * ```
   */
  tryParse(input: string): A {
    const result = this.parse(input);
    if (result.isOK()) {
      return result.value;
    }
    const { expected, location } = result;
    const { line, column } = location;
    const message =
      `parse error at line ${line} column ${column}: ` +
      `expected ${expected.join(", ")}`;
    throw new Error(message);
  }

  /**
   * Combines two parsers one after the other, yielding the results of both in
   * an array.
   *
   * @param parserB the next parser
   *
   * ```ts
   * const a = bnb.str("a");
   * const b = bnb.str("b");
   * const ab = a.and(b);
   * const result = ab.tryParse("a;
   * result.value;
   * // => ["a", "b"]
   * ```
   */
  and<B>(parserB: Parser<B>): Parser<[A, B]> {
    return new Parser((context) => {
      const a = this.action(context);
      if (!a.isOK()) {
        return a;
      }
      const b = a.merge(parserB.action(context.withLocation(a.location)));
      if (b.isOK()) {
        const value: [A, B] = [a.value, b.value];
        return b.merge(context.ok(b.location.index, value));
      }
      return b;
    });
  }

  /**
   * Try to parse using the current parser. If that fails, parse using the
   * second parser.
   *
   * This is good for parsing things like _expressions_ or
   * _statements_ in programming languages, where many different types of things
   * are applicable.
   *
   * @param parserB the parser to try next if this one fails
   *
   * ```ts
   * const a = bnb.str("a");
   * const b = bnb.str("b");
   * const ab = a.or(b);
   * ab.tryParse("a"); // => "a"
   * ab.tryParse("b"); // => "b"
   * ```
   *
   * **Tip:** You can also use this to implement optional parsers:
   *
   * ```ts
   * const aMaybe = bnb.str("a").or(bnb.ok(null));
   * aMaybe.tryParse("a"); // => "a"
   * aMaybe.tryParse("");  // => null
   * ```
   */
  or<B>(parserB: Parser<B>): Parser<A | B> {
    return new Parser<A | B>((context) => {
      const a = this.action(context);
      if (a.isOK()) {
        return a;
      }
      return a.merge(parserB.action(context));
    });
  }

  /**
   * Parse using the current parser. If it succeeds, pass the value to the
   * callback function, which returns the next parser to use. Similar to
   * [[and]], but you get to choose which parser comes next based on the value
   * of the first one.
   *
   * This is good for parsing things like _expressions_ or _statements_ in
   * programming languages, where many different types of things are applicable.
   *
   * ```ts
   * const balance = bnb
   *   .str("(")
   *   .or(bnb.str("["))
   *   .chain((first) => {
   *     if (first === "(") {
   *       return bnb.str(")").map((last) => [first, last]);
   *     } else {
   *       return bnb.str("]").map((last) => [first, last]);
   *     }
   *   });
   * balance.tryParse("()"); // => ["(", ")"]
   * balance.tryParse("[]"); // => ["[", "]"]
   * ```
   */
  chain<B>(fn: (value: A) => Parser<B>): Parser<B> {
    return new Parser((context) => {
      const a = this.action(context);
      if (!a.isOK()) {
        return a;
      }
      const parserB = fn(a.value);
      return a.merge(parserB.action(context.withLocation(a.location)));
    });
  }

  /**
   * Yields the value from the parser after being called with the callback.
   *
   * ```ts
   * const num = bnb.match(/[0-9]+/).map(str => Number(str));
   * num.tryParse("1312"); // => 1312
   * num.tryParse("777");  // =>  777
   *
   * const yes = bnb.str("yes").map(() => true);
   * const no = bnb.str("no").map(() => false);
   * const bool = yes.or(no);
   * bool.tryParse("yes"); // => true
   * bool.tryParse("no");  // => false
   * ```
   */
  map<B>(fn: (value: A) => B): Parser<B> {
    return this.chain((a) => {
      return ok(fn(a));
    });
  }

  /**
   * Returns the callback called with the parser. Equivalent to `fn(this)`, but
   * useful so you can put functions in the middle of a method chain.
   *
   * ```ts
   * function paren(parser) {
   *   return parser.wrap(bnb.str("("), bnb.str(")"));
   * }
   *
   * const paren1 = bnb.str("a").thru(paren).desc("(a)");
   * // --- vs ---
   * const paren2 = paren(bnb.str("a")).desc("(a)");
   *
   * paren1.tryParse("(a)"); // => "a"
   * paren2.tryParse("(a)"); // => "a"
   * ```
   */
  thru<B>(fn: (parser: this) => B): B {
    return fn(this);
  }

  /**
   * Returns a parser which parses the same value, but discards other error
   * messages, using the one supplied instead.
   *
   * This function should only be used on tokens within your grammar. That means
   * things like strings or numbers usually. You do not want to use it large
   * things like class definitions. You should generally use this after any
   * parser that uses a regular expression, otherwise your parse failure message
   * will just be the regular expression source code.
   *
   * ```ts
   * const jsonNumber1 = bnb
   *   .match(/-?(0|[1-9][0-9]*)([.][0-9]+)?([eE][+-]?[0-9]+)?/)
   *   .map(Number)
   * const jsonNumber2 = jsonNumber1.desc("number");
   *
   * jsonNumber1.tryParse("x");
   * // => ["/-?(0|[1-9][0-9]*)([.][0-9]+)?([eE][+-]?[0-9]+)?/"]
   *
   * jsonNumber2.tryParse("x");
   * // => ["number"]
   * ```
   */
  desc(name: string): Parser<A> {
    return new Parser((context) => {
      const result = this.action(context);
      if (result.isOK()) {
        return result;
      }
      return new ActionFail(result.furthest, [name]);
    });
  }

  /**
   * Wraps the current parser with before & after parsers. Useful for adding the
   * brackets onto an array parser, object parser, or argument list parser.
   *
   * ```ts
   * const item = bnb.str("a");
   * const comma = bnb.str(",")
   * const lbrack = bnb.str("[");
   * const rbrack = bnb.str("]");
   * const list = item.sepBy0(comma).wrap(lbrack, rbrack);
   * list.tryParse("[a,a,a]"); // => ["a", "a", "a"]
   * ```
   */
  wrap<B, C>(before: Parser<B>, after: Parser<C>): Parser<A> {
    return before.and(this).chain(([, value]) => {
      return after.map(() => value);
    });
  }

  /**
   * Ignores content before and after the current parser, based on the supplied
   * parser. Generally used with a parser that parses optional whitespace.
   *
   * ```ts
   * const whitespace = bnb.match(/\s+/);
   * const optWhitespace = whitespace.or(bnb.ok(""));
   * const item = bnb.str("a").trim(optWhitespace);
   * item.tryParse("     a "); // => "a"
   * ```
   *
   * **Note:** Whitespace parsers typically also parse code comments, since
   * those are generally ignored when parsing, just like whitespace.
   */
  trim<B>(beforeAndAfter: Parser<B>): Parser<A> {
    return this.wrap(beforeAndAfter, beforeAndAfter);
  }

  /**
   * Repeats the current parser zero or more times, yielding the results in an
   * array. Given that this can match **zero** times, take care not to parse
   * this accidentally. Usually this parser should come up in the context of
   * some other characters that must be present, such as `{}` to indicate a code
   * block, with zero or more statements inside.
   *
   * ```ts
   * const identifier = bnb.match(/[a-z]+/i);
   * const expression = identifier.and(bnb.str("()")).map(([first]) => first);
   * const statement = expression.and(bnb.str(";")).map(([first]) => first);
   * const block = statement.many0().wrap(bnb.str("{"), bnb.str("}"));
   * block.tryParse("{apple();banana();coconut();}")
   * // => ["apple", "banana", "coconut"];
   * ```
   */
  many0(): Parser<A[]> {
    return this.many1().or(ok([]));
  }

  /**
   * Parsers the current parser **one** or more times. See [[many0]] for more
   * details.
   */
  many1(): Parser<A[]> {
    return new Parser((context) => {
      const items: A[] = [];
      let result = this.action(context);
      while (result.isOK()) {
        items.push(result.value);
        context = context.withLocation(result.location);
        result = result.merge(this.action(context));
      }
      return result.merge(context.ok(context.location.index, items));
    });
  }

  /**
   * Returns a parser that parses zero or more times, separated by the separator
   * parser supplied. Useful for things like arrays, objects, argument lists,
   * etc.
   *
   * ```ts
   * const item = bnb.str("a");
   * const comma = bnb.str(",")
   * const list = item.sepBy0(comma);
   * list.tryParse("a,a,a"); // => ["a", "a", "a"]
   * ```
   */
  sepBy0<B>(separator: Parser<B>): Parser<A[]> {
    return this.sepBy1(separator).or(ok([]));
  }

  /**
   * Returns a parser that parses one or more times, separated by the separator
   * parser supplied. Useful for things parsing nonempty lists, such as a list
   * of interfaces implemented by a class.
   *
   * ```ts
   * const identifier = bnb.match(/[a-z]+/i);
   * const classDecl = bnb
   *   .str("class ")
   *   .and(identifier)
   *   .chain(([, name]) => {
   *     return bnb
   *       .str(" implements ")
   *       .and(identifier.sepBy1(bnb.str(", ")))
   *       .map(([, interfaces]) => {
   *         return {
   *           type: "Class",
   *           name: name,
   *           interfaces: interfaces,
   *         };
   *       });
   *   });
   * classDecl.tryParse("class A implements I, J, K");
   * // => { type: "Class", name: "A", interfaces: ["I", "J", "K"] }
   * ```
   */
  sepBy1<B>(separator: Parser<B>): Parser<A[]> {
    return this.chain((first) => {
      return separator
        .and(this)
        .map(([, value]) => value)
        .many0()
        .map((rest) => {
          return [first, ...rest];
        });
    });
  }

  /**
   * Returns a parser that parses the same content, but has a `type` field set
   * to "ParseNode", `name` field set to the `name` argument passed in, and
   * `start` and `end` fields containing [[SourceLocation]] objects describing
   * the `index,` `line`, and `column` where the content started and ended.
   *
   * This should be used heavily within your parser so that you can do proper
   * error reporting. You may also wish to keep this information available in
   * the runtime of your language for things like stack traces.
   *
   * This is just a convenience method built around [[location]]. Don't hesitate
   * to avoid this function and instead use [[thru]] call your own custom node
   * creation function that fits your domain better.
   *
   * Location `index` is 0-indexed and `line`/`column` information is 1-indexed.
   *
   * **Note:** The `end` location is _exclusive_ of the parse (one character further)
   *
   * @typeParam S the name of this node (e.g. Identifier or String or Number)
   *
   * ```ts
   * const identifier = bnb.match(/[a-z]+/i).node("Identifier");
   * identifier.tryParse("hello");
   * // => {
   * //   type: "ParseNode",
   * //   name: "Identifier",
   * //   value: "hello",
   * //   start: SourceLocation { index: 0, line: 1, column: 1 },
   * //   end: SourceLocation { index: 5, line: 1, column: 6 } }
   * // }
   * ```
   */
  node<S extends string>(name: S): Parser<ParseNode<S, A>> {
    return location.and(this).chain(([start, value]) => {
      return location.map((end) => {
        const type = "ParseNode";
        return { type, name, value, start, end } as const;
      });
    });
  }
}

/**
 * Result type from [[node]]. See [[node]] for more details.
 *
 * @typeParam S the node name (e.g. String or Number or Identifier)
 * @typeParam A the value of this node
 *
 * You should set up type aliases using this type to make your code more
 * readable:
 *
 * ```ts
 * type LispSymbol = bnb.ParseNode<"LispSymbol", string>;
 * type LispNumber = bnb.ParseNode<"LispNumber", number>;
 * type LispList = bnb.ParseNode<"LispList", LispExpr[]>;
 * type LispExpr = LispSymbol | LispNumber | LispList;
 * ```
 */
export interface ParseNode<S extends string, A> {
  type: "ParseNode";
  name: S;
  value: A;
  start: SourceLocation;
  end: SourceLocation;
}

// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/parsimmon/index.d.ts#L308
// Thanks to the DefinitelyTyped folks for this type magic here

/**
 * **This feature is experimental and may be removed.**
 * @ignore
 */
export type Rules<Spec> = {
  [P in keyof Spec]: (lang: Language<Spec>) => Parser<Spec[P]>;
};

/**
 * **This feature is experimental and may be removed.**
 * @ignore
 */
export type Language<Spec> = {
  [P in keyof Spec]: Parser<Spec[P]>;
};

/**
 * **This feature is experimental and may be removed.**
 * @ignore
 */
export function language<Spec>(rules: Rules<Spec>): Language<Spec> {
  const lang = {} as Language<Spec>;
  for (const key of Object.keys(rules)) {
    const k = key as keyof Spec;
    const f = () => rules[k](lang);
    lang[k] = lazy(f);
  }
  return lang;
}

/**
 * Parser that yields the current [[SourceLocation]], containing properties
 * `index`, `line` and `column`. Useful when used before and after a given
 * parser, so you can know the source range for highlighting errors. Used
 * internally by [[node]].
 *
 * ```ts
 * const identifier = location.chain((start) => {
 *   return bnb.match(/[a-z]+/i).chain((name) => {
 *     return location.map((end) => {
 *       return { type: "Identifier", name, start, end };
 *     });
 *   });
 * });
 * identifier.tryParse("abc");
 * // => {
 * //   type: "Identifier",
 * //   name: "abc",
 * //   start: SourceLocation { index: 0, line: 1, column: 1 },
 * //   end: SourceLocation { index: 2, line: 1, column: 3 }
 * // }
 * ```
 */
export const location = new Parser<SourceLocation>((context) => {
  return context.ok(context.location.index, context.location);
});

/**
 * Returns a parser that yields the given value and consumes no input. Usually
 * used as a fallback parser in case you want the option of parsing nothing at
 * all.
 *
 * ```ts
 * const sign = bnb.str("+").or(bnb.str("-")).or(bnb.of(""));
 * sign.tryParse("+"); // => "+"
 * sign.tryParse("-"); // => "-"
 * sign.tryParse("");  // => ""
 * ```
 */
export function ok<A>(value: A): Parser<A> {
  return new Parser((context) => {
    return context.ok(context.location.index, value);
  });
}

/**
 * Returns a parser that fails with the given messages and consumes no input.
 * Usually used in the `else` branch of a [[chain]] callback function.
 *
 * **Note:** Messages are are typically displayed as part of a comma separated
 * list of "expected" values, like "expected list, number, object", so it's best
 * to keep your failure messages limited to nouns. If you used a message like
 * "number too big" instead, then you might end up showing the user an error
 * message like "expected number too big" which doesn't make any sense at all.
 *
 * ```ts
 * const number = bnb.match(/[0-9]+/).chain(s => {
 *   const n = Number(s);
 *   if (Number.isFinite(n)) {
 *     return bnb.ok(n);
 *   } else {
 *     return bnb.fail(["smaller number"]);
 *   }
 * });
 *
 * number.tryParse("1984");
 * // => 1984
 *
 * number.tryParse("9".repeat(999));
 * // => error: expected smaller number
 * ```
 */
export function fail<A>(expected: string[]): Parser<A> {
  return new Parser((context) => {
    return context.fail(context.location.index, expected);
  });
}

/**
 * This parser succeeds if the input has already been fully parsed. Typically
 * you won't need to use this since [[parse]] already checks this for you. But
 * if your language uses newlines to terminate statements, you might want to
 * check for newlines **or** eof in case the text file doesn't end with a
 * trailing newline (many text editors omit this character).
 *
 * ```ts
 * const endline = bnb.match(/\r?\n/).or(bnb.eof);
 * const statement = bnb
 *   .match(/[a-z]+/i)
 *   .and(endline)
 *   .map(([first]) => first);
 * const file = statement.many0();
 * file.tryParse("A\nB\nC"); // => ["A", "B", "C"]
 * ```
 */
export const eof = new Parser<"<EOF>">((context) => {
  if (context.location.index < context.input.length) {
    return context.fail(context.location.index, ["<EOF>"]);
  }
  return context.ok(context.location.index, "<EOF>");
});

/**
 * Returns a parser that matches the exact text supplied. This is typically used
 * for things like parsing keywords (for, while, if, else, let...), or parsing
 * static characters such as `{`, `}`, `"`, `'`...
 *
 * @param string the string to match
 *
 * ```ts
 * const keywordWhile = bnb.str("while");
 * const paren = bnb.str("(").and(bnb.str(")"));
 * keywordWhile.tryParse("while"); // => "while"
 * paren.tryParse("()"); // => ["(", ")"]
 * ```
 */
export function str<A extends string>(string: A): Parser<A> {
  return new Parser<A>((context) => {
    const start = context.location.index;
    const end = start + string.length;
    if (context.input.slice(start, end) === string) {
      return context.ok(end, string);
    }
    return context.fail(start, [string]);
  });
}

/**
 * Returns a parser that matches the entire regular expression at the current
 * parser position. Currently only supports regular expressions with no flags or
 * just the "i" flag.
 *
 * @param regexp the regular expression to match
 *
 * **Note:** Do not use the `^` anchor at the beginning of your regular
 * expression. This internally uses sticky (/y) regular expressions with
 * `lastIndex` set to the current parsing index.
 *
 * **Note:** Capture groups `()` are not significant to this parser. The entire
 * match is returned regardless of any capture groups used.
 *
 * ```ts
 * const identifier = bnb.match(/[a-z_]+/i);
 * identifier.tryParse("internal_toString");
 * // => "internal_toString"
 *
 * const number = bnb.match(/[0-9]+/);
 * number.tryParse("404");
 * // => 404
 * ```
 */
export function match(regexp: RegExp): Parser<string> {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
  // TODO: Support other regexp flags
  if (regexp.flags !== "i" && regexp.flags !== "") {
    throw new Error("only the 'i' regexp flag is supported");
  }
  return new Parser((context) => {
    const flags = regexp.ignoreCase ? "iy" : "y";
    const sticky = new RegExp(regexp.source, flags);
    const start = context.location.index;
    sticky.lastIndex = start;
    const match = context.input.match(sticky);
    if (match) {
      const end = start + match[0].length;
      const string = context.input.slice(start, end);
      return context.ok(end, string);
    }
    return context.fail(start, [String(regexp)]);
  });
}

/**
 * Takes a callback that returns a parser. The callback is called at most once,
 * and only right when the parse action needs to happen.
 *
 * **Note:** This function exists so you can reference parsers that have not yet
 * been defined. Many grammars are recursive, but JavaScript variables are not,
 * so this is a workaround. Typically you will want to use `lazy` on parsers
 * that parse expressions or statements, with lots of [[or]] calls chained
 * together.
 *
 * **Note:** Recursive references can confuse TypeScript. Whenever you use
 * `lazy` you should manually supply the type parameter so that TypeScript
 * doesn't assume it's `any`.
 *
 * ```ts
 * type XExpr = XItem | XList;
 * type XItem = string;
 * type XList = XExpr[];
 * const expr: bnb.Parser<XExpr> = bnb.lazy(() => {
 *   return list.or(item);
 * });
 * const item: bnb.Parser<XItem> = bnb.match(/[a-z]+/i);
 * const list: bnb.Parser<XList> = expr
 *   .sepBy0(bnb.str(","))
 *   .wrap(bnb.str("["), bnb.str("]"));
 * expr.tryParse("[a,b,[c,d,[]],[[e]]]");
 * // => ["a", "b", ["c", "d", []], [["e"]]]
 * ```
 *
 * Must use `lazy` here in order to reference variables `item` and `list`
 * before they are defined. You could try to put `expr` at the end of the file,
 * but then `list` would reference `expr` before it's defined, so `list` would
 * have to be wrapped in `lazy` instead.
 */
export function lazy<A>(fn: () => Parser<A>): Parser<A> {
  const parser: Parser<A> = new Parser((context) => {
    parser.action = fn().action;
    return parser.action(context);
  });
  return parser;
}
