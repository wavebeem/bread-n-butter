import { SourceLocation } from "./source-location";

/**
 * Represents the result of calling a parse action.
 *
 * Either a ParseOK<A> or a ParseFail. To check if the parse result is OK, use
 * the `isOK()` method.
 */
export type ParseResult<A> = ParseOK<A> | ParseFail;

/**
 * Represents a successful parse action result.
 *
 * @typeParam A the type of the value parsed
 */
export class ParseOK<A> {
  /** The parsed value */
  value: A;

  /** @ignore */
  constructor(value: A) {
    this.value = value;
  }

  /** Returns true */
  isOK(): this is ParseOK<A> {
    return true;
  }
}

/**
 * Represents a failed parse action result, where it failed, and what types of
 * values were expected at the point of failure.
 */
export class ParseFail {
  /** The input location where the parse failed */
  location: SourceLocation;
  /** List of expected values at the location the parse failed */
  expected: string[];

  /** @ignore */
  constructor(location: SourceLocation, expected: string[]) {
    this.location = location;
    this.expected = expected;
  }

  /** Returns false */
  isOK<A>(): this is ParseOK<A> {
    return false;
  }
}
