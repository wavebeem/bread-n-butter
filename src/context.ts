import { SourceLocation } from "./source-location";
import { ActionResult, ActionOK, ActionFail } from "./action-result";

/**
 * Represents the current parsing context.
 */
export class Context {
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
    return this.location.add(chunk);
  }

  /**
   * Represents a successful parse ending before the given `index`, with  the
   * specified `value`.
   */
  ok<A>(index: number, value: A): ActionResult<A> {
    return new ActionOK(
      this.move(index),
      value,
      new SourceLocation(-1, -1, -1),
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
