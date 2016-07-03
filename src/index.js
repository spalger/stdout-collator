import { Parser } from './Parser'

export { Parser } from './Parser'
export { Group } from './Group'
export { GroupMapper } from './GroupMapper'
export * from './marks'

export function bindToStdout() {
  const parser = new Parser()
  process.stdout.writeWithoutParsing = process.stdout.write
  process.stdout.write = (chunk, encoding, callback) => {
    parser.write(chunk, encoding)
    callback()
  }
  process.on('beforeExit', () => {
    parser.close()
  })
  return parser
}
