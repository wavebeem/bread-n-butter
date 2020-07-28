import { inspect } from "util";

export function prettyPrint(x: unknown): void {
  console.log(inspect(x, { depth: null, colors: true }));
}
