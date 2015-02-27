export function getLocation(source, position) {
  var line = 1;
  var column = position + 1;
  var lineRegexp = /\r\n|[\n\r\u2028\u2029]/g;
  var match;
  while ((match = lineRegexp.exec(source.body)) && match.index < position) {
    line += 1;
    column = position + 1 - (match.index + match[0].length);
  }
  return { line, column };
}
