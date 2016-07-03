import { expect } from 'chai'
import {
  Parser,
  GroupMapper,
  GROUP_START_OPEN,
  GROUP_START_CLOSE,
  GROUP_END_OPEN,
  GROUP_END_CLOSE,
} from '../src'

const start = m =>
  `${GROUP_START_OPEN}${JSON.stringify({ mark: 'start', ...m })}${GROUP_START_CLOSE}`

const end = m =>
  `${GROUP_END_OPEN}${JSON.stringify({ mark: 'end', ...m })}${GROUP_END_CLOSE}`

describe.only('Parser', () => {
  context('several nested tests', () => {
    it('produces the correct tree', () => {
      const m = new Parser()
      const tracker = new GroupMapper(m)

      m.write(start({ suite: 'discover' }))
      m.write(start({ suite: 'field-list' }))
      m.write(start({ suite: 'field' }))
      m.write(start({ test: 'is a field' }))
      m.write('try for timeout\n')
      m.write('try for timeout\n')
      m.write('try for timeout\n')
      m.write('try for timeout\n')
      m.write('try for timeout\n')
      m.write(end({ test: 'is a field', success: true }))
      m.write(end({ suite: 'field' }))
      m.write(end({ suite: 'field-list' }))
      m.write(end({ suite: 'discover' }))

      const tree = tracker.tree()

      expect(tree.children).to.have.length(1)
      expect(tree.children[0].startMark).to.include({ suite: 'discover' })
      expect(tree.children[0].endMark).to.include({ suite: 'discover' })

      const gchildren = tree.children[0].children
      expect(gchildren).to.have.length(1)
      expect(gchildren[0].startMark).to.include({ suite: 'field-list' })
      expect(gchildren[0].endMark).to.include({ suite: 'field-list' })

      const ggchildren = tree.children[0].children[0].children
      expect(ggchildren).to.have.length(1)
      expect(ggchildren[0].startMark).to.include({ suite: 'field' })
      expect(ggchildren[0].endMark).to.include({ suite: 'field' })

      const gggchildren = tree.children[0].children[0].children[0].children
      expect(gggchildren).to.have.length(1)
      expect(gggchildren[0].startMark).to.include({ test: 'is a field' })
      expect(gggchildren[0].startMark).to.not.have.key('success')
      expect(gggchildren[0].endMark).to.include({ test: 'is a field', success: true })
    })
  })
})
