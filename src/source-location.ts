export class SourceLocation {
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
