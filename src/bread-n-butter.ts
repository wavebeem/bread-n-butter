import { ActionResult } from "./action-result";
import { Context } from "./context";
import { ParseFail, ParseOK, ParseResult } from "./parse-result";
import { SourceLocation } from "./source-location";

export class Parser<A> {
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

  and<B>(parserB: Parser<B>): Parser<readonly [A, B]> {
    return new Parser((context) => {
      const a = this.action(context);
      if (!a.isOK()) {
        return a;
      }
      const b = a.merge(parserB.action(context.withLocation(a.location)));
      if (b.isOK()) {
        const value = [a.value, b.value] as const;
        return b.merge(context.ok(b.location.index, value));
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

  map<B>(fn: (value: A) => B): Parser<B> {
    return this.chain((a) => {
      return of(fn(a));
    });
  }
}

export function of<A>(value: A): Parser<A> {
  return new Parser((context) => {
    return context.ok(context.location.index, value);
  });
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
