import { parse } from './parser';
import { print } from './print';
import { evaluate, createEnv } from './evaluate';
import { readFileSync } from 'fs';
import { start } from 'repl';


var replEnv = createEnv();

function slurp(a) {
  return readFileSync(a, 'utf-8');
}
replEnv.slurp = slurp;

function loadFile(a) {
  return evaluate(parse(slurp(a)), replEnv);
}
replEnv['load-file'] = loadFile;

function repl(a) {
  return console.log(print(evaluate(parse(a), replEnv)));
}

if (process.argv.length > 2) {
  replEnv['*ARGV*'] = process.argv.slice(3);
  repl(`(load-file ${process.argv[2]})`);
} else {
  start({
    prompt: 'user> ',
    ignoreUndefined: true,
    eval: function evaluate(cmd, c, f, cb) {
      cmd = cmd.slice(1, cmd.length - 2);
      if (!cmd) {
        return cb();
      }
      try {
        repl(cmd);
        cb();
      } catch (error) {
        cb(error);
      }
    }
  });
}
