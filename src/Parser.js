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
  constructor() {
    this.tokens = [
      GROUP_START_OPEN,
      GROUP_START_CLOSE,
      GROUP_END_OPEN,
      GROUP_END_CLOSE,
    ]

    this.expectedTokens = [
      GROUP_START_OPEN,
    ]

    this.scanWindow = ''
    this.stack = []

    reportable(this, [
      'groupStart',
      'groupEnd',
    ])
  }

  bindToStream(stream) {
    this.stream = stream
    const originalWrite = this.stream.write
    this.restoreStreamWrite = () => {
      this.stream.write = originalWrite
    }

    this.writeOut = originalWrite.bind(this.stream)
    this.stream.write = (chunk, encoding, callback) => {
      this.write(chunk, encoding)
      if (callback) callback()
    }
  }

  write(chunk, encoding) {
    if (this.closed) {
      this.writeOut(chunk, encoding)
    } else {
      this.scanWindow = this.scanWindow + chunk.toString('utf8')
      this.scan()
    }
  }

  scanRequested = false
  scanActive = false
  scan = () => {
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

  log(...args) {
    this.writeOut(`${format(...args)}\n`)
  }

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

  flush(chunk) {
    if (!chunk.length) return
    if (this.stack.length) {
      this.stack[0].write(chunk)
    } else {
      this.writeOut(chunk)
    }
  }

  close() {
    this.closed = true
    this.restoreStreamWrite()
    if (this.scanWindow) {
      this.scanWindow = ''
      this.writeOut(this.scanWindow)
    }
  }

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
