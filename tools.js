#!/usr/bin/env node
/*eslint no-console:0 */
const program = require('commander')
const conf = require('./package.json')
const request = require('request')
const fs = require('fs')
const { promisify } = require('util')
const requestPromiseFactory = promisify(request)
const writeFilePromiseFactory = promisify(fs.writeFile)

function purgeCdn() {
  const options = {
    method: 'POST',
    url: 'https://purge.jsdelivr.net/',
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-cache'
    },
    body: JSON.stringify({
      path: [
        `/npm/${conf.name}/dist/assets/widget.js`,
        `/npm/${conf.name}@${conf.version.replace(
          /(\d+)\.\d+\.\d+(?:\-.*)?/,
          '$1'
        )}/dist/assets/widget.js`,
        `/npm/${conf.name}@${conf.version.replace(
          /(\d+\.\d+)\.\d+(?:\-.*)?/,
          '$1'
        )}/dist/assets/widget.js`
      ]
    })
  }

  console.log('purging jsdelivr cdn cache...')

  return requestPromiseFactory(options)
    .then(res => {
      console.log(res.status)

      if (res.statusCode !== 200) {
        throw new Error('fetch error')
      }
      console.log('purged jsdelivr cdn cache')
    })
    .catch(err => {
      console.error(err)
      process.exitCode = 1
    })
}

function downloadZendeskSdk() {
  console.log('downloading zendesk web sdk...')

  const options = {
    method: 'GET',
    url: 'https://dev.zopim.com/web-sdk/latest/web-sdk.js',
    headers: {
      'cache-control': 'no-cache'
    }
  }

  return requestPromiseFactory(options)
    .then(res => {
      if (res.statusCode !== 200) {
        throw new Error('fetch error')
      }

      return writeFilePromiseFactory('./vendor/web-sdk.js', res.body)
    })
    .catch(err => {
      console.error(err)
      process.exitCode = 1
    })
}

program.version(conf.version).usage('[options] <command>')

program
  .command('purge-cdn')
  .alias('pcdn')
  .description('purges the jsdelivr cdn cache')
  .action(() => {
    purgeCdn()
  })
  .on('--help', () => {
    console.log('  Examples:')
    console.log()
    console.log('    $ tools purge-cdn')
    console.log()
  })

program
  .command('download-zendesk-sdk')
  .alias('dzs')
  .description(
    'downloads the zendesk chat web sdk and places it under the vendor folder'
  )
  .action(() => {
    downloadZendeskSdk()
  })
  .on('--help', () => {
    console.log('  Examples:')
    console.log()
    console.log('    $ tools download-zendesk-sdk')
    console.log()
  })

program.parse(process.argv)

if (program.args.length === 0) program.help()
