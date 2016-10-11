/*!
 * create-readdir-stream <https://github.com/tunnckoCore/create-readdir-stream>
 *
 * Copyright (c) 2016 Charlike Mike Reagent <@tunnckoCore> (http://www.tunnckocore.tk)
 * Released under the MIT license.
 */

'use strict'

var path = require('path')
var utils = require('./utils')

/**
 * > Initialize `CreateReaddirStream` with default `options`.
 *
 * **Example**
 *
 * ```js
 * const inst = require('create-readdir-stream')
 *
 * console.log(inst.use) // => 'function'
 * console.log(inst.createReaddirStream) // => 'function'
 *
 * // or get constructor
 * const Readdir = require('create-readdir-stream').CreateReaddirStream
 * ```
 *
 * @param {Object} `[options]` one of them is `cwd`.
 * @api public
 */

function CreateReaddirStream (options) {
  if (!(this instanceof CreateReaddirStream)) {
    return new CreateReaddirStream(options)
  }

  utils.use(this)
  this.initDefaults(options)
}

var proto = CreateReaddirStream.prototype

/**
 * > Initial defaults and initializing of empty
 * and forced [through2][] object mode stream.
 *
 * @name   .initDefaults
 * @param  {Object} `[options]` optional
 * @return {CreateReaddirStream} this instance for chaining
 * @api private
 */

proto.initDefaults = function initDefaults (options) {
  this.options = utils.extend({
    cwd: process.cwd(),
    file: {
      include: true,
      exclude: false,
      options: {}
    }
  }, options, {
    objectMode: true
  })
  this.stream = utils.through2(this.options)
  return this
}

/**
 * > Reads a `dir` contents, creates [vinyl][] file
 * from each filepath, after that push them to stream.
 *
 * @name   .createReaddirStream
 * @param  {String|Buffer} `<dir>` buffer or string folder/directory to read
 * @param  {Object} `[options]` options are [extend-shallow][]ed with `this.options`
 * @return {Stream} Transform Stream, [through2][]
 * @api public
 */

proto.createReaddirStream = function createReaddirStream (dir, options) {
  dir = utils.isBuffer(dir) ? dir.toString() : dir

  if (typeof dir !== 'string') {
    var msg = 'expect `dir` to be a string or Buffer'
    throw new TypeError('[create-readdir-stream] .readdir: ' + msg)
  }

  this.options = utils.extend(this.options, options)
  this.rootDir = path.resolve(this.options.cwd, dir)

  utils.fs.readdir(this.rootDir, function (err, paths) {
    if (err) {
      var message = err.message
      err.message = '[create-readdir-stream] .readdir: '
      err.message += message

      this.stream.emit('error', err)
      return
    }
    if (!paths.length) {
      var msg = 'directory is empty: ' + this.rootDir
      var er = new Error('[create-readdir-stream] .readdir: ' + msg)
      this.stream.emit('error', er)
      return
    }

    this.paths = paths

    // Should return paths!
    // Perfect place for globbing library
    // such as `micromatch`
    if (typeof this.options.plugin === 'function') {
      this.paths = this.options.plugin.call(this, this.paths)
    }

    // Change all paths to Vinyl files
    // and push them to stream.
    this.paths.forEach(function (fp, idx) {
      // Allow user to add to
      // each file what he want
      var config = utils.extend(this.options.file, {
        cwd: this.options.cwd,
        path: path.join(this.rootDir, fp)
      })

      // Write to instance intentionally and after
      // that pass it to each plugin.
      this.file = new utils.File(config)

      // Each plugin's `this` context is the File
      // So this allows to modify through using `this`
      // in the plugin, instead of only `file` argument.
      // For example `this.path = 'foobar'` or `file.path = 'foobar'`
      // both would work.
      this.run(this.file)

      // Allow users to choose which file should be pushed to stream.
      // For example:
      // pass `file.exclude = true` or `file.include = false` to some
      // file and it won't be pushed to the stream.
      if (this.file.include === true && this.file.exclude === false) {
        this.stream.push(this.file)
      }

      var shouldClose = (idx + 1) === this.paths.length
      if (shouldClose) {
        this.stream.push(null)
      }
    }, this)
  }.bind(this))

  return this.stream
}

/**
 * Expose `CreateReaddirStream` instance
 *
 * @type {Object}
 * @api private
 */

module.exports = new CreateReaddirStream()

/**
 * Expose `CreateReaddirStream` constructor
 *
 * @type {Function}
 * @api private
 */

module.exports.CreateReaddirStream = CreateReaddirStream
