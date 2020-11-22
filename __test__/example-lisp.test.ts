import Lisp from "../examples/lisp";
import { snapTest } from "./util";

test("lisp symbol", () => {
  snapTest(Lisp, `a`);
  snapTest(Lisp, `kebab-case-symbol`);
  snapTest(Lisp, `snake_case_symbol`);
  snapTest(Lisp, `camelCaseSymbol`);
  snapTest(Lisp, `a0`);
});

test("lisp number", () => {
  snapTest(Lisp, `1`);
  snapTest(Lisp, `12`);
  snapTest(Lisp, `345`);
  snapTest(Lisp, `1234567890`);
});

test("lisp list", () => {
  snapTest(Lisp, `()`);
  snapTest(Lisp, `(1)`);
  snapTest(Lisp, `(1 2)`);
  snapTest(Lisp, `(list 1 2)`);
  snapTest(Lisp, `( list 1 2 )`);
  snapTest(
    Lisp,
    `
(def inc (x)
  (add x 1))

(print (inc 3))
`
  );
});
