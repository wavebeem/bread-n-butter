import * as util from "util";

export function prettyPrint(x: unknown): void {
  console.log(util.inspect(x, { depth: null, colors: true }));
}
