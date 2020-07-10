class Parser<A> {
  readonly action: (context: Context) => ActionResult<A>;

  constructor(action: (context: Context) => ActionResult<A>) {
    this.action = action;
  }

  parse(input: string): ParseResult<A> {
    const location = new SourceLocation(0, 1, 1);
    const context = new Context(input, location);
    const result = this.and(eof).action(context);
    if (result.isOK()) {
      return new ParseOK(result.value[0]);
    }
    return new ParseFail(result.furthest, result.expected);
  }

  // TODO: This looks really messy, but I think it works?
  and<B>(parserB: Parser<B>): Parser<readonly [A, B]> {
    return new Parser((context) => {
      const a = this.action(context);
      if (!a.isOK()) {
        return a;
      }
      const b = merge(parserB.action(context.withLocation(a.location)), a);
      if (b.isOK()) {
        const value = [a.value, b.value] as const;
        return new ActionOK(b.location, value, b.furthest, b.expected);
      }
      return b;
    });
  }

  or<B>(parserB: Parser<B>): Parser<A | B> {
    return new Parser<A | B>((context) => {
      const a = this.action(context);
      if (a.isOK()) {
        return a;
      }
      return merge(parserB.action(context), a);
    });
  }
}

type ParseResult<A> = ParseOK<A> | ParseFail;

class ParseOK<A> {
  readonly value: A;

  constructor(value: A) {
    this.value = value;
  }

  isOK(): this is ParseOK<A> {
    return true;
  }
}

class ParseFail {
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

class Context {
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

class SourceLocation {
  readonly index: number;
  readonly line: number;
  readonly column: number;

  constructor(index: number, line: number, column: number) {
    this.index = index;
    this.line = line;
    this.column = column;
  }

  add(chunk: string): SourceLocation {
    let { index, line, column } = this;
    for (const ch of chunk) {
      index++;
      if (ch === "\n") {
        line++;
        column = 1;
      } else {
        column++;
      }
    }
    return new SourceLocation(index, line, column);
  }
}

function union(a: readonly string[], b: readonly string[]): readonly string[] {
  return [...new Set([...a, ...b])].sort();
}

type ActionResult<A> = ActionOK<A> | ActionFail;

class ActionOK<A> {
  readonly location: SourceLocation;
  readonly value: A;
  readonly furthest: SourceLocation;
  readonly expected: readonly string[];

  constructor(
    location: SourceLocation,
    value: A,
    furthest: SourceLocation,
    expected: readonly string[]
  ) {
    this.location = location;
    this.value = value;
    this.furthest = furthest;
    this.expected = expected;
  }

  isOK(): this is ActionOK<A> {
    return true;
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

class ActionFail {
  readonly furthest: SourceLocation;
  readonly expected: readonly string[];

  constructor(furthest: SourceLocation, expected: readonly string[]) {
    this.furthest = furthest;
    this.expected = expected;
  }

  isOK<A>(): this is ActionOK<A> {
    return false;
  }
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
