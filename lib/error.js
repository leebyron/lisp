import { getLocation } from './location';


export function error(source, position, description) {
  var location = getLocation(source, position);
  var syntaxError = new Error(
    `Syntax Error ${source.name} (${location.line}:${location.column}) ` +
    description + '\n\n' + highlightSourceAtLocation(source, location)
  );
  syntaxError.source = source;
  syntaxError.position = position;
  syntaxError.location = location;
  throw syntaxError;
}

function highlightSourceAtLocation(source, location) {
  var line = location.line;
  var lines = source.body.split(/\r\n|[\n\r\u2028\u2029]/g);
  return (
    (line >= 2 ? lines[line - 2] + '\n' : '') +
    lines[line - 1] + '\n' +
    Array(location.column).join(' ') + '^\n' +
    (line < lines.length ? lines[line] + '\n' : '')
  );
}
