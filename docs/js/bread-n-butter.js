/**
 * Represents a parsing action; typically not created directly via `new`.
 */
export class Parser {
    /**
     * Creates a new custom parser that performs the given parsing action.
     */
    constructor(action) {
        this.action = action;
    }
    /**
     * Returns a parse result with either the value or error information.
     */
    parse(input) {
        const location = { index: 0, line: 1, column: 1 };
        const context = new Context(input, location);
        const result = this.and(eof).action(context);
        if (result.type === "ActionOK") {
            return {
                type: "ParseOK",
                value: result.value[0],
            };
        }
        return {
            type: "ParseFail",
            location: result.furthest,
            expected: result.expected,
        };
    }
    /**
     * Returns the parsed result or throws an error.
     */
    tryParse(input) {
        const result = this.parse(input);
        if (result.type === "ParseOK") {
            return result.value;
        }
        const { expected, location } = result;
        const { line, column } = location;
        const message = `parse error at line ${line} column ${column}: ` +
            `expected ${expected.join(", ")}`;
        throw new Error(message);
    }
    /**
     * Combines two parsers one after the other, yielding the results of both in
     * an array.
     */
    and(parserB) {
        return new Parser((context) => {
            const a = this.action(context);
            if (a.type === "ActionFail") {
                return a;
            }
            context = context.moveTo(a.location);
            const b = context.merge(a, parserB.action(context));
            if (b.type === "ActionOK") {
                const value = [a.value, b.value];
                return context.merge(b, context.ok(b.location.index, value));
            }
            return b;
        });
    }
    /**
     * Try to parse using the current parser. If that fails, parse using the
     * second parser.
     */
    or(parserB) {
        return new Parser((context) => {
            const a = this.action(context);
            if (a.type === "ActionOK") {
                return a;
            }
            return context.merge(a, parserB.action(context));
        });
    }
    /**
     * Parse using the current parser. If it succeeds, pass the value to the
     * callback function, which returns the next parser to use.
     */
    chain(fn) {
        return new Parser((context) => {
            const a = this.action(context);
            if (a.type === "ActionFail") {
                return a;
            }
            const parserB = fn(a.value);
            context = context.moveTo(a.location);
            return context.merge(a, parserB.action(context));
        });
    }
    /**
     * Yields the value from the parser after being called with the callback.
     */
    map(fn) {
        return this.chain((a) => {
            return ok(fn(a));
        });
    }
    /**
     * Returns the callback called with the parser.
     */
    thru(fn) {
        return fn(this);
    }
    /**
     * Returns a parser which parses the same value, but discards other error
     * messages, using the ones supplied instead.
     */
    desc(expected) {
        return new Parser((context) => {
            const result = this.action(context);
            if (result.type === "ActionOK") {
                return result;
            }
            return { type: "ActionFail", furthest: result.furthest, expected };
        });
    }
    /**
     * Wraps the current parser with before & after parsers.
     */
    wrap(before, after) {
        return before.and(this).chain(([, value]) => {
            return after.map(() => value);
        });
    }
    /**
     * Ignores content before and after the current parser, based on the supplied
     * parser.
     */
    trim(beforeAndAfter) {
        return this.wrap(beforeAndAfter, beforeAndAfter);
    }
    /**
     * Repeats the current parser zero or more times, yielding the results in an
     * array.
     */
    many0() {
        return this.many1().or(ok([]));
    }
    /**
     * Parsers the current parser **one** or more times. See `many0` for more
     * details.
     */
    many1() {
        return new Parser((context) => {
            const items = [];
            let result = this.action(context);
            if (result.type === "ActionFail") {
                return result;
            }
            while (result.type === "ActionOK") {
                items.push(result.value);
                if (result.location.index === context.location.index) {
                    throw new Error("infinite loop detected; don't call many0 or many1 with parsers that can accept zero characters");
                }
                context = context.moveTo(result.location);
                result = context.merge(result, this.action(context));
            }
            return context.merge(result, context.ok(context.location.index, items));
        });
    }
    /**
     * Returns a parser that parses zero or more times, separated by the separator
     * parser supplied.
     */
    sepBy0(separator) {
        return this.sepBy1(separator).or(ok([]));
    }
    /**
     * Returns a parser that parses one or more times, separated by the separator
     * parser supplied.
     */
    sepBy1(separator) {
        return this.chain((first) => {
            return separator
                .and(this)
                .map(([, value]) => value)
                .many0()
                .map((rest) => {
                return [first, ...rest];
            });
        });
    }
    /**
     * Returns a parser that adds name and start/end location metadata.
     */
    node(name) {
        return location.and(this).chain(([start, value]) => {
            return location.map((end) => {
                const type = "ParseNode";
                return { type, name, value, start, end };
            });
        });
    }
}
/**
 * Parser that yields the current `SourceLocation`, containing properties
 * `index`, `line` and `column`.
 */
