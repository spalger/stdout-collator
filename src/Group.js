import { concat, emptyBuffer } from './buffers'

export class Group {
  constructor(parent) {
    this.props = {}
    Object.defineProperty(this, 'parent', {
      enumerable: false,
      value: parent,
    })
  }

  startProperty(name, { json }) {
    if (this.pendingProp) {
      throw new Error('property consumers have to be finished before a new one can be defined')
    }

    const acc = emptyBuffer
    this.pendingProp = { name, json, acc }
  }

  write(chunk) {
    const prop = this.pendingProp
    if (!prop) throw new Error('no pending property to write in group')
    prop.acc = concat(prop.acc, chunk)
  }

  finishProperty(name) {
    const prop = this.pendingProp

    if (!prop) {
      throw new Error('group does not have a pending property to finish')
    }

    if (prop.name !== name) {
      throw new Error('property finish teardown mismatch')
    }

    this.props[name] = prop.acc.toString('utf8')
    if (prop.json) this.props[name] = JSON.parse(this.props[name])
    this.pendingProp = null
  }

  toJSON() {
    return this.props
  }
}
