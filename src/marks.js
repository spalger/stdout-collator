
export const GROUP_START_OPEN = '@{open#StartLogGroup}'
export const GROUP_START_CLOSE = '@{close#StartLogGroup}'
export const GROUP_END_OPEN = '@{open#EndLogGroup}'
export const GROUP_END_CLOSE = '@{close#EndLogGroup}'

export const makeStartGroupMark = (m = {}) =>
  `${GROUP_START_OPEN}${JSON.stringify({ mark: 'start', ...m })}${GROUP_START_CLOSE}`

export const makeEndGroupMark = (m = {}) =>
  `${GROUP_END_OPEN}${JSON.stringify({ mark: 'end', ...m })}${GROUP_END_CLOSE}`

export const startGroup = m => {
  process.stdout.write(makeStartGroupMark(m))
}

export const endGroup = m => {
  process.stdout.write(makeEndGroupMark(m))
}
