import * as bnb from "../src/bread-n-butter";

export function snapTest<A>(parser: bnb.Parser<A>, input: string): void {
  expect(parser.parse(input)).toMatchSnapshot(JSON.stringify(input));
}
