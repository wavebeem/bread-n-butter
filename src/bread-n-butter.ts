class Parser<Value> {
  readonly action: (context: Context) => Result<Value>;

  constructor(action: (context: Context) => Result<Value>) {
    this.action = action;
  }

  parse(input: string): Result<Value> {
    const context = new Context({ input, index: 0 });
    return andThen(this, matchEOF)
      .action(context)
      .map((values) => values[0]);
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

interface Result<Value> {
  readonly context: Context;
  map<NewValue>(
    fn: (value: Value, context: Context) => NewValue
  ): Result<NewValue>;
  flatMap<NewValue>(
    fn: (value: Value, context: Context) => Result<NewValue>
  ): Result<NewValue>;
}

class OK<Value> {
  readonly value: Value;
  readonly context: Context;

  constructor(options: { value: Value; context: Context }) {
    this.value = options.value;
    this.context = options.context;
  }

  map<NewValue>(
    fn: (value: Value, context: Context) => NewValue
  ): Result<NewValue> {
    return new OK({
      value: fn(this.value, this.context),
      context: this.context,
    });
  }

  flatMap<NewValue>(
    fn: (value: Value, context: Context) => Result<NewValue>
  ): Result<NewValue> {
    return fn(this.value, this.context);
  }
}

class Fail<Value> implements Result<Value> {
  readonly messages: readonly string[];
  readonly context: Context;

  constructor(options: { messages: readonly string[]; context: Context }) {
    this.messages = [...options.messages];
    this.context = options.context;
  }

  map<NewValue>(
    _fn: (value: Value, context: Context) => NewValue
  ): Result<NewValue> {
    return new Fail({ messages: this.messages, context: this.context });
  }

  flatMap<NewValue>(
    _fn: (value: Value, context: Context) => Result<NewValue>
  ): Result<NewValue> {
    return new Fail({ messages: this.messages, context: this.context });
  }
}

export function custom<Value>(
  action: (context: Context) => Result<Value>
): Parser<Value> {
  return new Parser(action);
}

export function ok<Value>(value: Value, context: Context): Result<Value> {
  return new OK({ value, context });
}

export function fail<Value>(message: string, context: Context): Result<Value> {
  return new Fail({ messages: [message], context });
}

export function of<Value>(value: Value): Parser<Value> {
  return custom((context) => ok(value, context));
}

export function andThen<Value1, Value2>(
  parser1: Parser<Value1>,
  parser2: Parser<Value2>
): Parser<readonly [Value1, Value2]> {
  return custom((context) => {
    return parser1.action(context).flatMap((value1, context) => {
      return parser2.action(context).map((value2, _context) => {
        return [value1, value2] as const;
      });
    });
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
  if (context.index >= context.input.length) {
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
