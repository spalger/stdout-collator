import { expect } from 'chai'

import { Group } from '../src'
import { bufferFromString as stob } from '../src/buffers'

describe('Group', () => {
  it('defines properties by combining startProperty(), write(), and finishProperty()', () => {
    const g = new Group
    g.startProperty('name')
    g.write(stob('foo'))
    g.write(stob(' '))
    g.write(stob('bar'))
    g.finishProperty('name')
    expect(g.name).to.equal('foo bar')
  })

  it('defines properties formatted as json', () => {
    const g = new Group
    g.startProperty('meta', { json: true })
    g.write(stob('{"name":'))
    g.write(stob('"foo","age":2'))
    g.write(stob('2}'))
    g.finishProperty('meta')
    expect(g.meta).to.eql({ name: 'foo', age: 22 })
  })

  it('ensures that start and finish are called on the same property name', () => {
    expect(() => {
      const g = new Group
      g.startProperty('meta')
      g.finishProperty('meta2')
    }).to.throw()
  })

  it('ensures that start before other prop finished', () => {
    expect(() => {
      const g = new Group
      g.startProperty('meta')
      g.startProperty('meta2')
    }).to.throw()
  })

  it('ensures that finish is not called before start', () => {
    expect(() => {
      const g = new Group
      g.finishProperty('meta')
    }).to.throw()
  })

  it('ensures that finish is only called after start', () => {
    expect(() => {
      const g = new Group
      g.startProperty('meta')
      g.finishProperty('meta')
      g.finishProperty('meta')
    }).to.throw()
  })

  it('serializes written properties to pojo', () => {
    const g = new Group
    g.startProperty('name')
    g.write(stob('foo'))
    g.finishProperty('name')

    g.startProperty('stage')
    g.write(stob('beta'))
    g.finishProperty('stage')

    g.bar = true

    expect(g.toJSON()).to.eql({ name: 'foo', stage: 'beta' })
  })
})
