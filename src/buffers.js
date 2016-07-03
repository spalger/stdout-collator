export const FROM_SUPPORTS_STRINGS = (() => {
  try {
    Buffer.from('')
    return true
  } catch (err) {
    return false
  }
})()

export const bufferFromString = (str, enc) => (
  FROM_SUPPORTS_STRINGS
    ? Buffer.from(str, enc)
    : new Buffer(str, enc)
)

export const emptyBuffer = bufferFromString('')

export const concat = (a, b) =>
  Buffer.concat([a, b], a.length + b.length)
