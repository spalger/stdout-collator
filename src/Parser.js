import { format } from 'util'

import reportable from 'reportable'

import { includes } from './util'
import { Group } from './Group'
import {
  GROUP_START_OPEN,
  GROUP_START_CLOSE,
  GROUP_END_OPEN,
  GROUP_END_CLOSE,
} from './marks'

export class Parser {
  /**
   *  all tokens
   *
   *  @private
   *  @type {Array}
   */
  tokens = [
    GROUP_START_OPEN,
    GROUP_START_CLOSE,
    GROUP_END_OPEN,
    GROUP_END_CLOSE,
  ]

  /**
   *  the token(s) we expect to see next
   *
   *  @private
   *  @type {Array}
   */
  expectedTokens = [
    GROUP_START_OPEN,
  ]

  /**
   *  text we have not consumed that will be checked
   *  when this.scan() is called again
   *
   *  @private
   *  @type {String}
   */
  scanWindow = ''

  /**
   *  the stack of groups as they are created. The stack
   *  is last-in-first-out, so stack[0] represents the
   *  newest/current group
   *
   *  @private
   *  @type {Array}
   */
  stack = []

  /**
   *  The bound stream object, call `bindToStream()` to set it
   *
   *  @private
   *  @type {WritableStream}
   */
  stream = null

  /**
   *  The write function which was originally on the stream
   *  which we will restore when `restoreStreamWrite()` is called
   *  or use to flush data to the stream in `flushToStream()`
   *
   *  @private
   *  @type {function?}
   */
  originalStreamWrite = null

  /**
   *  Has a scan been requested?
   *
   *  @private
   *  @type {Boolean}
   */
  scanRequested = false

  /**
   *  Is a scan actively processing?
   *
   *  @private
   *  @type {Boolean}
   */
  scanActive = false

  /**
   *  Setup the Parser's reporter
   *  @constructor
   */
  constructor() {
    reportable(this, [
      'groupStart',
      'groupEnd',
    ])
  }


  /**
   *  Helper method for logging to the underlying stream in
   *  a fashion similar to console.log
   *
   *  @param  {...any} ...args - the values to log
   *  @return {undefined}
   */
  log(...args) {
    this.flushToStream(`${format(...args)}\n`)
  }


  /**
   *  Close the parser, restore the stream's write method,
   *  and clear our buffer. A closed parser can not be reused
   *
   *  @return {undefined}
   */
  close() {
    this.closed = true
    this.restoreStreamWrite()
    if (this.scanWindow) {
      this.scanWindow = ''
      this.flushToStream(this.scanWindow)
    }
  }

  /**
   *  Define the stream the parser should monkey-patch
   *  and hijack data from
   *
   *  @param  {WritableStream} stream
   *  @return undefined
   */
  bindToStream(stream) {
    this.stream = stream
    this.originalStreamWrite = this.stream.write
    this.flushToStream = this.originalStreamWrite.bind(this.stream)
    this.stream.write = (chunk, encoding, callback) => {
      this.write(chunk, encoding)
      if (callback) callback()
    }
  }

  /**
   *  Restore the original write method
   *  of the bound stream
   *
   *  @private
   *  @return undefined
   */
  restoreStreamWrite() {
    this.stream.write = this.originalStreamWrite
  }

  /**
   *  Write a chunk of data to the underlying stream without parsing it
   *
   *  @private
   *  @param  {String|Buffer} chunk - the data to write
   *  @return undefined
   */
  flushToStream() {
    throw new Error('bindToStream must be called before output can be flushed')
  }

  /**
   *  Write a chunk to the scan buffer and scan
   *
   *  @private
   *  @param  {String|Buffer} chunk
   *  @param  {String?} encoding
   *  @return {undefined}
   */
  write(chunk, encoding) {
    if (this.closed) {
      this.flushToStream(chunk, encoding)
    } else {
      this.scanWindow = this.scanWindow + chunk.toString('utf8')
      this.scan()
    }
  }

