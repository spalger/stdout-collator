import reportable from 'reportable'

import { includes } from './util'
import { concat, emptyBuffer, bufferFromString } from './buffers'
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

    this.maxTokenLen = Math.max(...this.tokens.map(t => t.length))
    this.scanBuffer = emptyBuffer
    this.stack = []

    reportable(this, [
      'onGroupStart',
      'onGroupEnd',
    ])
  }

  write(chunk, enc) {
    if (typeof chunk === 'string') {
      this.scanBuffer = concat(this.scanBuffer, bufferFromString(chunk, enc))
    } else {
      this.scanBuffer = concat(this.scanBuffer, chunk)
    }

    this.scan()
  }

  scan() {
    const match = this.tokens
      .map(token => ({
        token,
        index: this.scanBuffer.indexOf(token),
      }))
      .filter(m => m.index >= 0)
      .sort((a, b) => a.index - b.index)
      .shift()

    if (!match) {
      this.trimBuffer()
      return
    }

    if (!includes(this.expectedTokens, match.token)) {
      throw new TypeError(
        `Unexpected token ${match.token}, expected one ` +
        `of ${this.expectedTokens.join(', ')}`
      )
    }

    const { token, index } = match
    // flush the text before the token
    this.flush(this.scanBuffer.slice(0, index))
    // update the buffer to not include the token
    this.scanBuffer = this.scanBuffer.slice(index + token.length)
    // call the onToken handler
    this.onToken(token)
    // scan again until no tokens are found in the buffer
    this.scan()
  }

  trimBuffer() {
    const flushEnd = this.scanBuffer.length - this.maxTokenLen
    const toFlush = this.scanBuffer.slice(0, flushEnd)
    this.scanBuffer = this.scanBuffer.slice(flushEnd)
    this.flush(toFlush)
  }

  flush(chunk) {
    if (!chunk.length) return

    if (this.stack.length) {
      this.stack[0].write(chunk)
    } else {
      process.stdout.write(chunk)
    }
  }

  close() {
    if (this.scanBuffer.length) {
      this.output(this.scanBuffer)
      this.scanBuffer = emptyBuffer
    }
  }

  onToken(token) {
    switch (token) {
      case GROUP_START_OPEN: {
        // define group
        const group = new Group(this.stack[0])
        this.stack.unshift(group)
        this.report.onGroupStart(group)

        group.startProperty('startMark', { json: true })
        this.expectedTokens = [GROUP_START_CLOSE]
        break
      }

      case GROUP_START_CLOSE: {
        const group = this.stack[0]
        group.finishProperty('startMark')
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
        this.report.onGroupEnd(group)

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
