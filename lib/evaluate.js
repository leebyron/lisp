import { print } from './print';
import { evalInEnv } from './evalInEnv';


var baseEnv = Object.create(global);

export function evaluate(a, context) {
  return evalInEnv(a, context || createEnv());
}

export function createEnv(sandbox) {
  sandbox = sandbox || {};
  Object.setPrototypeOf(sandbox, baseEnv);
  return sandbox;
}


baseEnv.js = function (src) {
  return Function(`return ${src}`)(); // jshint ignore:line
};

baseEnv['pr-str'] = function(ast) {
  return print(ast);
};

baseEnv['throw'] = function(a) {
  throw new Error(a);
};

baseEnv['true'] = true;
baseEnv['false'] = false;

baseEnv['='] = function(a, b) {
  return a === b;
};

baseEnv['<'] = function(a, b) {
  return a < b;
};

baseEnv['+'] = function(a, b) {
  return a + b;
};

baseEnv['-'] = function(a, b) {
  return a - b;
};

baseEnv['*'] = function(a, b) {
  return a * b;
};

baseEnv['/'] = function(a, b) {
  return a / b;
};

baseEnv.mod = function(a, b) {
  return a % b;
};

baseEnv.isa = function(a, b) {
  return a instanceof b;
};

baseEnv.type = function(a) {
  return typeof a;
};

baseEnv['new'] = function(a) {
  return new (a.bind.apply(a, arguments))();
};

baseEnv.del = function(a, b) {
  return delete a[b];
};


var commonLib = `
(do

  ; Macros
  (def defmacro
    (macro (fn (name args body)
      '(def ~name (macro (fn ~args ~body))))))
  (defmacro defn (name args body) '(def ~name (fn ~args ~body)))
  (defmacro # (body) '(fn (%1 %2 %3 %4 %5) (let (% %1) ~body)))

  ; Common
  (defn print (a) (do (. console "log" a) a))

  ; List
  (defn list (& a) a)
  (defn list? (a) (. Array "isArray" a))
  (defn get (a b) (.- a b))
  (defn set (a b c) (.- a b c))
  (defn has? (a b) (. a "hasOwnProperty" b))

  (defn push (a b) (do (. a "push" b) a))
  (defn count (a) (.- a "length"))

  ; Higher Order Functions
  (defn reduce (f list acc)
    (let
      (r (fn (acc i)
        (if (= i (count list))
          acc
          (r (f acc (get list i)) (+ i 1)))))
      (r acc 0)))
  (defn map (f list)
    (reduce (fn (acc x) (push acc (f x))) list '()))
  (defn filter (f list)
    (reduce (fn (acc x) (if (f x) (push acc x) acc)) list '()))

  ; Math
  (defn ! (a)
    (if a false true))
  (defn != (a b)
    (! (= a b)))
  (defn >= (a b)
    (! (< a b)))
  (defn > (a b)
    (if (>= a b) (!= a b) false))
  (defn <= (a b)
    (! (> a b)))

)
`;

evaluate(
  [{sym: 'eval'}, [{sym: 'read-string'}, commonLib]],
  baseEnv
);
