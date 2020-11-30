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

const XML: bnb.Parser<XMLElement> = bnb.lazy(() => {
  return bnb.choice(elementWithoutChildren);
});

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

const oneAttr = bnb.all(
  ws1.next(symbol).skip(bnb.text("=").trim(ws0)),
  attrString
);

export const attributes = oneAttr.repeat().map((attrs) => {
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

export const xmlChildString = bnb
  .choice(xmlChildEscape, xmlChildChunk)
  .repeat(1)
  .map((parts) => parts.join(""));

export const xmlChild = bnb.lazy(() => bnb.choice(xmlChildString));

const elementWithChildren = bnb
  .all(bnb.text("<"), symbol, attributes, ws0, bnb.text(">"))
  .chain(([, tagName, attrs]) => {
    return xmlChild.repeat().chain((children) => {
      return bnb.text(`<${tagName}/>`).map<XMLElement>(() => {
        return {
          name: tagName,
          attributes: attrs,
          children: children,
        };
      });
    });
  });

const elementWithoutChildren = bnb
  .all(bnb.text("<"), symbol, ws1, attributes, ws0, bnb.text("/>"))
  .map<XMLElement>(([, tagName, , attrs]) => {
    return {
      name: tagName,
      attributes: attrs,
      children: [],
    };
  });

export default XML;
