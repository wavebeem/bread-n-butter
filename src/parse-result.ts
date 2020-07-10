import { SourceLocation } from "./source-location";

export type ParseResult<A> = ParseOK<A> | ParseFail;

export class ParseOK<A> {
  readonly value: A;

  constructor(value: A) {
    this.value = value;
  }

  isOK(): this is ParseOK<A> {
    return true;
  }
}

export class ParseFail {
  // TODO: Possibly yoink the properties off location and put them straight on
  // this class so it's easier to look at the object?
  readonly location: SourceLocation;
  readonly expected: readonly string[];

  constructor(location: SourceLocation, expected: readonly string[]) {
    this.location = location;
    this.expected = expected;
  }

  isOK<A>(): this is ParseOK<A> {
    return false;
  }
}
