import JSON from "../examples/json";
import { snapTest } from "./util";

test("json complex", () => {
  snapTest(
    JSON,
    `\
{
  "id": "a thing\\nice\tab",
  "another property!"
    : "also cool"
  , "weird formatting is ok too........😂": 123.45e1,
  "": [
    true, false, null,
    "",
    " ",
    {},
    {"": {}}
  ]
}
`
  );
});

test("json simple", () => {
  snapTest(JSON, `{"array":[1,"two",null,true,false],"obj":{}}`);
});

test("json multiline", () => {
  snapTest(
    JSON,
    `
{
  "array": [1, "two", null, true, false]
  "obj": {}
}
`
  );
});

test("json multiline extra weird", () => {
  snapTest(
    JSON,
    `
{
  "array" : [ 1 , "two", null , true , false ] ,
  "obj" : {


        "key"       : "value"


  }
}
`
  );
});

test("json unicode escape", () => {
  snapTest(JSON, `{ "space": "\\u0020" }`);
});

test("json named escape", () => {
  snapTest(JSON, `{ "bnfrt": "\\b\\n\\f\\r\\t" }`);
});

test("json useless escape", () => {
  snapTest(JSON, `{ "xyz": "\\x\\y\\z" }`);
});
