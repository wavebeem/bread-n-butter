import { SourceLocation } from "./source-location";

export type ActionResult<A> = ActionOK<A> | ActionFail;

export class ActionOK<A> {
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

  isOK(): this is ActionOK<A> {
    return true;
  }

  merge<B>(b: ActionResult<B>): ActionResult<B> {
    return merge(b, this);
  }
}

export class ActionFail {
  furthest: SourceLocation;
  expected: string[];

  constructor(furthest: SourceLocation, expected: string[]) {
    this.furthest = furthest;
    this.expected = expected;
  }

  isOK<A>(): this is ActionOK<A> {
    return false;
  }

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
