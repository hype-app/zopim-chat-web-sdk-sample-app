#!/usr/bin/env node
/*eslint no-console:0 */
const program = require('commander')
const fetch = require('isomorphic-fetch')
const conf = require('./package.json')

function purgeCdn() {
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

  fetch('http://purge.jsdelivr.net/', options)
    .then(res => res.json())
    .then(json => console.log(json))
    .catch(err => console.error(err))
}

function downloadZendeskSdk() {
  const fs = require('fs')

  const file = fs.createWriteStream('./vendor/web-sdk.js')

  return fetch('https://dev.zopim.com/web-sdk/latest/web-sdk.js')
    .then(res => res.pipe(file))
    .then(console.log('downloaded zendesk web sdk'))
    .catch(err => console.error(err))
}

program.version(conf.version).usage('[options] <command>')

program
  .command('purge-cdn')
  .alias('pcdn')
  .description('purges the cdn cache')
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
    'clears weblogic cache updating a comment containing the project version in weblogic.xml and web.xml files'
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