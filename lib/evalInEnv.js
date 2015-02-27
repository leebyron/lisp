import { parse } from './parser';

export function evalInEnv(ast, env) {
  while (true) {

    // 0. Return if Falsey
    if (!ast) {
      return ast;
    }

    // 1. Evaluate Quoted AST
    if (ast.hasOwnProperty('quote')) {
      return unquote(ast.quote, env);
    }

    // 2. Resolve Symbol
    if (ast.hasOwnProperty('sym')) {
      return ast.sym in env ? env[ast.sym] :
        env.throw(ast.sym + ' not found');
    }

    // 3. Nothing to Evaluate
    if (!Array.isArray(ast)) {
      return ast;
    }

    // 4. Expand Macro
    if (isSymbol(ast[0]) &&
        ast[0].sym in env &&
        env[ast[0].sym].ast && env[ast[0].sym].ast[3]) {
      let mAST = env[ast[0].sym].ast;
      ast = evalInEnv(mAST[0], envBind(mAST[2], mAST[1], ast.slice(1)));
      continue;
    }

    // 5. Parse string
    if (isSymbol(ast[0], 'read-string')) {
      ast = parse(ast[1]);
      continue;
    }

    // 6. Evaluate AST
    if (isSymbol(ast[0], 'eval')) {
      ast = evalInEnv(ast[1], env);
      continue;
    }

    // 7. Define Symbol
    if (isSymbol(ast[0], 'def')) {
      if (!isSymbol(ast[1])) {
        throw new TypeError('Invalid def');
      }
      return (env[ast[1].sym] = evalInEnv(ast[2], env));
    }

    // 8. Define Function
    if (isSymbol(ast[0], 'fn')) {
      // define new function (lambda)
      let fn = function() {
        return evalInEnv(ast[2], envBind(ast[1], env, arguments));
      }; // jshint ignore:line
      fn.ast = [ast[2], env, ast[1]];
      return fn;
    }

    // 9. Define Macro
    if (isSymbol(ast[0], 'macro')) {
      let fn = evalInEnv(ast[1], env);
      fn.ast[3] = true;
      return fn;
    }

    // 10. Create new Scope
    if (isSymbol(ast[0], 'let')) {
      env = Object.create(env);
      var bindings = ast[1];
      if (!Array.isArray(bindings) || bindings.length % 2 !== 0) {
        throw new TypeError('Bad let form');
      }
      for (var i = 0; i < bindings.length; i += 2) {
        env[bindings[i].sym] = evalInEnv(bindings[i + 1], env);
      }
      ast = ast[2];
      continue;
    }

    // 11. Conditional Branching
    if (isSymbol(ast[0], 'if')) {
      ast = evalInEnv(ast[1], env) ? ast[2] : ast[3];
      continue;
    }

    // 12. Try/Catch
    if (isSymbol(ast[0], 'try')) {
      ast = tryCatch(ast[1], ast[2], env);
      continue;
    }

    // 13. Do Lists.
    if (isSymbol(ast[0], 'do')) {
      // multiple forms (for side-effects)
      evalList(ast.slice(1, ast.length - 1), env);
      ast = ast[ast.length - 1];
      continue;
    }

    // 14. Get/Set JavaScript Value
    if (isSymbol(ast[0], '.-')) {
      // get or set attribute
      let el = evalList(ast.slice(1), env);
      return el.length > 2 ? el[0][el[1]] = el[2] : el[0][el[1]];
    }

    // 15. Call JavaScript Method
    if (isSymbol(ast[0], '.')) {
      let el = evalList(ast.slice(1), env);
      let x = el[0][el[1]];
      return x.apply(el[0], el.slice(2));
    }

    // 16. Invoke Function
    let el = evalList(ast, env);
    let fn = el[0];
    // TODO: assert it's a function
    if (fn.ast) {
      ast = fn.ast[0];
      env = envBind(fn.ast[2], fn.ast[1], el.slice(1));
      continue;
    } else {
      return fn.apply(fn, el.slice(1));
    }
  }
}

function tryCatch(t, c, env) {
  try {
    return evalInEnv(t, env);
  } catch (error) {
    return evalInEnv(c[2], envBind([c[1]], env, [error.message]));
  }
}

function unquote(ast, env) {
  if (Array.isArray(ast)) {
    return ast.map(node => unquote(node, env));
  }
  if (ast.hasOwnProperty('unquote')) {
    return evalInEnv(ast.unquote, env);
  }
  return ast;
}

function evalList(ast, env) {
  return ast.map(e => evalInEnv(e, env));
}

function envBind(ast, env, exprs) {
  // Return new Env with symbols in ast bound to corresponding values in exprs.
  env = Object.create(env);
  for (var i = 0; i < ast.length; i++) {
    if (isSymbol(ast[i], '&')) {
      // variable length arguments
      env[ast[i+1].sym] = Array.prototype.slice.call(exprs, i);
      break;
    } else {
      env[ast[i].sym] = exprs[i];
    }
  }
  return env;
}

function isSymbol(node, sym) {
  if (sym) {
    return node && node.sym === sym;
  }
  return node && node.hasOwnProperty('sym');
}
