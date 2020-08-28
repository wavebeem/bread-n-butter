const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const markdownIt = require("markdown-it");
const markdownItTocAndAnchor = require("markdown-it-toc-and-anchor").default;
const slugify = require("slugify");
const dateFormat = require("dateformat");

function customSlugify(text) {
  // The table of contents has headings like `parser.or(other)`, and we want to
  // omit the `(other)` part showing the arguments, since it makes the slug too
  // long, and bnb doesn't have multi-arity functions to worry about anyway.
  // Also, slugify removes `.` instead of replacing it with `-`, which looks
  // really bad for the docs.
  text = text.replace(".", "-").replace(/\(.*\)/, "");
  return slugify(text, { lower: true, strict: true });
}

module.exports = (config) => {
  config.setLibrary(
    "md",
    markdownIt({
      html: true,
      linkify: true,
      typographer: true,
    }).use(markdownItTocAndAnchor, {
      tocFirstLevel: 2,
      slugify: customSlugify,
    })
  );
  config.addFilter("date", (date, format) => {
    if (date === "now") {
      date = new Date();
    }
    return dateFormat(date, format);
  });
  config.addPlugin(syntaxHighlight);
  config.addPassthroughCopy("docs/css");
  config.addPassthroughCopy("docs/img");
  config.addPassthroughCopy("docs/js");
  return {
    dir: {
      input: "docs",
      output: "_site",
    },
  };
};
