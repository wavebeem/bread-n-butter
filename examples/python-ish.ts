import * as bnb from "../src/bread-n-butter";
import { prettyPrint } from "./util";

///////////////////////////////////////////////////////////////////////

type PyBlock = { type: "Block"; statements: PyStatement[] };
type PyIdent = { type: "Ident"; value: string };
type PyStatement = PyBlock | PyIdent;
type Py = {
  pyStatement: bnb.Parser<PyStatement>;
  pyRestStatement: bnb.Parser<PyStatement>;
};

// Because parsing indentation-sensitive languages such as Python requires
// tracking state, all of our parsers are created inside a function that takes
// the current parsing state. In this case it's just the current indentation
// level, but a real Python parser would also *at least* need to keep track of
// whether the current parsing is inside of () or [] or {} so that you can know
// to ignore all whitespace, instead of further tracking indentation.
//
// Implementing all of Python's various whitespace requirements, including
// comments and line continuations (backslash at the end of the line) is left as
// an exercise for the reader. I've tried and frankly it's pretty tricky.
function py(indent: number): Py {
  // Consume zero or more spaces and then return the number consumed. For a
  // more Python-like language, this parser would also accept tabs and then
  // expand them to the correct number of spaces
  //
  // https://docs.python.org/3/reference/lexical_analysis.html#indentation
  const pyCountSpaces = bnb.match(/[ ]*/).map((s) => s.length);

  // Count the current indentation level and assert it's more than the current
  // parse state's desired indentation
  const pyIndentSame = pyCountSpaces.chain((n) => {
    if (n === indent) {
      return bnb.ok(n);
    }
    return bnb.fail<number>([`${n} spaces`]);
  });

  // Count the current indentation level and assert it's equal to the current
  // parse state's desired indentation
  const pyIndentMore = pyCountSpaces.chain((n) => {
    if (n > indent) {
      return bnb.ok(n);
    }
    return bnb.fail<number>([`more than ${n} spaces`]);
  });

  // Support UNIX and Windows line endings
  const pyNL = bnb.text("\r\n").or(bnb.text("\n"));

  // Lines should always end in a newline sequence, but many files are missing
  // the final newline
  const pyEnd = pyNL.or(bnb.eof);

  // This is just a statement in our language. To simplify, this is either a
  // block of code or just an identifier
  const pyStatement: bnb.Parser<PyStatement> = bnb.lazy(() => {
    return pyBlock.or(pyIdent);
  });

  // This is a statement which is indented to the level of the current parse
  // state. It's called RestStatement because the first statement in a block
  // is indented more than the previous state, but the *rest* of the
  // statements match up with the new state.
  const pyRestStatement = pyIndentSame.next(pyStatement);

  // This is where the magic happens. Basically we need to parse a deeper
  // indentation level on the first statement of the block and keep track of
  // new indentation level. Then we make a whole new set of parsers that use
  // that new indentation level for all their parsing. Each line past the
  // first is required to be indented to the same level as that new deeper
  // indentation level.
  const pyBlock = bnb
    .text("block:")
    .next(pyNL)
    .next(
      pyIndentMore.chain((n) => {
        return pyStatement.chain((first) => {
          return py(n)
            .pyRestStatement.repeat(0)
            .map<PyStatement>((rest) => {
              return {
                type: "Block",
                statements: [first, ...rest],
              };
            });
        });
      })
    );

  // Just a variable and then the end of the line.
  const pyIdent = bnb
    .match(/[a-z]+/i)
    .skip(pyEnd)
    .map<PyIdent>((value) => {
      return { type: "Ident", value };
    });

  return { pyStatement, pyRestStatement };
}

// Start parsing at zero indentation
const pythonish = py(0);

///////////////////////////////////////////////////////////////////////

const text = `\
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
`;

const ast = pythonish.pyStatement.parse(text);
prettyPrint(ast);
