/*jslint node:true, multistr: true */
'use strict';
var path = require('path');
var Unity = require('..');

function createInstance(samples) {
  console.log('createInstance');
  var timeStart = new Date().getTime();
  for(let i = 0; i < samples; i++) {
    let instance = new Unity({
      bindings: path.join(__dirname, '../test/bindings')
    });
  }
  var timeEnd = new Date().getTime();
  var delta = timeEnd - timeStart;
  console.log('\t%dms (%dms per cycle)', delta, delta/samples);
}
createInstance(2000);

function lookup(samples) {
  console.log('lookup');
  let instance = new Unity({
    bindings: path.join(__dirname, '../test/bindings')
  });

  var timeStart = new Date().getTime();
  for(let i = 0; i < samples; i++) {
    instance.getPath('/root/a/1/value');
  }
  var timeEnd = new Date().getTime();
  var delta = timeEnd - timeStart;
  console.log('\t%dms (%dms per cycle)', delta, delta/samples);
}
lookup(100000);

function resolve(samples) {
  console.log('resolve');
  let instance = new Unity({
    bindings: path.join(__dirname, '../test/bindings')
  });

  var timeStart = new Date().getTime();
  for(let i = 0; i < samples; i++) {
    instance.get('/root/a/1/value');
  }
  var timeEnd = new Date().getTime();
  var delta = timeEnd - timeStart;
  console.log('\t%dms (%dms per cycle)', delta, delta/samples);
}
resolve(100000);