  /**
   *  Check the scan window for tokens and parse/collect
   *  data indicated by them. Once the first token is discovered
   *  it is passed to `onToken(token)` and then `scan()` is called
   *  again until no tokens are found in the scanWindow, at which
   *  `trimWindow()` will be called
   *
   *  @private
   *  @return undefined
   */
  scan() {
    this.scanRequested = true

    while (this.scanRequested && !this.scanActive) {
      try {
        this.scanActive = true
        this.scanRequested = false
        this.fulfillScanRequest()
      } catch (err) {
        this.close()
        throw err
      } finally {
        this.scanActive = false
      }
    }
  }

  /**
   *  The actual scan implementation, called by scan, but scan
   *  is setup to only call "fulfill" if a scan is not in progress
   *
   *  @private
   *  @return {undefined)
   */
  fulfillScanRequest() {
    const matches = this.tokens
      .map(token => ({
        token,
        index: this.scanWindow.indexOf(token),
      }))
      .filter(m => m.index >= 0)
      .sort((a, b) => a.index - b.index)

    if (!matches.length) {
      this.flush(this.trimWindow())
      return
    }

    const match = matches.shift()
    if (!includes(this.expectedTokens, match.token)) {
      throw new TypeError(
        `Unexpected token ${match.token}, expected one ` +
        `of ${this.expectedTokens.join(', ')}`
      )
    }

    const { token, index } = match
    const toFlush = this.scanWindow.slice(0, index)
    const newScanWindow = this.scanWindow.slice(index + token.length)

    // flush the text before the token
    this.flush(toFlush)
    // update the buffer to not include the token
    this.scanWindow = newScanWindow
    // call the onToken handler
    this.onToken(token)
    // scan again until no tokens are found in the buffer
    this.scan()
  }

  /**
   *  Search for partial tokens in the scan window and flush all
   *  content that does not partially match a token
   *
   *  @private
   *  @return {string} - the data trimmed from the `scanWindow`
   */
  trimWindow() {
    let maxPartialMatchLen = 0
    this.tokens.forEach(t => {
      // look for this token at the end of the scan buffer string
      // so that we can safely flush all parts of the scan window
      // that couldn't match
      for (let i = t.length - 1; i >= 0; i -= 1) {
        const partial = t.slice(0, i)
        if (this.scanWindow.slice(-i) === partial) {
          maxPartialMatchLen = Math.max(partial.length, maxPartialMatchLen)
          break
        }
      }
    })

    const flushEnd = this.scanWindow.length - maxPartialMatchLen
    const toFlush = this.scanWindow.slice(0, flushEnd)
    this.scanWindow = this.scanWindow.slice(flushEnd)
    return toFlush
  }

  /**
   *  Flush a chunk of data from the parser to the current consumer,
   *  or if there aren't any, to the stream
   *
   *  @private
   *  @param  {String|Buffer} chunk
   *  @return {undefined}
   */
  flush(chunk) {
    if (!chunk.length) return
    if (this.stack.length) {
      this.stack[0].write(chunk)
    } else {
      this.flushToStream(chunk)
    }
  }

  /**
   *  handle transitions from each token to the next
   *
   *  @private
   *  @param  {[type]} token [description]
   *  @return {[type]}       [description]
   */
  onToken(token) {
    switch (token) {
      case GROUP_START_OPEN: {
        // define group
        const group = new Group(this.stack[0])
        this.stack.unshift(group)
        group.startProperty('startMark', { json: true })
        this.expectedTokens = [GROUP_START_CLOSE]
        break
      }

      case GROUP_START_CLOSE: {
        const group = this.stack[0]
        group.finishProperty('startMark')
        this.report.groupStart(group)
        group.startProperty('output', { json: false })
        this.expectedTokens = [GROUP_START_OPEN, GROUP_END_OPEN]
        break
      }

      case GROUP_END_OPEN: {
        const group = this.stack[0]
        group.finishProperty('output')
        group.startProperty('endMark', { json: true })
        this.expectedTokens = [GROUP_END_CLOSE]
        break
      }

      case GROUP_END_CLOSE: {
        const group = this.stack.shift()
        group.finishProperty('endMark')
        this.report.groupEnd(group)

        if (this.stack.length) {
          this.expectedTokens = [GROUP_END_OPEN, GROUP_START_OPEN]
        } else {
          this.expectedTokens = [GROUP_START_OPEN]
        }
        break
      }

      default:
        throw new TypeError(`Unexpected token ${token}`)
    }
  }
}
