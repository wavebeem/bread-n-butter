import * as bnb from "../src/bread-n-butter";

// CSVs should end with `\r\n` but `\n` is fine too.
const csvEnd = bnb.text("\r\n").or(bnb.text("\n"));
// If the string doesn't have any newlines, commas, or `"`, parse it with a
// single regular expression for speed.
const csvFieldSimple = bnb.match(/[^\r\n,"]*/);
// - Starts with a double quote `"`.
// - The contains 0+ quoted characters.
// - Quoted characters are either `""` which evaluates to a single `"`.
// - OR they are any other character, including newlines.
const csvFieldQuoted = bnb.text('"').chain(() => {
  return bnb
    .match(/[^"]+/)
    .or(bnb.text('""').map(() => '"'))
    .repeat(0)
    .map((chunks) => chunks.join(""))
    .chain((text) => {
      return bnb.text('"').map(() => text);
    });
});
// A field is a single value
const csvField = csvFieldQuoted.or(csvFieldSimple);
// Each row (line) is 1 or more values separated by commas
const csvRow = csvField.sepBy(bnb.text(","), 1);
// A CSV file is _basically_ just 1 or more rows, but our parser accidentally
// reads the final empty line incorrectly and we have to hack around that.
const CSV = csvRow
  .sepBy(csvEnd, 1)
  .skip(csvEnd.or(bnb.ok("")))
  .map((rows) => {
    return rows.filter((row, index) => {
      // Given that CSV files don't require line endings strictly, and empty
      // string is a valid CSV row, we need to make sure and trim off the final
      // row if all it has is a single empty string, since this parser will
      // mistakenly parse that into `[""]` even though you can't end a CSV file
      // with a single empty field (I think).
      return !(index === rows.length - 1 && row.length === 1 && row[0] === "");
    });
  });

export default CSV;
