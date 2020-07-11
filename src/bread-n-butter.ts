import { ActionResult, ActionFail } from "./action-result";
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
      return ok(fn(a));
    });
  }

  thru<B>(fn: (parser: this) => B): B {
    return fn(this);
  }

  desc(name: string): Parser<A> {
    return new Parser((context) => {
      const result = this.action(context);
      if (result.isOK()) {
        return result;
      }
      return new ActionFail(result.furthest, [name]);
    });
  }

  wrap<B, C>(before: Parser<B>, after: Parser<C>): Parser<A> {
    return before.and(this).chain(([, value]) => {
      return after.map(() => value);
    });
  }

  trim<B>(beforeAndAfter: Parser<B>): Parser<A> {
    return this.wrap(beforeAndAfter, beforeAndAfter);
  }

  many0(): Parser<readonly A[]> {
    return this.many1().or(ok([]));
  }

  many1(): Parser<readonly A[]> {
    return new Parser((context) => {
      const items: A[] = [];
      let result = this.action(context);
      while (result.isOK()) {
        items.push(result.value);
        context = context.withLocation(result.location);
        result = result.merge(this.action(context));
      }
      return result.merge(context.ok(context.location.index, items));
    });
  }

  separatedBy0<B>(separator: Parser<B>): Parser<readonly A[]> {
    return this.separatedBy1(separator).or(ok([]));
  }

  separatedBy1<B>(separator: Parser<B>): Parser<readonly A[]> {
    return this.chain((first) => {
      return separator
        .and(this)
        .map(([, value]) => value)
        .many0()
        .map((rest) => {
          return [first, ...rest] as const;
        });
    });
  }

  node<S extends string>(name: S): Parser<ParseNode<S, A>> {
    return location.and(this).chain(([start, value]) => {
      return location.map((end) => {
        const type = "ParseNode";
        return { type, name, value, start, end } as const;
      });
    });
  }
}

export interface ParseNode<S extends string, A> {
  type: "ParseNode";
  name: S;
  value: A;
  start: SourceLocation;
  end: SourceLocation;
}

// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/parsimmon/index.d.ts#L308
// Thanks to the DefinitelyTyped folks for this type magic here
export type Rules<Spec> = {
  [P in keyof Spec]: (lang: Language<Spec>) => Parser<Spec[P]>;
};

export type Language<Spec> = {
  [P in keyof Spec]: Parser<Spec[P]>;
};

export function language<Spec>(rules: Rules<Spec>): Language<Spec> {
  const lang = {} as Language<Spec>;
  for (const key of Object.keys(rules)) {
    const k = key as keyof Spec;
    const f = () => rules[k](lang);
    lang[k] = lazy(f);
  }
  return lang;
}

export const location = new Parser<SourceLocation>((context) => {
  return context.ok(context.location.index, context.location);
});

export function ok<A>(value: A): Parser<A> {
  return new Parser((context) => {
    return context.ok(context.location.index, value);
  });
}

export function fail<A>(expected: readonly string[]): Parser<A> {
  return new Parser((context) => {
    return context.fail(context.location.index, expected);
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

export function match(regexp: RegExp): Parser<string> {
  return new Parser((context) => {
    const flags = regexp.ignoreCase ? "iy" : "y";
    const sticky = new RegExp(regexp.source, flags);
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

export function lazy<A>(fn: () => Parser<A>): Parser<A> {
  let action: ((context: Context) => ActionResult<A>) | undefined;
  return new Parser(function (context) {
    if (!action) {
      action = fn().action;
    }
    return action(context);
  });
}
