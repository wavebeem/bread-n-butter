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
  parse(input: string): ParseOK<A> | ParseFail {
    const location = { index: 0, line: 1, column: 1 };
    const context = new Context({ input, location });
    const result = this.skip(eof).action(context);
    if (result.type === "ActionOK") {
      return {
        type: "ParseOK",
        value: result.value,
      };
    }
    return {
      type: "ParseFail",
      location: result.furthest,
      expected: result.expected,
    };
  }

  /**
   * Returns the parsed result or throws an error.
   */
  tryParse(input: string): A {
    const result = this.parse(input);
    if (result.type === "ParseOK") {
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
      if (a.type === "ActionFail") {
        return a;
      }
      context = context.moveTo(a.location);
      const b = context.merge(a, parserB.action(context));
      if (b.type === "ActionOK") {
        const value: [A, B] = [a.value, b.value];
        return context.merge(b, context.ok(b.location.index, value));
      }
      return b;
    });
  }

  /** Parse both and return the value of the first */
  skip<B>(parserB: Parser<B>): Parser<A> {
    return this.and(parserB).map(([a]) => a);
  }

  /** Parse both and return the value of the second */
  next<B>(parserB: Parser<B>): Parser<B> {
    return this.and(parserB).map(([, b]) => b);
  }

  /**
   * Try to parse using the current parser. If that fails, parse using the
   * second parser.
   */
  or<B>(parserB: Parser<B>): Parser<A | B> {
    return new Parser<A | B>((context) => {
      const a = this.action(context);
      if (a.type === "ActionOK") {
        return a;
      }
      return context.merge(a, parserB.action(context));
    });
  }

  /**
   * Parse using the current parser. If it succeeds, pass the value to the
   * callback function, which returns the next parser to use.
   */
  chain<B>(fn: (value: A) => Parser<B>): Parser<B> {
    return new Parser((context) => {
      const a = this.action(context);
      if (a.type === "ActionFail") {
        return a;
      }
      const parserB = fn(a.value);
      context = context.moveTo(a.location);
      return context.merge(a, parserB.action(context));
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
      if (result.type === "ActionOK") {
        return result;
      }
      return { type: "ActionFail", furthest: result.furthest, expected };
    });
  }

  /**
   * Wraps the current parser with before & after parsers.
   */
  wrap<B, C>(before: Parser<B>, after: Parser<C>): Parser<A> {
    return before.next(this).skip(after);
  }

  /**
   * Ignores content before and after the current parser, based on the supplied
   * parser.
   */
  trim<B>(beforeAndAfter: Parser<B>): Parser<A> {
    return this.wrap(beforeAndAfter, beforeAndAfter);
  }

  /**
   * Repeats the current parser between min and max times, yielding the results
   * in an array.
   */
  repeat(min = 0, max = Infinity): Parser<A[]> {
    if (!isRangeValid(min, max)) {
      throw new Error(`repeat: bad range (${min} to ${max})`);
    }
    if (min === 0) {
      return this.repeat(1, max).or(ok([]));
    }
    return new Parser((context) => {
      const items: A[] = [];
      let result = this.action(context);
      if (result.type === "ActionFail") {
        return result;
      }
      while (result.type === "ActionOK" && items.length < max) {
        items.push(result.value);
        if (result.location.index === context.location.index) {
          throw new Error(
            "infinite loop detected; don't call .repeat() with parsers that can accept zero characters"
          );
        }
        context = context.moveTo(result.location);
        result = context.merge(result, this.action(context));
      }
      if (result.type === "ActionFail" && items.length < min) {
        return result;
      }
      return context.merge(result, context.ok(context.location.index, items));
    });
  }

  /**
   * Returns a parser that parses between min and max times, separated by the separator
   * parser supplied.
   */
  sepBy<B>(separator: Parser<B>, min = 0, max = Infinity): Parser<A[]> {
    if (!isRangeValid(min, max)) {
      throw new Error(`sepBy: bad range (${min} to ${max})`);
    }
    if (min === 0) {
      return this.sepBy(separator, 1, max).or(ok([]));
    }
    // We also know that min=1 due to previous checks, so we can skip the call
    // to `repeat` here
    if (max === 1) {
      return this.map((x) => [x]);
    }
    return this.chain((first) => {
      return separator
        .next(this)
        .repeat(min - 1, max - 1)
        .map((rest) => {
          return [first, ...rest];
        });
    });
  }

  /**
   * Returns a parser that adds name and start/end location metadata.
   */
  node<S extends string>(name: S): Parser<ParseNode<S, A>> {
    return all(location, this, location).map(([start, value, end]) => {
      const type = "ParseNode";
      return { type, name, value, start, end } as const;
    });
  }
}

