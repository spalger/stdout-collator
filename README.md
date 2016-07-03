# stdout-collator

Listen to all data written to `process.stdout` and filter out sections that are wrapped in markers. The markers are written using the `startGroup()` and `endGroup()` functions.

## why??

We are using this module to collect the log output produced during text execution, and to properly attribute the log messages normally sent to the console back to the test that produced them. You might be asking, why worry about text based markers? The reason we use this strategy is so we can observe the merged output of multiple sub processes. In our setup the markers are logged by one of the child processes (the test runner) but processed by the parent process.

## example

In the scenario described above, this is in the parent process:

```js
import { bindToStdout } from 'stdout-collator'
const parser = bindToStdout()
parser.consumeReports({
  onGroupEnd(group) {
    console.log('got a group', group)
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

Register a consumer of the parser reports. Right now this is just one report implemented, `onGroupEnd`. Pass an object with an `onGroupEnd` function property and it will be called at the end of each group definition with the group object defined.

## `Group` class

The markers written to stdout indicate the beginning and end of output groups. Whenever a group is ended the parser will report a `groupEnd` and provide an instance of `Group` to the consumer.

### `group.parent : Group?`

The parent of this group, if there is one

### `group.startMark : { [key: string]: any }`

The attributes defined by the startMark

### `group.endMark : { [key: string]: any }`

The attributes defined by the endMark

### `group.output : string`

The text logged within this group
