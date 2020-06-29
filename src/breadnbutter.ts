interface Parser<Value> {
  (context: ParserContext): Result<Value>;
}

interface ParserContext {
  type: "bnb.ParserContext";
  input: string;
  index: number;
}

interface OK<Value> {
  type: "bnb.OK";
  value: Value;
  context: ParserContext;
}

interface Fail {
  type: "bnb.Fail";
  message: string;
  context: ParserContext;
}

type Result<Value> = OK<Value> | Fail;

export function custom<Value>(
  handler: (context: ParserContext) => Result<Value>
): Parser<Value> {
  return handler;
}

export function ok<Value>(value: Value, context: ParserContext): OK<Value> {
  return {
    type: "bnb.OK",
    value,
    context,
  };
}

export function fail(message: string, context: ParserContext): Fail {
  return {
    type: "bnb.Fail",
    message,
    context,
  };
}

export function parse<Value>(
  parser: Parser<Value>,
  input: string
): Result<Value> {
  const context: ParserContext = {
    type: "bnb.ParserContext",
    input,
    index: 0,
  };
  const result = andThen(parser, matchEOF)(context);
  if (result.type === "bnb.OK") {
    const [value] = result.value;
    return ok(value, result.context);
  }
  return result;
}

export function of<Value>(value: Value): Parser<Value> {
  return custom((context) => ok(value, context));
}

export function andThen<Value1, Value2>(
  parser1: Parser<Value1>,
  parser2: Parser<Value2>
): Parser<readonly [Value1, Value2]> {
  return custom((context) => {
    const result1 = parser1(context);
    if (result1.type === "bnb.Fail") {
      return result1;
    }
    const result2 = parser2(result1.context);
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
      return ok(string, {
        ...context,
        index: context.index + 1,
      });
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
    console.log("MATCH", match);
    if (!match) {
      return fail(regexp.toString(), context);
    }
    return ok(match[0], {
      ...context,
      index: context.index + match[0].length,
    });
  });
}
