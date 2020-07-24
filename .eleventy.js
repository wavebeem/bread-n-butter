module.exports = (config) => {
  config.addPassthroughCopy("docs/css");
  return {
    dir: {
      input: "docs",
      output: "_site",
    },
  };
};
