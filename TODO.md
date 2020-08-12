- Add more tutorials

- Add more examples

- Add benchmarks?

- Add user values to context?

- Should `Context` be an interface and I have an internal not-exported class
  that implements it instead?

- Add equivalents to `.skip` and `.then` from Parsimmon

- Add `bnb.all` function (like `Parsimmon.seq`) and look at `Promise.all` to see
  how to do the type level magic to make it not awful for TS users

  ```ts
  // TODO: Optimize with custom parser
  function all<A>(parsers: bnb.Parser<A>[]): bnb.Parser<A[]> {
    let ret = bnb.ok<A[]>([]);
    for (const p of parsers) {
      ret = ret.chain((array) => {
        return p.map((value) => {
          return [...array, value];
        });
      });
    }
    return ret;
  }
  ```
