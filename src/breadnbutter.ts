class Parser<Value> {
  readonly action: (context: Context) => Result<Value>;

  constructor(action: (context: Context) => Result<Value>) {
    this.action = action;
  }

  parse(input: string): Result<Value> {
    const context = new Context({ input, index: 0 });
    const result = andThen(this, matchEOF).action(context);
    if (result.type === "bnb.OK") {
      const [value] = result.value;
      return ok(value, result.context);
    }
    return result;
  }
}

class Context {
  readonly input: string;
  readonly index: number;

  constructor(options: { input: string; index: number }) {
    this.input = options.input;
    this.index = options.index;
  }

  consume(amount: number): Context {
    return new Context({
      input: this.input,
      index: this.index + amount,
    });
  }
}

interface OK<Value> {
  type: "bnb.OK";
  value: Value;
  context: Context;
}

interface Fail {
  type: "bnb.Fail";
  message: string;
  context: Context;
}

type Result<Value> = OK<Value> | Fail;

export function custom<Value>(
  action: (context: Context) => Result<Value>
): Parser<Value> {
  return new Parser(action);
}

export function ok<Value>(value: Value, context: Context): OK<Value> {
  return {
    type: "bnb.OK",
    value,
    context,
  };
}

export function fail(message: string, context: Context): Fail {
  return {
    type: "bnb.Fail",
    message,
    context,
  };
}

export function of<Value>(value: Value): Parser<Value> {
  return custom((context) => ok(value, context));
}

export function andThen<Value1, Value2>(
  parser1: Parser<Value1>,
  parser2: Parser<Value2>
): Parser<readonly [Value1, Value2]> {
  return custom((context) => {
    const result1 = parser1.action(context);
    if (result1.type === "bnb.Fail") {
      return result1;
    }
    const result2 = parser2.action(result1.context);
    if (result2.type === "bnb.Fail") {
      return result2;
    }
    const value = [result1.value, result2.value] as const;
    return ok(value, result2.context);
  });
}

export function matchString(string: string): Parser<string> {
  return custom((context) => {
    const chunk = context.input.slice(
      context.index,
      context.index + string.length
    );
    if (chunk === string) {
      return ok(string, context.consume(1));
    }
    return fail(string, context);
  });
}

export const matchEOF = custom((context) => {
  if (context.index === context.input.length) {
    return ok("end of file", context);
  }
  return fail("end of file", context);
});

export function matchRegExp(regexp: RegExp): Parser<string> {
  return custom((context) => {
    const stickyRegexp = new RegExp(regexp, "y");
    stickyRegexp.lastIndex = context.index;
    const match = context.input.match(stickyRegexp);
    if (!match) {
      return fail(regexp.toString(), context);
    }
    return ok(match[0], context.consume(match[0].length));
  });
}
