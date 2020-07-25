const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
// https://github.com/markdown-it/markdown-it
const markdownIt = require("markdown-it");
// https://github.com/medfreeman/markdown-it-toc-and-anchor
const markdownItTocAndAnchor = require("markdown-it-toc-and-anchor").default;

function slugify(text) {
  return text.replace(/ /g, () => "-").replace(/\(.*\)/, "");
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
      slugify,
    })
  );
  config.addPlugin(syntaxHighlight);
  config.addPassthroughCopy("docs/css");
  config.addPassthroughCopy("docs/img");
  return {
    dir: {
      input: "docs",
      output: "_site",
    },
  };
};
