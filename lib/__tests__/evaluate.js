import { it } from 'mocha';
import { expect } from 'chai';
import { parse } from '../parser';
import { evaluate } from '../evaluate';

it('executes program', () => {

  var program = parse(
`(let (foo 123) (+ foo 456))`
  );

  var result = evaluate(program);
  expect(result).to.equal(579);
});


it('executes complex program', () => {

  var program = parse(`
    (do
      (defn tri (x) (* (sq x) x))
      (defn sq (x) (* x x))
      (def t3 (tri 4))
      t3
    )
`);

  var result = evaluate(program);
  expect(result).to.equal(64);
});

it('supports try catch', () => {

  var program = parse(`
    (try (do (throw "bad") "good") (catch e e))
`);

  var result = evaluate(program);
  expect(result).to.equal('bad');
});
