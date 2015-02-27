/**
 *  Copyright (c) 2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

var sane = require('sane');
var path = require('path');
var fs = require('fs');
var child_process = require('child_process');
var exec = child_process.exec;

process.env.PATH += ':' + path.resolve(__dirname, '../node_modules/.bin');

var cmd = path.resolve(__dirname, '../');
var libDir = path.resolve(cmd, './lib');
var buildDir = path.resolve(cmd, './build');

var watcher = sane(libDir, { glob: ['**/*.js'] })
  .on('ready', startWatch)
  .on('delete', cleanFile)
  .on('add', addFile)
  .on('change', buildFile);

process.on('SIGINT', function () {
  endWatch();
  process.exit();
});

function startWatch() {
  console.log('\r\x1B[K\u001b[1m\u001b[32m\u001b[7m watching... \u001b[27m\u001b[39m\u001b[22m');
}

function endWatch() {
  watcher.close();
  console.log('\r\x1B[K\u001b[1m\u001b[33m\u001b[7m stopped watching. \u001b[27m\u001b[39m\u001b[22m');
}

function cleanFile(filepath, root, stat) {
  var buildFile = path.resolve(buildDir, filepath);
  fs.unlinkSync(buildFile);
  console.log(buildFile.substr(cmd.length + 1) + ' -> X');
}

function addFile(filepath, root, stat) {
  if (stat.isDirectory()) {
    fs.mkdir(path.resolve(buildDir, filepath), stat.mode);
  } else {
    buildFile(filepath, root, stat);
  }
}

function buildFile(filepath, root, stat) {
  var libFile = path.resolve('lib', filepath);
  var buildFile = path.resolve('build', filepath);

  workingOn[libFile.substr(cmd.length + 1)] = true;
  printWorkingOn();

  var child = child_process.spawn('jshint', [libFile], {
    cmd: cmd,
    env: process.env,
    stdio: 'inherit'
  });
  child.on('exit', function(code) {
    if (code === 0) {
      var buildChild = child_process.spawn('babel', ['--experimental', '--modules', 'common', '--optional', 'runtime', '--out-file', buildFile, libFile], {
        cmd: cmd,
        env: process.env,
        stdio: 'inherit'
      });
      buildChild.on('exit', function(code) {
        console.log(
          '\r\x1B[K' +
          libFile.substr(cmd.length + 1) + ' -> ' + buildFile.substr(cmd.length + 1)
        );
        if (isTest(filepath)) {
          var testChild = child_process.spawn('mocha', [buildFile], {
            cmd: cmd,
            env: process.env,
            stdio: 'inherit'
          });
          testChild.on('exit', function(code) {
            delete workingOn[libFile.substr(cmd.length + 1)];
            printWorkingOn();
          });
        } else {
          var testChild = child_process.spawn('mocha', ['build/**/__tests__/*'], {
            cmd: cmd,
            env: process.env,
            stdio: 'inherit'
          });
          testChild.on('exit', function(code) {
            delete workingOn[libFile.substr(cmd.length + 1)];
            printWorkingOn();
          });
        }
      });
    } else {
      console.log('\007');
      delete workingOn[libFile.substr(cmd.length + 1)];
      printWorkingOn();
    }
  });
}

function isTest(filepath) {
  return filepath.indexOf('/__tests__/') !== -1;
}

var workingOn = {};

function printWorkingOn() {
  var keys = Object.keys(workingOn);
  if (keys.length === 0) {
    return;
  }
  process.stdout.write('\r\x1B[K' + keys.join(', ') + '...');
}
