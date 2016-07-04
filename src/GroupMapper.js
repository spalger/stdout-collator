export class GroupMapper {
  constructor(parser) {
    this.firstGen = []
    this.childrenByParent = new Map()

    parser.consumeReports({
      groupEnd: group => this.onGroupEnd(group),
    })
  }

  getChildren(group) {
    const children = this.childrenByParent.get(group) || []
    this.childrenByParent.set(group, children)
    return children
  }

  onGroupEnd(group) {
    const g = {
      ...group.toJSON(),
      children: this.getChildren(group),
    }

    if (group.parent) {
      this.getChildren(group.parent).push(g)
    } else {
      this.firstGen.push(g)
    }
  }

  tree() {
    return {
      root: true,
      children: this.firstGen.slice(0),
    }
  }
}
