'use strict';
const stream = require('stream');

const utilities = require('./utilities')

class Line {

  constructor(segments) {
    this.segments = segments.map(utilities.expandSegment);
  }

  execute(value, ctxt, cb) {
    if ('function'==typeof ctxt) {
      cb = ctxt;
      ctxt = {};
    }
    this.log('executing on', value)
    var p;
    if (!cb) {
      var resolve, reject;
      cb = function(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
      p = new Promise(function(rs, rj){
        resolve = rs;
        reject = rj;
      });
    }
    this.next(0, value, ctxt || {}, cb)

    return p;
  }

  next (step, value, ctxt, cb) {
    var self = this;
    var segment = this.segments[step];
    if (!segment) {
      self.log('finished!', value);
      cb(null, value)
      return;
    }
    var isReadableStream = value instanceof stream.Readable;
    self.log(step, segment.name || 'anon', value);
    if ('stream'==segment.type) {
      var firstStream, lastStream;
      for (var streamsEnd = step;
        this.segments[streamsEnd] && this.segments[streamsEnd].stream;
        ++streamsEnd) {
        var streamSegment = this.segments[streamsEnd];
        var currentStream = streamSegment.stream();
        if (!firstStream) {
          firstStream = currentStream;
        } else {
          lastStream.pipe(currentStream);
          self.log('found another stream at', streamsEnd, 'name=', streamSegment.name)
        }
        lastStream = currentStream;
      }

      utilities.bufferStream(lastStream, function(err, buf) {
        self.log('\tstream end', buf.toString('hex'));
        self.next(streamsEnd, buf, ctxt, cb);
      })

      if (isReadableStream) {
        value.pipe(firstStream)
      } else {
        firstStream.write(value);
        firstStream.end();
      }
    } else {
      if (isReadableStream) {
        utilities.bufferStream(value, function(err, buf) {
          self.next(step, buf, ctxt, cb);
        })
        return;
      }
      Line.resolveSegment(segment, value, ctxt, function(error, newValue, inferredType) {
        if (error) {
          return cb({error, step, value, ctxt});
        }
        self.log(`\t${inferredType} ret`, newValue)
        self.next(step+1, newValue, ctxt, cb);

      })
    }
  }

  static resolveSegment(segment, value, ctxt, done) {
    var ret;
    var asyncCallback;
    if ('async'==segment.type || 'auto'==segment.type) {
      asyncCallback = (error, value)=> done(error, value, 'async');
    }
    try {
      ret = segment.func.call(ctxt, value, asyncCallback);
    } catch (error) {
      return done(error);
    }
    if (('undefined'==typeof ret && 'auto'==segment.type) || 'async'==segment.type) {
      // it was async, do nothing!
    } else if (ret instanceof Promise) {
      ret
      .then((newValue)=>done(null, newValue, 'promise'))
      .catch((error)=> done(error))
    } else {
      done(null, ret, 'sync');
    }
  }

  log() {}
}

module.exports = Line;

