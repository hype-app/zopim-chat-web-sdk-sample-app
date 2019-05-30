'use strict'

import React, { Component } from 'react'
import CardContainer from 'components/CardContainer'
import MessageSvg from 'components/MessageSvg'
import ActionButton from 'components/ActionButton'
import { log } from 'utils'
import { connect } from 'react-redux'
import zChat from 'vendor/web-sdk'
import PropTypes from 'prop-types'

class PrechatForm extends Component {
  constructor(props) {
    super(props)
    this.state = {
      sent: false
    }
    this.send = this.send.bind(this)
    this.renderChild = this.renderChild.bind(this)

    this.nameInput = React.createRef()
    this.emailInput = React.createRef()
    this.phoneInput = React.createRef()
    this.messageInput = React.createRef()
  }

  send(event) {
    event.preventDefault()
    const msg = this.messageInput.current.value

    // Don't send empty messages
    if (!msg) return

    zChat.setVisitorInfo(
      {
        display_name: this.nameInput.current.value,
        email: this.emailInput.current.value,
        phone: this.phoneInput.current.value
      },
      err => {
        if (err) return

        this.props.dispatch({
          type: 'chat',
          detail: {
            type: 'chat.bot.settings',
            active: false
          }
        })

        zChat.sendChatMsg(msg, err => {
          if (err) log('Error sending message')
        })
      }
    )

    this.props.dispatch({
      type: 'synthetic',
      detail: {
        type: 'visitor_send_msg',
        msg: msg
      }
    })
  }

  renderChild() {
    const visitorInfo = zChat.getVisitorInfo()
    return (
      <form key="not-sent" className="offline-form">
        <div className="content">
          <div className="section">
            <label className="label">Nome e Cognome</label>
            <input
              ref={this.nameInput}
              defaultValue={
                visitorInfo &&
                !/visitor\s\d+/i.test(visitorInfo.display_name) &&
                visitorInfo.display_name
                  ? visitorInfo.display_name
                  : ''
              }
            />
          </div>
          <div className="section">
            <label className="label">Email</label>
            <input
              ref={this.emailInput}
              defaultValue={visitorInfo && visitorInfo.email}
            />
          </div>
          <div className="section">
            <label className="label">Telefono</label>
            <input
              ref={this.phoneInput}
              defaultValue={visitorInfo && visitorInfo.phone}
            />
          </div>
          <div className="section">
            <label className="label">Messaggio</label>
            <textarea ref={this.messageInput} />
          </div>
        </div>
        <div className="button-container">
          <div class="privacy-caption">
            Ti informiamo che i dati da te forniti sono e saranno utilizzati con
            la sola finalità di portare a termine la tua richiesta.
          </div>
          <ActionButton
            addClass="button-send"
            label="Invia"
            onClick={this.send}
          />
        </div>
      </form>
    )
  }

  render() {
    return (
      <CardContainer
        title={this.props.title}
        addClass="offline-card"
        contentAddClass={this.state.sent ? 'sent' : ''}
        icon={<MessageSvg />}
      >
        {this.renderChild()}
      </CardContainer>
    )
  }
}

PrechatForm.displayName = 'PrechatForm'
PrechatForm.propTypes = {
  onClick: PropTypes.func,
  addClass: PropTypes.string,
  title: PropTypes.string
}

export default connect()(PrechatForm)
