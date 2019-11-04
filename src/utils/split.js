function split(arr, predicate) {
  return arr.reduce((res, next) => {
    if (!!predicate((res[res.length - 1] || [])[0], next)) {
      res = [...res, []]
    }

    res[res.length - 1] = [...res[res.length - 1], next]

    return res
  }, [])
}

// @example
// const arr = [{ a: '1' }, { a: '1' }, { a: '2' }]
// console.log(split(arr, (prev, next) => !prev || prev.a !== next.a))

module.exports = {
  split
}
