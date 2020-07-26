/**
 * Represents a parsing action; typically not created directly via `new`.
 */
export class Parser<A> {
  /**
   * The parsing action. Takes a parsing Context and returns an ActionResult
   * representing success or failure.
   */
  action: (context: Context) => ActionResult<A>;

  /**
   * Creates a new custom parser that performs the given parsing action.
   */
  constructor(action: (context: Context) => ActionResult<A>) {
    this.action = action;
  }

  /**
   * Returns a parse result with either the value or error information.
   */
  parse(input: string): ParseResult<A> {
    const location = { index: 0, line: 1, column: 1 };
    const context = new Context(input, location);
    const result = this.and(eof).action(context);
    if (result.isOK()) {
      return new ParseOK(result.value[0]);
    }
    return new ParseFail(result.furthest, result.expected);
  }

  /**
   * Returns the parsed result or throws an error.
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
   * callback function, which returns the next parser to use.
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
   */
  map<B>(fn: (value: A) => B): Parser<B> {
    return this.chain((a) => {
      return ok(fn(a));
    });
  }

  /**
   * Returns the callback called with the parser.
   */
  thru<B>(fn: (parser: this) => B): B {
    return fn(this);
  }

  /**
   * Returns a parser which parses the same value, but discards other error
   * messages, using the ones supplied instead.
   */
  desc(expected: string[]): Parser<A> {
    return new Parser((context) => {
      const result = this.action(context);
      if (result.isOK()) {
        return result;
      }
      return new ActionFail(result.furthest, expected);
    });
  }

  /**
   * Wraps the current parser with before & after parsers.
   */
  wrap<B, C>(before: Parser<B>, after: Parser<C>): Parser<A> {
    return before.and(this).chain(([, value]) => {
      return after.map(() => value);
    });
  }

  /**
   * Ignores content before and after the current parser, based on the supplied
   * parser.
   */
  trim<B>(beforeAndAfter: Parser<B>): Parser<A> {
    return this.wrap(beforeAndAfter, beforeAndAfter);
  }

  /**
   * Repeats the current parser zero or more times, yielding the results in an
   * array.
   */
  many0(): Parser<A[]> {
    return this.many1().or(ok([]));
  }

  /**
   * Parsers the current parser **one** or more times. See `many0` for more
   * details.
   */
  many1(): Parser<A[]> {
    return new Parser((context) => {
      const items: A[] = [];
      let result = this.action(context);
      while (result.isOK()) {
        items.push(result.value);
        if (context.location.index === result.location.index) {
          throw new Error(
            "infinite loop detected; don't call many0 or many1 with parsers that can accept zero characters"
          );
        }
        context = context.withLocation(result.location);
        result = result.merge(this.action(context));
      }
      return result.merge(context.ok(context.location.index, items));
    });
  }

  /**
   * Returns a parser that parses zero or more times, separated by the separator
   * parser supplied.
   */
  sepBy0<B>(separator: Parser<B>): Parser<A[]> {
    return this.sepBy1(separator).or(ok([]));
  }

