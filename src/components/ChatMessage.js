'use strict'

import React, { Component } from 'react'
import { connect } from 'react-redux'
import Avatar from 'components/Avatar'
import ChatMedia from 'components/ChatMedia'
import { log, isAgent } from 'utils'
import zChat from 'vendor/web-sdk'
import ReactMarkdown from 'react-markdown/with-html'
import PropTypes from 'prop-types'

class ChatMessage extends Component {
  constructor(props) {
    super(props)
    this.getClassName = this.getClassName.bind(this)
    this.renderMessagePart = this.renderMessagePart.bind(this)
    this.renderOptions = this.renderOptions.bind(this)
    this.optionOnChange = this.optionOnChange.bind(this)
  }

  getClassName(msg) {
    return msg.member_type
  }

  optionOnChange(e) {
    const index = e.currentTarget.value,
      msg = this.props.message.options[index]
    zChat.sendChatMsg(msg, err => {
      if (err) {
        log('Error occured >>>', err)
        return
      }
    })
    this.props.dispatch({
      type: 'synthetic',
      detail: {
        type: 'visitor_send_msg',
        msg
      }
    })
  }

  renderOptions(options) {
    if (!options || options.length <= 0) return

    return (
      <div>
        {options.map((option, i) => {
          return (
            <div>
              <input
                type="radio"
                name="option"
                value={i}
                onChange={this.optionOnChange}
              />{' '}
              {option}
            </div>
          )
        })}
      </div>
    )
  }

  parseMessage(msg) {
    return msg
      .replace(/<a[^>]*(?:href="([^"]*)")>([^<]*)<\/a>/gi, '[$2]($1)')
      .replace(/\[\*\*([^\*]+)\*\*\]/gi, '[$1]')
  }

  renderMessagePart(msg) {
    switch (msg.type) {
      case 'chat.file':
        return <ChatMedia message={msg} />
      default:
        return (
          <div className="chat-msg">
            {isAgent(msg.nick) && <b>{msg.display_name}</b>}

            <span>
              <ReactMarkdown
                source={this.parseMessage(this.props.message.msg)}
                renderers={{
                  link: props => (
                    <a
                      href={props.href}
                      style={{ display: 'inline' }}
                      target="_blank"
                    >
                      <strong>{props.children}</strong>
                    </a>
                  )
                }}
                escapeHtml={false}
              />
            </span>
            {this.renderOptions(this.props.message.options)}
          </div>
        )
    }
  }

  render() {
    return (
      <div
        className={`chat-msg-container ${this.getClassName(
          this.props.message
        )} ${this.props.addClass}`}
      >
        <div className="avatar-container">
          <Avatar entity={this.props.agent} />
        </div>
        <span className="chat-msg-arrow" />
        <div className="chat-msg-wrapper">
          {this.renderMessagePart(this.props.message)}
        </div>
      </div>
    )
  }
}

ChatMessage.displayName = 'ChatMessage'
ChatMessage.propTypes = {
  message: PropTypes.object,
  agent: PropTypes.object,
  addClass: PropTypes.string
}
ChatMessage.defaultProps = {
  message: {
    msg: ''
  }
}

export default connect()(ChatMessage)
