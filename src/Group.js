import { concat, emptyBuffer } from './buffers'
import { includes } from './util'

const pendingProp = new WeakMap()

export class Group {
  constructor(parent) {
    Object.defineProperties(this, {
      parent: {
        enumerable: false,
        value: parent,
      },
      props: {
        enumerable: false,
        value: [],
      },
    })
  }

  startProperty(name, { json } = {}) {
    if (pendingProp.get(this)) {
      throw new Error('property consumers have to be finished before a new one can be defined')
    }

    if (includes(this.props, name)) {
      throw new Error(`property ${name} already defined`)
    }

    if (name in this) {
      throw new Error(`Unable to redefine built-in property ${name}`)
    }

    const acc = emptyBuffer
    pendingProp.set(this, { name, json, acc })
    this.props.push(name)
  }

  write(chunk) {
    const prop = pendingProp.get(this)
    if (!prop) throw new Error('no pending property to write in group')
    prop.acc = concat(prop.acc, chunk)
  }

  finishProperty(name) {
    const prop = pendingProp.get(this)

    if (!prop) {
      throw new Error('group does not have a pending property to finish')
    }

    if (prop.name !== name) {
      throw new Error('property finish teardown mismatch')
    }

    this[name] = prop.acc.toString('utf8')
    if (prop.json) this[name] = JSON.parse(this[name])
    pendingProp.delete(this)
  }

  toJSON() {
    return this.props.reduce((acc, prop) => ({
      ...acc,
      [prop]: this[prop],
    }), {})
  }
}
