import { SourceLocation } from "./source-location";

/**
 * Represents the result of a parser's action callback.
 *
 * Use the [[isOK]] method to check if the result was successful.
 */
export type ActionResult<A> = ActionOK<A> | ActionFail;

/**
 * Represents a successful result from a parser's action callback. This is made
 * automatically by calling [[context.ok]]. Make sure to use [[merge]] when
 * writing a custom parser that executes multiple parser actions.
 */
export class ActionOK<A> {
  location: SourceLocation;
  value: A;
  furthest: SourceLocation;
  expected: string[];

  /** @ignore */
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
   * Make sure to call this method with the next [[ActionResult]] you use in
   * order to properly keep track of error messages via `furthest` and
   * `expected`.
   *
   * ```ts
   * // NOTE: This is not the shortest way to write this parser,
   * // it's just an example of a custom parser that needs to call multiple
   * // other parsers.
   * function multiply(
   *   parser1: bnb.Parser<number>,
   *   parser2: bnb.Parser<number>
   * ): bnb.Parser<number> {
   *   return new bnb.Parser<number>((context) => {
   *     const result1 = parser1.action(context);
   *     if (!result1.isOK()) {
   *       return result1;
   *     }
   *     context = context.withLocation(result1.location);
   *     const result2 = result1.merge(parser2.action(context));
   *     if (!result2.isOK()) {
   *       return result2;
   *     }
   *     return context.ok(
   *       result2.location.index,
   *       result1.value * result2.value
   *     );
   *   });
   * }
   * ```
   */
  merge<B>(b: ActionResult<B>): ActionResult<B> {
    return merge(b, this);
  }
}

/**
 * Represents a successful result from a parser's action callback. This is made
 * automatically by calling [[context.ok]]. Make sure to use [[merge]] when
 * writing a custom parser that executes multiple parser actions.
 */
export class ActionFail {
  furthest: SourceLocation;
  expected: string[];

  /** @ignore */
  constructor(furthest: SourceLocation, expected: string[]) {
    this.furthest = furthest;
    this.expected = expected;
  }

  /** Returns false */
  isOK<A>(): this is ActionOK<A> {
    return false;
  }

  /**
   * Make sure to call this method with the next [[ActionResult]] you use in
   * order to properly keep track of error messages via `furthest` and
   * `expected`.
   *
   * ```ts
   * // NOTE: This is not the shortest way to write this parser,
   * // it's just an example of a custom parser that needs to call multiple
   * // other parsers.
   * function multiply(
   *   parser1: bnb.Parser<number>,
   *   parser2: bnb.Parser<number>
   * ): bnb.Parser<number> {
   *   return new bnb.Parser<number>((context) => {
   *     const result1 = parser1.action(context);
   *     if (!result1.isOK()) {
   *       return result1;
   *     }
   *     context = context.withLocation(result1.location);
   *     const result2 = result1.merge(parser2.action(context));
   *     if (!result2.isOK()) {
   *       return result2;
   *     }
   *     return context.ok(
   *       result2.location.index,
   *       result1.value * result2.value
   *     );
   *   });
   * }
   * ```
   */
  merge<B>(b: ActionResult<B>): ActionResult<B> {
    return merge(b, this);
  }
}

/** @ignore */
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

/** @ignore */
function union(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])].sort();
}
