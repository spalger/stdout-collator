import { expect } from 'chai'

import { Group } from '../src'

describe('Group', () => {
  it('defines properties by combining startProperty(), write(), and finishProperty()', () => {
    const g = new Group
    g.startProperty('name')
    g.write('foo')
    g.write(' ')
    g.write('bar')
    g.finishProperty('name')
    expect(g.name).to.equal('foo bar')
  })

  it('defines properties formatted as json', () => {
    const g = new Group
    g.startProperty('meta', { json: true })
    g.write('{"name":')
    g.write('"foo","age":2')
    g.write('2}')
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
    g.write('foo')
    g.finishProperty('name')

    g.startProperty('stage')
    g.write('beta')
    g.finishProperty('stage')

    g.bar = true

    expect(g.toJSON()).to.eql({ name: 'foo', stage: 'beta' })
  })
})
