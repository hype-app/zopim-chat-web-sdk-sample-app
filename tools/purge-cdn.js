const fetch = require('isomorphic-fetch')

const conf = require('../package.json')

var options = {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'cache-control': 'no-cache'
  },
  body: JSON.stringify({
    path: [
      `/npm/${conf.name}`,
      `/npm/${conf.name}@${conf.version.replace(
        /(\d+\.\d+)\.\d+(?:\-.*)?/,
        '$1'
      )}`
    ]
  })
}

fetch('http://purge.jsdelivr.net/', options).then(res => res.json())
