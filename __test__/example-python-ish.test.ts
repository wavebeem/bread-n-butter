import Python from "../examples/python-ish";
import { snapTest } from "./util";

test("py complex", () => {
  snapTest(
    Python,
    `\
block:
  alpha
  bravo
  block:\r
          charlie
          delta\r
          echo
          block:
           foxtrot
  golf\
`
  );
});

test("py simple", () => {
  snapTest(
    Python,
    `\
block:
  alpha
  bravo
`
  );
});

test("py even simpler", () => {
  snapTest(Python, `alpha`);
});

test("py bad indent", () => {
  snapTest(
    Python,
    `\
block:
        alpha
        block:
    beta
`
  );
});
