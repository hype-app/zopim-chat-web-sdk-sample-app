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

export function isChatBot(nick) {
  return nick.startsWith('agent:trigger:qnabot')
}

export function anyHumanAgent(agents) {
  return Object.keys(agents).filter(k => !isTrigger(agents[k].nick)).length > 0
}

/**
 * notifies an incoming message to the user
 * @param {string} body body
 * @param {string} icon icon
 * @param {string} title title
 * @return {Notification} notification
 */
export function notify(body, icon, title) {
  let notification

  const options = {
    body,
    icon
  }

  // Let's check if the browser supports notifications
  if (!('Notification' in window)) {
    // alert('This browser does not support desktop notification')
    return
  }

  // Let's check whether notification permissions have already been granted
  else if (Notification.permission === 'granted') {
    // If it's okay let's create a notification
    notification = new Notification(title, options)
  }

  // Otherwise, we need to ask the user for permission
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      // If the user accepts, let's create a notification
      if (permission === 'granted') {
        notification = new Notification(title, options)
      }
    })
  }

  // At last, if the user has denied notifications, and you
  // want to be respectful there is no need to bother them any more.

  return notification
}

export * from './PersistentStorage'
