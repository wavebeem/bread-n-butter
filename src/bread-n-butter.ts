class Parser<Value> {
  readonly action: (context: Context) => Result<Value>;

  constructor(action: (context: Context) => Result<Value>) {
    this.action = action;
  }

  parse(input: string): Result<Value> {
    const context = new Context({ input, index: 0 });
    return this.andThen(matchEOF)
      .action(context)
      .map((values) => values[0]);
  }

  map<NewValue>(
    fn: (value: Value, context: Context) => NewValue
  ): Parser<NewValue> {
    return custom((context) => {
      return this.action(context).map(fn);
    });
  }

  flatMap<NewValue>(
    fn: (value: Value, context: Context) => Parser<NewValue>
  ): Parser<NewValue> {
    return custom((context) => {
      return this.action(context).flatMap((value, context) => {
        return fn(value, context).action(context);
      });
    });
  }

  andThen<NewValue>(
    newParser: Parser<NewValue>
  ): Parser<readonly [Value, NewValue]> {
    return custom((context) => {
      return this.action(context).flatMap((value, context) => {
        return newParser.action(context).map((newValue, _context) => {
          return [value, newValue] as const;
        });
      });
    });
  }

  // TODO: Error messages are being discarded...
  or<NewValue>(newParser: Parser<NewValue>): Parser<Value | NewValue> {
    return custom((context) => {
      return this.action(context).unwrap<Result<Value | NewValue>>({
        OK: (value, context) => ok(value, context),
        Fail: (_messages, context) => newParser.action(context),
      });
    });
  }

  repeat0(): Parser<readonly Value[]> {
    return custom((context) => {
      const values: Value[] = [];
      let done = false;
      while (!done) {
        this.action(context).unwrap({
          OK: (value, nextContext) => {
            context = nextContext;
            values.push(value);
          },
          Fail: (_messages, nextContext) => {
            context = nextContext;
            done = true;
          },
        });
      }
      return ok(values, context);
    });
  }

  repeat1(): Parser<readonly Value[]> {
    return this.flatMap((value) => {
      return this.repeat0().map((values) => {
        return [value, ...values];
      });
    });
  }

  separatedBy0<OtherValue>(
    separator: Parser<OtherValue>
  ): Parser<readonly Value[]> {
    return this.separatedBy1(separator).or(of([]));
  }

  separatedBy1<OtherValue>(
    separator: Parser<OtherValue>
  ): Parser<readonly Value[]> {
    const items = this.andThen(separator)
      .map(([value]) => value)
      .repeat0();
    return this.flatMap((first) => {
      return items.map((rest) => {
        return [first, ...rest];
      });
    });
  }

  // TODO:
  // error reporting or something?
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
  unwrap<NewValue>(options: {
    OK: (value: Value, context: Context) => NewValue;
    Fail: (messages: readonly string[], context: Context) => NewValue;
  }): NewValue;
}

class OK<Value> implements Result<Value> {
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

  unwrap<NewValue>(options: {
    OK: (value: Value, context: Context) => NewValue;
    Fail: (messages: readonly string[], context: Context) => NewValue;
  }): NewValue {
    return options.OK(this.value, this.context);
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

  unwrap<NewValue>(options: {
    OK: (value: Value, context: Context) => NewValue;
    Fail: (messages: readonly string[], context: Context) => NewValue;
  }): NewValue {
    return options.Fail(this.messages, this.context);
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

export function matchString<ThatString extends string>(
  string: ThatString
): Parser<ThatString> {
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
