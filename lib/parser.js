import { Source } from './source';
import { error } from './error';
import { lex } from './lexer';
import {
  EOF,
  QUOTE,
  UNQUOTE,
  PAREN_L,
  PAREN_R,
  WORD,
  STRING,
  NUMBER
} from './kinds';


export function parse(source) {
  if (typeof source === 'string') {
    source = new Source(source);
  }
  var parser = makeParser(source);
  advance(parser);
  return parseExpression(parser);
}

function makeParser(source) {
  return {
    source: source,
    token: null,
    _nextToken: lex(source)
  };
}

function advance(parser) {
  parser.token = parser._nextToken();
}

function skip(parser, kind) {
  var match = parser.token.kind === kind;
  if (match) {
    advance(parser);
  }
  return match;
}

function unexpected(parser) {
  error(
    parser.source,
    parser.token.start,
    `Unexpected ${getTokenDesc(parser.token)}`
  );
}

function getKindDesc(kind) {
  switch (kind) {
    case EOF: return 'EOF';
    case PAREN_L: return '"("';
    case PAREN_R: return '")"';
  }
}

function getTokenDesc(token) {
  return token.value ? `"${token.value}"` : getKindDesc(token.kind);
}

function parseExpression(parser) {
  if (skip(parser, PAREN_L)) {
    var expressions = [];
    while (!skip(parser, PAREN_R)) {
      expressions.push(parseExpression(parser));
    }
    return expressions;
  }
  var token = parser.token;
  if (token.kind === WORD) {
    advance(parser);
    return { pos: token.start, sym: token.value };
  }
  if (token.kind === STRING ||
      token.kind === NUMBER) {
    advance(parser);
    return token.value;
  }
  if (token.kind === QUOTE) {
    advance(parser);
    return { quote: parseExpression(parser) };
  }
  if (token.kind === UNQUOTE) {
    advance(parser);
    return { unquote: parseExpression(parser) };
  }
  unexpected(parser);
}
