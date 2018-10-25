import config from 'config'
const { ENV } = config

export function log() {
  if (ENV === 'dev') {
    console.log.apply(console, arguments) // eslint-disable-line no-console
  }
}

export function isAgent(nick) {
  return nick.startsWith('agent:')
}

export function isTrigger(nick) {
  return nick.startsWith('agent:trigger')
}

export function anyHumanAgent(agents) {
  return Object.keys(agents).filter(k => !isTrigger(agents[k].nick)).length > 0
}

/**
 * Throws an exception specifying with param is missing
 *
 * @function throwIfMissing
 * @param  {string} param parameter
 * @return {undefined}    undefined
 */
export function throwIfMissing(param) {
  throw `Missing required argument: '${param}'.`
}

export * from './PersistentStorage'
