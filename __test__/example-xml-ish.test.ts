import XML from "../examples/xml-ish";
// import { snapTest } from "./util";

// TODO: Better tests
test("xml", () => {
  // expect(XML.tryParse(`<a />`)).toEqual({
  //   name: "a",
  //   attributes: {},
  //   children: [],
  // });
  expect(XML.tryParse(`<a key="val" />`)).toEqual({
    name: "a",
    attributes: { key: "val" },
    children: [],
  });
  // expect(XML.tryParse(`<div />`)).toEqual({
  //   name: "div",
  //   attributes: {},
  //   children: [],
  // });
  // expect(XML.tryParse(`<div></div>`)).toEqual({
  //   name: "div",
  //   attributes: {},
  //   children: [],
  // });
  //   expect(
  //     XML.tryParse(`\
  // <div>\
  //   &amp; i'm the &quot;bad guy&quot;\
  //   who&apos;s with me? &lt;3\
  // </div>\
  // `)
  //   ).toEqual({
  //     name: "a",
  //     attributes: { key: "val" },
  //     children: [],
  //   });
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
