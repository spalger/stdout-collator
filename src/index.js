import { Parser } from './Parser'

export { Parser } from './Parser'
export { Group } from './Group'
export { GroupMapper } from './GroupMapper'
export * from './marks'

export function bindToStdout() {
  const parser = new Parser()
  parser.bindToStream(process.stdout)
  process.on('beforeExit', () => {
    parser.close()
  })
  return parser
}
