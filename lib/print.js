export function print(ast) {
  if (Array.isArray(ast)) {
    return '(' + ast.map(print).join(' ') + ')';
  }
  if (ast && ast.hasOwnProperty('sym')) {
    return ast.sym;
  }
  if (ast && ast.hasOwnProperty('quote')) {
    return '\'' + print(ast.quote);
  }
  if (ast && ast.hasOwnProperty('unquote')) {
    return '~' + print(ast.unquote);
  }
  return JSON.stringify(ast);
}
