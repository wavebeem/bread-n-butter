import * as bnb from "../src/bread-n-butter";

function node(type: string) {
  return <A>(parser: bnb.Parser<A>) => {
    return bnb.location.chain((start) => {
      return parser.chain((value) => {
        return bnb.location.map((end) => {
          return { type, value, start, end };
        });
      });
    });
  };
}

const number = bnb
  .match(/[0-9]+/)
  .map(Number)
  .thru(node("Number"));

console.log(number.tryParse("8675309"));