export const location = new Parser((context) => {
    return context.ok(context.location.index, context.location);
});
/**
 * Returns a parser that yields the given value and consumes no input.
 */
export function ok(value) {
    return new Parser((context) => {
        return context.ok(context.location.index, value);
    });
}
/**
 * Returns a parser that fails with the given messages and consumes no input.
 */
export function fail(expected) {
    return new Parser((context) => {
        return context.fail(context.location.index, expected);
    });
}
/**
 * This parser succeeds if the input has already been fully parsed.
 */
export const eof = new Parser((context) => {
    if (context.location.index < context.input.length) {
        return context.fail(context.location.index, ["<EOF>"]);
    }
    return context.ok(context.location.index, "<EOF>");
});
/** Returns a parser that matches the exact text supplied. */
export function text(string) {
    return new Parser((context) => {
        const start = context.location.index;
        const end = start + string.length;
        if (context.input.slice(start, end) === string) {
            return context.ok(end, string);
        }
        return context.fail(start, [string]);
    });
}
/**
 * Returns a parser that matches the entire regular expression at the current
 * parser position.
 */
export function match(regexp) {
    for (const flag of regexp.flags) {
        switch (flag) {
            case "i": // ignoreCase
            case "s": // dotAll
            case "m": // multiline
            case "u": // unicode
                continue;
            default:
                throw new Error("only the regexp flags 'imsu' are supported");
        }
    }
    const sticky = new RegExp(regexp.source, regexp.flags + "y");
    return new Parser((context) => {
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
/**
 * Takes a lazily invoked callback that returns a parser, so you can create
 * recursive parsers.
 */
export function lazy(fn) {
    // NOTE: This parsing action overwrites itself on the specified parser. We're
    // assuming that the same parser won't be returned to multiple `lazy` calls. I
    // never heard of such a thing happening in Parsimmon, and it doesn't seem
    // likely to happen here either. I assume this is faster than using variable
    // closure and an `if`-statement here, but I honestly don't know.
    const parser = new Parser((context) => {
        parser.action = fn().action;
        return parser.action(context);
    });
    return parser;
}
function union(a, b) {
    return [...new Set([...a, ...b])];
}
/**
 * Represents the current parsing context.
 */
class Context {
    constructor(input, location) {
        this.input = input;
        this.location = location;
    }
    /**
     * Returns a new context with the supplied location and the current input.
     */
    moveTo(location) {
        return new Context(this.input, location);
    }
    _internal_move(index) {
        if (index === this.location.index) {
            return this.location;
        }
        const start = this.location.index;
        const end = index;
        const chunk = this.input.slice(start, end);
        let { line, column } = this.location;
        for (const ch of chunk) {
            if (ch === "\n") {
                line++;
                column = 1;
            }
            else {
                column++;
            }
        }
        return { index, line, column };
    }
    /**
     * Represents a successful parse ending before the given `index`, with the
     * specified `value`.
     */
    ok(index, value) {
        return {
            type: "ActionOK",
            value,
            location: this._internal_move(index),
            furthest: { index: -1, line: -1, column: -1 },
            expected: [],
        };
    }
    /**
     * Represents a failed parse starting at the given `index`, with the specified
     * list `expected` messages (note: this list usually only has one item).
     */
    fail(index, expected) {
        return {
            type: "ActionFail",
            furthest: this._internal_move(index),
            expected,
        };
    }
    /**
     * Merge two sequential `ActionResult`s so that the `expected` and location data
     * is preserved correctly.
     */
    merge(a, b) {
        if (b.furthest.index > a.furthest.index) {
            return b;
        }
        const expected = b.furthest.index === a.furthest.index
            ? union(a.expected, b.expected)
            : a.expected;
        if (b.type === "ActionOK") {
            return {
                type: "ActionOK",
                location: b.location,
                value: b.value,
                furthest: a.furthest,
                expected,
            };
        }
        return {
            type: "ActionFail",
            furthest: a.furthest,
            expected,
        };
    }
}
