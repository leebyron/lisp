import { it } from 'mocha';
import { expect } from 'chai';
import { parse } from '../parser';

it('parses program', () => {

  var result = parse(
`(let ((foo 123)) (+ foo 456))`
  );

  expect(result).to.deep.equal(
    [ { pos: 1, sym: 'let' },
      [ [ { pos: 7, sym: 'foo' },
          123 ] ],
      [ { pos: 18, sym: '+' },
        { pos: 20, sym: 'foo' },
        456 ] ]
  );

});
