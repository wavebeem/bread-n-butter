import XML from "../examples/xml-ish";
// import { snapTest } from "./util";

// TODO: Better tests
test("xml", () => {
  expect(XML.tryParse("<a />")).toEqual({
    name: "a",
    attributes: {},
    children: [],
  });
});

// test("xml", () => {
//   snapTest(
//     XML,
//     `\
// <dict>
//     <item key="a">alpha</item>
//     <item key="empty" />
// </dict>
// `
//   );
// });
