import * as bnb from "../src/bread-n-butter";

// Like Object.fromEntries
function fromEntries(entries: [string, string][]) {
  const ret: Record<string, string> = {};
  for (const [key, val] of entries) {
    ret[key] = val;
  }
  return ret;
}

interface XMLElement {
  name: string;
  attributes: Record<string, string>;
  children: (XMLElement | string)[];
}

const ws0 = bnb.match(/\s*/m); // whitespace, 0+
const ws1 = bnb.match(/\s+/m); // whitespace, 1+

const XML: bnb.Parser<XMLElement> = bnb
  .lazy(() => {
    return bnb.choice(elementWithChildren, elementWithoutChildren);
  })
  .trim(ws0);

// Tag or attribute name
const symbol = bnb.match(/[a-zA-Z_][a-zA-Z0-9_-]*/);

// XML entity
const strEscape = bnb.choice(
  bnb.text("&quot;").map(() => '"'),
  bnb.text("&apos;").map(() => "'"),
  bnb.text("&amp;").map(() => "&"),
  bnb.text("&lt;").map(() => "<"),
  bnb.text("&gt;").map(() => ">")
);

// One or more characters that aren't `"` or `&`
const strChunk = bnb.match(/[^"&]+/);

const attrString = bnb
  .choice(strEscape, strChunk)
  .repeat()
  .map((parts) => parts.join(""))
  .trim(bnb.text('"'));

const oneAttr = bnb.all(symbol.skip(bnb.text("=").trim(ws0)), attrString);

const attributes = oneAttr.sepBy(ws1).map((attrs) => {
  return fromEntries(attrs);
});

// XML entity
const xmlChildEscape = bnb.choice(
  bnb.text("&quot;").map(() => '"'),
  bnb.text("&apos;").map(() => "'"),
  bnb.text("&amp;").map(() => "&"),
  bnb.text("&lt;").map(() => "<"),
  bnb.text("&gt;").map(() => ">")
);

// One or more characters that aren't `"` or `&`
const xmlChildChunk = bnb.match(/[^"&<]+/);

const xmlChildString = bnb
  .choice(xmlChildEscape, xmlChildChunk)
  .repeat()
  .map((parts) => parts.join(""));

const xmlChild = bnb.lazy(() => bnb.choice(xmlChildString, XML));

const elementWithChildren = bnb
  .all(bnb.text("<").next(symbol).skip(ws1), attributes.skip(bnb.text(">")))
  .chain(([tagName, attrs]) => {
    return xmlChild.repeat().chain((children) => {
      return bnb
        .text("<")
        .next(bnb.text(tagName))
        .skip(bnb.text("/>"))
        .map<XMLElement>(() => {
          return {
            name: tagName,
            attributes: attrs,
            children: children,
          };
        });
    });
  });

const elementWithoutChildren = bnb
  .all(bnb.text("<").next(symbol).skip(ws1), attributes.skip(bnb.text("/>")))
  .map<XMLElement>(([tagName, attrs]) => {
    return {
      name: tagName,
      attributes: attrs,
      children: [],
    };
  });

export default XML;
