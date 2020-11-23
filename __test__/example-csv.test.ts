import CSV from "../examples/csv";
import { snapTest } from "./util";

test("csv simple", () => {
  snapTest(
    CSV,
    `\
apple,1.23,1312
banana,0.99,67
cherry,0.54,987
dragonfruit,2.87,4
elderberry,9.99,22
`
  );
});

test("csv complex", () => {
  snapTest(
    CSV,
    `\
a,,c,"a ""complex"" field, i think"
d,eeeeee,FFFF,cool
nice,nice,nice3,nice4
`
  );
});

test("csv LF", () => {
  snapTest(
    CSV,
    `\
a,b,c\n\
a,b,c\n\
a,b,c\
`
  );
});

test("csv CRLF", () => {
  snapTest(
    CSV,
    `\
a,b,c\r\n\
a,b,c\r\n\
a,b,c\
`
  );
});

test("csv trailing newline", () => {
  snapTest(
    CSV,
    `\
a,b,c\r\n\
a,b,c\r\n\
a,b,c\r\n\
`
  );
  snapTest(
    CSV,
    `\
a,b,c\n\
a,b,c\n\
a,b,c\n\
`
  );
});