  /**
   * Returns a parser that parses one or more times, separated by the separator
   * parser supplied.
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
   * Returns a parser that adds name and start/end location metadata.
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
 * Result type from `node`. See `node` for more details.
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
 * Parser that yields the current `SourceLocation`, containing properties
 * `index`, `line` and `column`.
 */
export const location = new Parser<SourceLocation>((context) => {
  return context.ok(context.location.index, context.location);
});

/**
 * Returns a parser that yields the given value and consumes no input.
 */
export function ok<A>(value: A): Parser<A> {
  return new Parser((context) => {
    return context.ok(context.location.index, value);
  });
}

/**
 * Returns a parser that fails with the given messages and consumes no input.
 */
export function fail<A>(expected: string[]): Parser<A> {
  return new Parser((context) => {
    return context.fail(context.location.index, expected);
  });
}

/**
 * This parser succeeds if the input has already been fully parsed.
 */
export const eof = new Parser<"<EOF>">((context) => {
  if (context.location.index < context.input.length) {
    return context.fail(context.location.index, ["<EOF>"]);
  }
  return context.ok(context.location.index, "<EOF>");
});

/** Returns a parser that matches the exact text supplied. */
export function text<A extends string>(string: A): Parser<A> {
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
 * parser position.
 */
export function match(regexp: RegExp): Parser<string> {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
  // TODO: Support other regexp flags
  for (const flag of regexp.flags) {
    switch (flag) {
      case "i": // ignoreCase
      case "s": // dotAll
      case "m": // multiline
      case "u": // unicode
        continue;
      default:
        throw new Error("only the regexp flags 'imsu' are supported");
    }
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
 * Takes a lazily invoked callback that returns a parser, so you can create
 * recursive parsers.
 */
export function lazy<A>(fn: () => Parser<A>): Parser<A> {
  // NOTE: This parsing action overwrites itself on the specified parser. We're
  // assuming that the same parser won't be returned to multiple `lazy` calls. I
  // never heard of such a thing happening in Parsimmon, and it doesn't seem
  // likely to happen here either. I assume this is faster than using variable
  // closure and an `if`-statement here, but I honestly don't know.
  const parser: Parser<A> = new Parser((context) => {
    parser.action = fn().action;
    return parser.action(context);
  });
  return parser;
}

/**
 * Represents a location in the input (source code). Keeps track of `index` (for
 * use with `.slice` and such), as well as `line` and `column` for displaying to
 * users.
 */
interface SourceLocation {
  /** The string index into the input (e.g. for use with `.slice`) */
  index: number;
  /**
   * The line number for error reporting. Only the character `\n` is used to
   * signify the beginning of a new line.
   */
  line: number;
  /**
   * The column number for error reporting.
   */
  column: number;
}

function sourceLocationAddChunk(
  location: SourceLocation,
  chunk: string
): SourceLocation {
  let { index, line, column } = location;
  for (const ch of chunk) {
    // JavaScript strings measure `length` in terms of 16-bit numbers, rather
    // than Unicode code points, so sometimes each "character" can have a
    // length bigger than 1, therefore we have to add the "length" of the
    // character here rather than just using `++` to increment the index.
    index += ch.length;
    if (ch === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { index, line, column };
}

/**
 * Represents the result of a parser's action callback.
 *
 * Use the `isOK` method to check if the result was successful.
 */
type ActionResult<A> = ActionOK<A> | ActionFail;

/**
 * Represents a successful result from a parser's action callback. This is made
 * automatically by calling `context.ok`. Make sure to use `merge` when writing
 * a custom parser that executes multiple parser actions.
 */
class ActionOK<A> {
  location: SourceLocation;
  value: A;
  furthest: SourceLocation;
  expected: string[];

  constructor(
    location: SourceLocation,
    value: A,
    furthest: SourceLocation,
    expected: string[]
  ) {
    this.location = location;
    this.value = value;
    this.furthest = furthest;
    this.expected = expected;
  }

  /** Returns true */
  isOK(): this is ActionOK<A> {
    return true;
  }

  /**
   * Make sure to call this method with the next `ActionResult` you use in order
   * to properly keep track of error messages via `furthest` and `expected`.
   */
  merge<B>(b: ActionResult<B>): ActionResult<B> {
    return merge(b, this);
  }
}

/**
 * Represents a successful result from a parser's action callback. This is made
 * automatically by calling `context.ok`. Make sure to use `merge` when writing
 * a custom parser that executes multiple parser actions.
 */
class ActionFail {
  furthest: SourceLocation;
  expected: string[];

  constructor(furthest: SourceLocation, expected: string[]) {
    this.furthest = furthest;
    this.expected = expected;
  }

  /** Returns false */
  isOK<A>(): this is ActionOK<A> {
    return false;
  }

  /**
   * Make sure to call this method with the next `ActionResult` you use in order
   * to properly keep track of error messages via `furthest` and `expected`.
   *
   */
  merge<B>(b: ActionResult<B>): ActionResult<B> {
    return merge(b, this);
  }
}

function merge<A, B>(a: ActionResult<A>, b: ActionResult<B>): ActionResult<A> {
  if (a.furthest.index > b.furthest.index) {
    return a;
  }
  const expected =
    a.furthest.index === b.furthest.index
      ? union(a.expected, b.expected)
      : b.expected;
  if (a.isOK()) {
    return new ActionOK(a.location, a.value, b.furthest, expected);
  }
  return new ActionFail(b.furthest, expected);
}

function union(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])].sort();
}

/**
 * Represents the current parsing context.
 */
class Context {
  /** the string being parsed */
  input: string;
  /** the current parse location */
  location: SourceLocation;

  constructor(input: string, location: SourceLocation) {
    this.input = input;
    this.location = location;
  }

  /**
   * Returns a new context with the supplied location and the current input.
   */
  withLocation(location: SourceLocation): Context {
    return new Context(this.input, location);
  }

  move(index: number): SourceLocation {
    if (index === this.location.index) {
      return this.location;
    }
    const start = this.location.index;
    const end = index;
    const chunk = this.input.slice(start, end);
    return sourceLocationAddChunk(this.location, chunk);
  }

  /**
   * Represents a successful parse ending before the given `index`, with  the
   * specified `value`.
   */
  ok<A>(index: number, value: A): ActionResult<A> {
    return new ActionOK(
      this.move(index),
      value,
      { index: -1, line: -1, column: -1 },
      []
    );
  }

  /**
   * Represents a failed parse starting at the given `index`, with the specified
   * list `expected` messages (note: this list is often length one).
   */
  fail<A>(index: number, expected: string[]): ActionResult<A> {
    return new ActionFail(this.move(index), expected);
  }
}

/**
 * Represents the result of calling a parse.
 *
 * Either a ParseOK<A> or a ParseFail. To check if the parse result is OK, use
 * the `isOK()` method.
 */
type ParseResult<A> = ParseOK<A> | ParseFail;

/**
 * Represents a successful parse result.
 *
 * @typeParam A the type of the value parsed
 */
class ParseOK<A> {
  /** The parsed value */
  value: A;

  constructor(value: A) {
    this.value = value;
  }

  /** Returns true */
  isOK(): this is ParseOK<A> {
    return true;
  }
}

/**
 * Represents a failed parse result, where it failed, and what types of
 * values were expected at the point of failure.
 */
class ParseFail {
  /** The input location where the parse failed */
  location: SourceLocation;
  /** List of expected values at the location the parse failed */
  expected: string[];

  constructor(location: SourceLocation, expected: string[]) {
    this.location = location;
    this.expected = expected;
  }

  /** Returns false */
  isOK<A>(): this is ParseOK<A> {
    return false;
  }
}
