import * as bnb from "../src/bread-n-butter";

export interface XMLElement {
  name: string;
  attributes: Record<string, string>;
  children: (string | XMLElement)[];
}

// Mandatory whitespace
const W1 = bnb.match(/\s+/);

// Optional whitespace
const W0 = W1.or(bnb.ok(""));

const Word = bnb.match(/[a-zA-Z]+/);

// Proper XML attributes would support XML entities (e.g. `&amp;`)
const AttributeValue = bnb.match(/[^"]+/).trim(bnb.text('"'));

// `name="value"`.
const Attribute = bnb.all(Word.skip(bnb.text("=")), AttributeValue);

// Both types of opening tag (`<x>` and `<x/>`) contain a name followed by
// optional attributes
const OpeningTagInsides = bnb
  .all(Word, W0.next(Attribute.sepBy(W1)).or(bnb.ok([])))
  .map(([name, attrList]) => {
    const attributes: Record<string, string> = {};
    for (const [key, value] of attrList) {
      attributes[key] = value;
    }
    return { name, attributes };
  });

// `<tag>`
const OpeningTag = OpeningTagInsides.wrap(
  bnb.text("<"),
  W0.next(bnb.text(">"))
);

// `<tag />`
const EmptyTag = OpeningTagInsides.wrap(bnb.text("<"), W0.next(bnb.text("/>")));

// - Full elements have an opening and closing tag (e.g. `<a></a>`)
// - Empty elements just have an empty tag (e.g. `<a/>`).
const Element: bnb.Parser<XMLElement> = bnb.lazy(() => {
  return bnb.choice(FullElement, EmptyElement).skip(W0);
});

// Construct an appropriate output object, and use the parsed tag name to
// create a closing tag parser on the fly, to check that a matching end tag
// is found.
const FullElement = OpeningTag.chain(({ name, attributes }) => {
  return Children.map((children) => {
    return { name, attributes, children };
  }).skip(bnb.text(`</${name}>`));
});

// Empty elements have it easier; we don't have to handle contents or a
// possible end tag.
const EmptyElement = EmptyTag.map(({ name, attributes }) => {
  return { name, attributes, children: [] };
});

// Proper XML text content would support XML entities (e.g. &amp;).
const TextContent = bnb.match(/[^<>]+/);

// An element can contain other elements, or text.
const Children = bnb.choice(Element, TextContent).repeat();

const XML = Element.trim(W0);

export default XML;
