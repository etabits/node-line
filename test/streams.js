'use strict'
import test from 'ava'

const CONSTANTS = require('./_constants')

const crypto = require('crypto')
const fs = require('fs')

const Line = require('../').Line

test('as first argument, followed by non-stream', t => {
  t.plan(1)
  const l = new Line([
    (contents) => contents.toString()
  ])
  return l.execute(fs.createReadStream(CONSTANTS.FNAME, CONSTANTS.CUT))
  .then(function (result) {
    t.is(result, "'use strict'\n// do NOT touch first 2 lines\n")
  })
})

test('as first argument, followed by a stream, with a context', t => {
  t.plan(2)
  const l = new Line([
    {
      stream: function () {
        t.deepEqual(this, {context: 'set'})
        return crypto.createHash('sha1')
      }
    }
  ])
  return l.execute(fs.createReadStream(CONSTANTS.FNAME, CONSTANTS.CUT), {context: 'set'})
  .then(function (result) {
    t.is(result.toString('hex'), CONSTANTS.SHA1)
  })
})

test('as returned from first call, followed by non-stream', t => {
  t.plan(1)
  const l = new Line([
    (v, done) => done(null, fs.createReadStream(CONSTANTS.FNAME, CONSTANTS.CUT)),
    (contents) => contents.toString()
  ])
  return l.execute().then(function (result) {
    t.is(result, "'use strict'\n// do NOT touch first 2 lines\n")
  })
})

test('as returned from first call, followed by a stream', t => {
  t.plan(1)
  const l = new Line([
    () => Promise.resolve(fs.createReadStream(CONSTANTS.FNAME, CONSTANTS.CUT)),
    {
      stream: () => crypto.createHash('sha1')
    }
  ])
  return l.execute().then(function (result) {
    t.is(result.toString('hex'), CONSTANTS.SHA1)
  })
})

test('as returned from first call, followed by nothing', t => {
  t.plan(1)
  const l = new Line([
    () => Promise.resolve(fs.createReadStream(CONSTANTS.FNAME, CONSTANTS.CUT))
  ])
  return l.execute().then(function (result) {
    t.is(result.toString(), CONSTANTS.STR)
  })
})
