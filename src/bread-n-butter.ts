import { ActionResult, ActionFail } from "./action-result";
import { Context } from "./context";
import { ParseFail, ParseOK, ParseResult } from "./parse-result";
import { SourceLocation } from "./source-location";

export class Parser<A> {
  readonly action: (context: Context) => ActionResult<A>;

  /**
   * Creates a new custom parser that performs the given parsing action.
   * **Note:** That use of this constructor is an advanced feature and not
   * needed for most parsers.
   *
   * ```ts
   * import * as bnb from "bread-n-butter";
   *
   * const number = new bnb.Parser((context) => {
   *   const start = context.location.index;
   *   const end = context.location.index + 2;
   *   if (context.input.slice(start, end) === "AA") {
   *     // Return how far we got, and what value we found
   *     return context.ok(end, "AA");
   *   }
   *   // Return how far we got, and what value we were looking for
   *   return context.fail(start, "AA");
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
   * not.
   *
   * ```ts
   * import * as bnb from "bread-n-butter";
   *
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
   * Combines two parsers one after the other, yielding the results of both in
   * an array.
   *
   * ```ts
   * import * as bnb from "bread-n-butter";
   *
   * const a = bnb.str("a");
   * const b = bnb.str("b");
   * const ab = a.and(b);
   * const result = ab.parse("ab");
   *
   * result.value;
   * // => ["a", "b"]
   * ```
   */
  and<B>(parserB: Parser<B>): Parser<readonly [A, B]> {
    return new Parser((context) => {
      const a = this.action(context);
      if (!a.isOK()) {
        return a;
      }
      const b = a.merge(parserB.action(context.withLocation(a.location)));
      if (b.isOK()) {
        const value = [a.value, b.value] as const;
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
   * ```ts
   * import * as bnb from "bread-n-butter";
   *
   * const a = bnb.str("a");
   * const b = bnb.str("b");
   * const ab = a.or(b);
   *
   * ab.parse("a").value;
   * // => "a"
   *
   * ab.parse("b").value;
   * // => "b"
   * ```
   *
   * **Tip:** You can also use this to implement optional parsers:
   *
   * ```ts
   * import * as bnb from "bread-n-butter";
   *
   * const aMaybe = bnb.str("a").or(bnb.ok(null));
   *
   * aMaybe.parse("a").value;
   * // => "a"
   *
   * aMaybe.parse("").value;
   * // => null
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
   * import * as bnb from "bread-n-butter";
   *
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
   *
   * balance.parse("()").value;
   * // => ["(", ")"]
   *
   * balance.parse("[]").value;
   * // => ["[", "]"]
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
   * import * as bnb from "bread-n-butter";
   *
   * const num = bnb.match(/[0-9]+/).map(str => Number(str));
   *
   * num.parse("1312").value;
   * // => 1312
   *
   * const yes = bnb.str("yes").map(() => true);
   * const no = bnb.str("no").map(() => false);
   * const bool = yes.or(no);
   *
   * bool.parse("no").value;
   * // => false
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
   * import * as bnb from "bread-n-butter";
   *
   * function paren(parser) {
   *   return parser.wrap(bnb.str("("), bnb.str(")"));
   * }
   *
   * const paren1 = bnb.str("a").thru(paren).desc("(a)");
   * // --- vs ---
   * const paren2 = paren(bnb.str("a")).desc("(a)");
   *
   * paren1.parse("(a)").value;
   * // => "a"
   *
   * paren2.parse("(a)").value;
   * // => "a"
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
   * import * as bnb from "bread-n-butter";
   *
   * const jsonNumber1 = bnb
   *   .match(/-?(0|[1-9][0-9]*)([.][0-9]+)?([eE][+-]?[0-9]+)?/)
   *   .map(Number)
   *
   * jsonNumber1.parse("x").expected;
   * // => ["/-?(0|[1-9][0-9]*)([.][0-9]+)?([eE][+-]?[0-9]+)?/"]
   *
   * const jsonNumber2 = jsonNumber1.desc("number");
   *
   * jsonNumber2.parse("x").expected;
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
   * import * as bnb from "bread-n-butter";
   *
   * const item = bnb.str("a");
   * const comma = bnb.str(",")
   * const lbrack = bnb.str("[");
   * const rbrack = bnb.str("]");
   * const list = item.sepBy0(comma).wrap(lbrack, rbrack);
   *
   * list.parse("[a,a,a]").value;
   * // => ["a", "a", "a"]
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
   * import * as bnb from "bread-n-butter";
   *
   * const whitespace = bnb.match(/\s+/);
   * const optWhitespace = whitespace.or(bnb.ok(""));
   * const item = bnb.str("a").trim(optWhitespace);
   *
   * item.parse("     a ").value;
   * // => "a"
   * ```
   *
   * **Note:** Whitespace parsers typically also parse code comments, since
   * those are generally ignored when parsing, just like whitespace.
   */
  trim<B>(beforeAndAfter: Parser<B>): Parser<A> {
    return this.wrap(beforeAndAfter, beforeAndAfter);
  }

  many0(): Parser<readonly A[]> {
    return this.many1().or(ok([]));
  }

  many1(): Parser<readonly A[]> {
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
   * import * as bnb from "bread-n-butter";
   *
   * const item = bnb.str("a");
   * const comma = bnb.str(",")
   * const list = item.sepBy0(comma);
   *
   * list.parse("a,a,a").value;
   * // => ["a", "a", "a"]
   * ```
   */
  sepBy0<B>(separator: Parser<B>): Parser<readonly A[]> {
    return this.sepBy1(separator).or(ok([]));
  }

  sepBy1<B>(separator: Parser<B>): Parser<readonly A[]> {
    return this.chain((first) => {
      return separator
        .and(this)
        .map(([, value]) => value)
        .many0()
        .map((rest) => {
          return [first, ...rest] as const;
        });
    });
  }

  node<S extends string>(name: S): Parser<ParseNode<S, A>> {
    return location.and(this).chain(([start, value]) => {
      return location.map((end) => {
        const type = "ParseNode";
        return { type, name, value, start, end } as const;
      });
    });
  }
}

export interface ParseNode<S extends string, A> {
  type: "ParseNode";
  name: S;
  value: A;
  start: SourceLocation;
  end: SourceLocation;
}

// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/parsimmon/index.d.ts#L308
// Thanks to the DefinitelyTyped folks for this type magic here
export type Rules<Spec> = {
  [P in keyof Spec]: (lang: Language<Spec>) => Parser<Spec[P]>;
};

export type Language<Spec> = {
  [P in keyof Spec]: Parser<Spec[P]>;
};

export function language<Spec>(rules: Rules<Spec>): Language<Spec> {
  const lang = {} as Language<Spec>;
  for (const key of Object.keys(rules)) {
    const k = key as keyof Spec;
    const f = () => rules[k](lang);
    lang[k] = lazy(f);
  }
  return lang;
}

export const location = new Parser<SourceLocation>((context) => {
  return context.ok(context.location.index, context.location);
});

export function ok<A>(value: A): Parser<A> {
  return new Parser((context) => {
    return context.ok(context.location.index, value);
  });
}

export function fail<A>(expected: readonly string[]): Parser<A> {
  return new Parser((context) => {
    return context.fail(context.location.index, expected);
  });
}

export const eof = new Parser<"<EOF>">((context) => {
  if (context.location.index < context.input.length) {
    return context.fail(context.location.index, ["<EOF>"]);
  }
  return context.ok(context.location.index, "<EOF>");
});

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

export function match(regexp: RegExp): Parser<string> {
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

export function lazy<A>(fn: () => Parser<A>): Parser<A> {
  let action: ((context: Context) => ActionResult<A>) | undefined;
  return new Parser(function (context) {
    if (!action) {
      action = fn().action;
    }
    return action(context);
  });
}
