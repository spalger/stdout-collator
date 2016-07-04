# stdout-collator

Listen to all data written to `process.stdout` and filter out sections that are wrapped in markers. The markers are written using the `startGroup()` and `endGroup()` functions.

## why??

We are using this module to collect the log output produced during text execution, and to properly attribute the log messages normally sent to the console back to the test that produced them. You might be asking, why worry about text based markers? The reason we use this strategy is so we can observe the merged output of multiple sub processes. In our setup the markers are logged by one of the child processes (the test runner) but processed by the parent process.

## example

In the scenario described above, this is in the parent process:

```js
import { format } from 'util'
import { bindToStdout } from 'stdout-collator'

const parser = bindToStdout()

// Notice how the report consumers don't use console.log!
// Doing so would pollute the parser, instead use stderr,
// or parser.log.
parser.consumeReports({
  groupStart(group) {
    parser.log('group started', group.startMark)
  },

  groupEnd(group) {
    parser.log('group ended', group.endMark)
  }
})
```

And then, in the child process, at the beginning and end of each test, code similar to this is run:
```js
import { startGroup, endGroup } from 'stdout-collator'
describe('root suite', () => {
  beforeEach(() => {
    startGroup({ testName: this.name })
  })

  afterEach(() => {
    startGroup({ testName: this.name, success: this.success, time: this.ms })
  })
})
```

## api

### `bindToStdout(): Parser`

Call this method to create a parser that is bound to stdout. You should only call this once, and there isn't currently any way to tear this method down. The created parser is returned

## `Parser` class

The Parser class is responsible for tracking and scanning all of the chunks written to stdout, finding the markers in the output, parsing the attributes of each mark, and emitting Group objects

### `parser.consumeReports({ [reportName: string]: (any?) => void })`

Register a consumer of the parser reports. Right now there are two reports; `groupStart` and `groupEnd`. Pass an object with with function properties matching these report names and they will be called with `Group` objects at the correct time.

## `Group` class

The markers written to stdout indicate the beginning and end of output groups. Whenever a start mark is fully parsed a `groupStart` will be reported. Once the end of a group is parsed a `groupEnd` will be reported. Both of these reports provide the consumer the group instance, and only certain properties will be available at certain points:

### `group.parent : Group?`

_available at all times_

The parent of this group, if there is one

### `group.startMark : { [key: string]: any }`

_available in the `groupStart` and `groupEnd` report handler_

The attributes defined by the startMark

### `group.endMark : { [key: string]: any }`

_available in the `groupEnd` report handler_

The attributes defined by the endMark

### `group.output : string`

_available in the `groupEnd` report handler_

The text logged within this group
