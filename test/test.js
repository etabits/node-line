'use strict';
const crypto = require('crypto');

var MixedPipe = require('../src/MixedPipe');
MixedPipe.prototype.log = function() {
  console.log.apply(console,arguments)
}

var pe = new MixedPipe([
  (val)=> val*2,
  (val)=> Promise.resolve(val*3),
  function add4(val, done) {
    setTimeout(function() {
      done(null, val+4)
    },1)
  },
  (val)=>'' + val,
  {
    stream: ()=>crypto.createHash('sha1')
  },
  {
    stream: ()=>crypto.createHash('md5')
  },
  (val)=>val.toString('base64'),
]);
pe.execute(5);
pe.execute(6);