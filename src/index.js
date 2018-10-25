import '@babel/polyfill'
import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import Widget from 'components/Widget'
import { Provider } from 'react-redux'
import ChatStore from 'stores/ChatStore'
import { throwIfMissing } from 'utils'

export default class ChatWidget extends Component {
  static init = config => {
    const { selector = throwIfMissing('selector') } = config

    ReactDOM.render(
      <Provider store={ChatStore}>
        <Widget />
      </Provider>,
      document.querySelector(selector)
    )
  }

  render() {
    return <Widget />
  }
}
