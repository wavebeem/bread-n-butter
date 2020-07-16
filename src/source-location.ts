/**
 * Represents a location in the input (source code). Keeps track of `index` (for
 * use with `.slice` and such), as well as `line` and `column` for displaying to
 * users.
 */
export class SourceLocation {
  /** The string index into the input (e.g. for use with `.slice`) */
  index: number;
  /**
   * The line number for error reporting. Only the character `\n` is used to
   * signify the beginning of a new line.
   */
  line: number;
  /**
   * The column number for error reporting.
   *
   * Note that certain complex emojis may count as more than one column, because
   * they're actually several emojis in a trenchcoat (e.g. family emojis.)
   *
   * The column number is incremented based on each character as defined by
   * ES2015's string iteration protocol (i.e. the result of calling
   * `Array.from(string)`).
   */
  column: number;

  /** @ignore */
  constructor(index: number, line: number, column: number) {
    this.index = index;
    this.line = line;
    this.column = column;
  }

  /** @ignore */
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
