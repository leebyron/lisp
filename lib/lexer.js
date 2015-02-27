/**
 *  Copyright (c) 2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

import { error } from './error';
import {
  EOF,
  QUOTE,
  UNQUOTE,
  PAREN_L,
  PAREN_R,
  WORD,
  NUMBER,
  STRING
} from './kinds';


export function lex(source) {
  var prevPosition = 0;
  return function nextToken() {
    var token = readToken(source, prevPosition);
    prevPosition = token.end;
    return token;
  };
}

var charCodeAt = String.prototype.charCodeAt;
var fromCharCode = String.fromCharCode;
var slice = String.prototype.slice;

function makeToken(kind, start, end, value) {
  return { kind, start, value, end };
}

function readToken(source, position) {
  var body = source.body;
  var bodyLength = body.length;
  var code;

  while (position < bodyLength) {
    code = charCodeAt.call(body, position);
    if (
      code === 32 || // space
      code === 44 || // comma
      code === 160 || // '\xa0'
      code === 0x2028 || // line separator
      code === 0x2029 || // paragraph separator
      code > 8 && code < 14 // whitespace
    ) {
      ++position;
    } else if (code === 59) { // ';'
      ++position;
      while (
        position < bodyLength &&
        (code = charCodeAt.call(body, position)) &&
        code !== 10 && code !== 13 && code !== 0x2028 && code !== 0x2029
      ) {
        ++position;
      }
    } else {
      break;
    }
  }

  if (position >= bodyLength) {
    return makeToken(EOF, position, position);
  }

  switch (code) {
    // "
    case 34:
      return readString(source, position, code);
    case 39: return makeToken(QUOTE, position, position + 1);
    case 40: return makeToken(PAREN_L, position, position + 1);
    case 41: return makeToken(PAREN_R, position, position + 1);
    // -
    case 45:
      var nextCode = charCodeAt.call(body, position + 1);
      if (nextCode >= 48 && nextCode <= 57) {
        return readNumber(source, position, code);
      }
      return readWord(source, position);
    // 0-9
    case 48: case 49: case 50: case 51: case 52:
    case 53: case 54: case 55: case 56: case 57:
      return readNumber(source, position, code);
    // [
    case 91:
    // ]
    case 93:
    // {
    case 123:
    // }
    case 125:
      return error(
        source,
        position,
        `Reserved character "${fromCharCode(code)}"`
      );
    case 126: return makeToken(UNQUOTE, position, position + 1);
    default: return readWord(source, position);
  }
}

function readWord(source, position) {
  var body = source.body;
  var bodyLength = body.length;
  var end = position + 1;
  var code;
  while (
    end !== bodyLength &&
    (code = charCodeAt.call(body, end)) &&
    code > 32 && // space
    code !== 34 && // "
    code !== 39 && // '
    code !== 40 && // (
    code !== 41 && // )
    code !== 44 && // ,
    code !== 59 && // ;
    code !== 91 && // [
    code !== 93 && // ]
    code !== 123 && // {
    code !== 125 && // }
    code !== 126 && // ~
    code !== 160 && // '\xa0'
    code !== 0x2028 && // line separator
    code !== 0x2029 // paragraph separator
  ) {
    ++end;
  }
  return makeToken(WORD, position, end, slice.call(body, position, end));
}

function readNumber(source, position, code) {
  var body = source.body;
  var end = position;
  var isFloat = false;

  if (code === 45) {
    code = charCodeAt.call(body, ++end);
  }

  if (code === 48) {
    code = charCodeAt.call(body, ++end);
  } else if (code > 48 && code <= 57) {
    do {
      code = charCodeAt.call(body, ++end);
    } while (code >= 48 && code <= 57);
  } else {
    error(source, end, 'Invalid number');
  }

  if (code === 46) { // .
    isFloat = true;
    code = charCodeAt.call(body, ++end);
    if (code >= 48 && code <= 57) {
      do {
        code = charCodeAt.call(body, ++end);
      } while (code >= 48 && code <= 57);
    } else {
      error(source, end, 'Invalid number');
    }
  }

  if (code === 69 || code === 101) { // e E
    isFloat = true;
    code = charCodeAt.call(body, ++end);
    if (code === 43 || code === 45) { // + -
      code = charCodeAt.call(body, ++end);
    }
    if (code >= 48 && code <= 57) {
      do {
        code = charCodeAt.call(body, ++end);
      } while (code >= 48 && code <= 57);
    } else {
      error(source, end, 'Invalid number');
    }
  }

  return makeToken(
    NUMBER,
    position,
    end,
    (isFloat ? parseFloat : parseInt)(slice.call(body, position, end))
  );
}

function readString(source, position, quoteCode) {
  var body = source.body;
  var bodyLength = body.length;
  var end = position + 1;
  var chunkStart = end;
  var code;
  var value = '';

  while (true) {
    if (end >= bodyLength) {
      error(source, position, 'Unterminated string');
    }
    code = charCodeAt.call(body, end);
    if (code === quoteCode) {
      break;
    } else if (code === 92) { // \
      value += slice.call(body, chunkStart, end);
      ++end;
      if (end === bodyLength) {
        continue;
      }
      code = charCodeAt.call(body, end);
      switch (code) {
        case 98: ++end; value += '\b'; break;
        case 102: ++end; value += '\f'; break;
        case 110: ++end; value += '\n'; break;
        case 114: ++end; value += '\r'; break;
        case 116: ++end; value += '\t'; break;
        case 117: // \uFFFF
          if (
            !isHex(charCodeAt.call(body, end + 1)) ||
            !isHex(charCodeAt.call(body, end + 2)) ||
            !isHex(charCodeAt.call(body, end + 3)) ||
            !isHex(charCodeAt.call(body, end + 4))
          ) {
            error(source, end, 'Illegal escape character');
          }
          value +=
            fromCharCode(parseInt(slice.call(body, end + 1, end + 5), 16));
          end += 5;
          break;
        default: ++end; value += fromCharCode(code); break;
      }
      chunkStart = end;
    } else {
      ++end;
    }
  }

  value += slice.call(body, chunkStart, end);
  return makeToken(STRING, position, end + 1, value);
}

function isHex(code) {
  return (
    code >= 48 && code <= 57 || // 0-9
    code >= 65 && code <= 70 || // A-F
    code >= 97 && code <= 102 // a-f
  );
}
