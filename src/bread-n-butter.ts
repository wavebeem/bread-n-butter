class Parser<A> {
  readonly action: (context: Context) => ActionResult<A>;

  constructor(action: (context: Context) => ActionResult<A>) {
    this.action = action;
  }

  parse(input: string): A {
    const location = new SourceLocation(0, 1, 1);
    const context = new Context(input, location);
    const result = this.andThen(eof).action(context);
    if (result.isOK()) {
      return result.value[0];
    }
    console.log(result);
    throw new Error("TODO: Error");
  }

  andThen<B>(parserB: Parser<B>): Parser<readonly [A, B]> {
    return new Parser((context) => {
      const a = this.action(context);
      if (!a.isOK()) {
        return a;
      }
      const b = parserB.action(context.withLocation(a.location));
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
      return a.merge(parserB.action(context));
    });
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

  merge<B>(result: ActionResult<B>): ActionResult<A | B> {
    if (result.isOK()) {
      return result;
    }
    if (this.furthest.index > result.furthest.index) {
      return this;
    }
    const expected = union(this.expected, result.expected);
    return new ActionOK(this.location, this.value, result.furthest, expected);
  }
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

  merge<A>(result: ActionResult<A>): ActionResult<A> {
    if (result.isOK()) {
      return result;
    }
    if (this.furthest.index > result.furthest.index) {
      return this;
    }
    const expected = union(this.expected, result.expected);
    return new ActionFail(this.furthest, expected);
  }
}

const eof = new Parser<"<EOF>">((context) => {
  if (context.location.index < context.input.length) {
    return context.fail(context.location.index, ["<EOF>"]);
  }
  return context.ok(context.location.index, "<EOF>");
});

function str<A extends string>(string: A): Parser<A> {
  return new Parser<A>((context) => {
    const start = context.location.index;
    const end = start + string.length;
    if (context.input.slice(start, end) === string) {
      return context.ok(end, string);
    }
    return context.fail(start, [string]);
  });
}

const a = str("a");
const b = str("b");
const ab = a.andThen(b);
const abOrA = ab.or(a);
console.log(abOrA.parse("a"));
console.log(abOrA.parse("ab"));
console.log(abOrA.parse("aa"));
