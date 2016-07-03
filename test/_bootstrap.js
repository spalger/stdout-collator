/* eslint-disable */
require('babel-register')
require('source-map-support/register')

if (process.argv.indexOf('--watch') >= 0) {
  const rl = require('readline')
  rl.cursorTo(process.stdout, 0, 0)
  rl.clearScreenDown(process.stdout)
  process.stdout.write((new Date()) + ': running tests\n')
}
