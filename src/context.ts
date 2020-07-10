import { SourceLocation } from "./source-location";
import { ActionResult, ActionOK, ActionFail } from "./action-result";

export class Context {
  readonly input: string;
  readonly location: SourceLocation;

  constructor(input: string, location: SourceLocation) {
    this.input = input;
    this.location = location;
  }

  withLocation(location: SourceLocation): Context {
    return new Context(this.input, location);
  }

  move(index: number): SourceLocation {
    const start = this.location.index;
    const end = index;
    const chunk = this.input.slice(start, end);
    return this.location.add(chunk);
  }

  ok<A>(index: number, value: A): ActionResult<A> {
    return new ActionOK(
      this.move(index),
      value,
      new SourceLocation(-1, -1, -1),
      []
    );
  }

  fail<A>(index: number, expected: readonly string[]): ActionResult<A> {
    return new ActionFail(this.move(index), expected);
  }
}