function isRangeValid(min: number, max: number): boolean {
  return (
    min <= max &&
    min >= 0 &&
    max >= 0 &&
    Number.isInteger(min) &&
    min !== Infinity &&
    (Number.isInteger(max) || max === Infinity)
  );
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
  const sticky = new RegExp(regexp.source, regexp.flags + "y");
  return new Parser((context) => {
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

/** A tuple of parsers */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ManyParsers<A extends any[]> = {
  [P in keyof A]: Parser<A[P]>;
};

/** Parse all items, returning their values in the same order. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function all<A extends any[]>(...parsers: ManyParsers<A>): Parser<A> {
  // TODO: This could be optimized with a custom parser, but I should probably add
  // benchmarking first to see if it really matters enough to rewrite it
  return parsers.reduce((acc, p) => {
    return acc.chain((array) => {
      return p.map((value) => {
        return [...array, value];
      });
    });
  }, ok([]));
}

/** Parse using the parsers given, returning the first one that succeeds. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function choice<Parsers extends Parser<any>[]>(
  ...parsers: Parsers
): Parser<ReturnType<Parsers[number]["tryParse"]>> {
  // TODO: This could be optimized with a custom parser, but I should probably add
  // benchmarking first to see if it really matters enough to rewrite it
  return parsers.reduce((acc, p) => {
    return acc.or(p);
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
export interface SourceLocation {
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

/**
 * Represents the result of a parser's action callback.
 */
export type ActionResult<A> = ActionOK<A> | ActionFail;

/**
 * Represents a successful result from a parser's action callback. This is made
 * automatically by calling `context.ok`. Make sure to use `context.merge`
 * when writing a custom parser that executes multiple parser actions.
 */
export interface ActionOK<A> {
  type: "ActionOK";
  location: SourceLocation;
  value: A;
  furthest: SourceLocation;
  expected: string[];
}

/**
 * Represents a successful result from a parser's action callback. This is made
 * automatically by calling `context.ok`. Make sure to use `context.merge`
 * when writing a custom parser that executes multiple parser actions.
 */
export interface ActionFail {
  type: "ActionFail";
  furthest: SourceLocation;
  expected: string[];
}

function union(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}

/**
 * Represents the current parsing context.
 */
class Context {
  /** the string being parsed */
  input: string;
  /** the current parse location */
  location: SourceLocation;

  constructor(options: { input: string; location: SourceLocation }) {
    this.input = options.input;
    this.location = options.location;
  }

  /**
   * Returns a new context with the supplied location and the current input.
   */
  moveTo(location: SourceLocation): Context {
    return new Context({
      input: this.input,
      location,
    });
  }

  private _internal_move(index: number): SourceLocation {
    if (index === this.location.index) {
      return this.location;
    }
    const start = this.location.index;
    const end = index;
    const chunk = this.input.slice(start, end);
    let { line, column } = this.location;
    for (const ch of chunk) {
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
   * Represents a successful parse ending before the given `index`, with the
   * specified `value`.
   */
  ok<A>(index: number, value: A): ActionResult<A> {
    return {
      type: "ActionOK",
      value,
      location: this._internal_move(index),
      furthest: { index: -1, line: -1, column: -1 },
      expected: [],
    };
  }

  /**
   * Represents a failed parse starting at the given `index`, with the specified
   * list `expected` messages (note: this list usually only has one item).
   */
  fail<A>(index: number, expected: string[]): ActionResult<A> {
    return {
      type: "ActionFail",
      furthest: this._internal_move(index),
      expected,
    };
  }

  /**
   * Merge two sequential `ActionResult`s so that the `expected` and location data
   * is preserved correctly.
   */
  merge<A, B>(a: ActionResult<A>, b: ActionResult<B>): ActionResult<B> {
    if (b.furthest.index > a.furthest.index) {
      return b;
    }
    const expected =
      b.furthest.index === a.furthest.index
        ? union(a.expected, b.expected)
        : a.expected;
    if (b.type === "ActionOK") {
      return {
        type: "ActionOK",
        location: b.location,
        value: b.value,
        furthest: a.furthest,
        expected,
      };
    }
    return {
      type: "ActionFail",
      furthest: a.furthest,
      expected,
    };
  }
}

/**
 * Represents a successful parse result.
 */
export interface ParseOK<A> {
  type: "ParseOK";
  /** The parsed value */
  value: A;
}

/**
 * Represents a failed parse result, where it failed, and what types of
 * values were expected at the point of failure.
 */
export interface ParseFail {
  type: "ParseFail";
  /** The input location where the parse failed */
  location: SourceLocation;
  /** List of expected values at the location the parse failed */
  expected: string[];
}
