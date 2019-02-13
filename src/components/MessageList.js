'use strict'

import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import ChatMessage from 'components/ChatMessage'
import SystemMessage from 'components/SystemMessage'
import Avatar from 'components/Avatar'
import OfflineRedirect from 'components/OfflineRedirect'
import PrechatForm from 'components/PrechatForm'
import ChatRating from 'components/ChatRating'
import PropTypes from 'prop-types'
import { isAgent, isTrigger, anyHumanAgent } from 'utils'

class MessageList extends Component {
  constructor(props) {
    super(props)
    this.renderTyping = this.renderTyping.bind(this)
    this.renderByType = this.renderByType.bind(this)
  }

  componentDidUpdate() {
    // Scroll to bottom
    let node = ReactDOM.findDOMNode(this)
    if (node.children.length > 0) {
      node = node.children[0]
      if (node.children.length > 0) {
        setTimeout(() => {
          node.children[node.children.length - 1].scrollIntoView()
        })
      }
    }
  }

  renderByType(msg, agents, addClass) {
    switch (msg.type) {
      case 'chat.file':
      case 'chat.msg':
        return (
          <ChatMessage
            key={msg.type + msg.timestamp}
            message={msg}
            addClass={isTrigger(msg.nick) ? 'bot' : addClass}
            agent={this.props.agents[msg.nick] || msg}
          />
        )
      case 'chat.memberjoin':
      // case 'chat.wait_queue':
      case 'typing':
      case 'chat.rating':
      case 'chat.comment':
        return <SystemMessage key={msg.type + msg.timestamp} message={msg} />
      case 'chat.memberleave':
        return (
          <div key={msg.type + msg.timestamp}>
            <SystemMessage message={msg} />
            {isAgent(msg.nick) && !anyHumanAgent(agents) && !msg.hidden && (
              <ChatRating
                agent={msg}
                lastRating={this.props.lastRating}
                lastComment={this.props.lastComment}
              />
            )}
          </div>
        )
      case 'chat.request.rating':
        return (
          !msg.hidden && (
            <ChatRating
              agent={msg}
              key={msg.type + msg.timestamp}
              lastRating={this.props.lastRating}
              lastComment={this.props.lastComment}
            />
          )
        )
      case 'offline':
        return (
          !msg.hidden && (
            <OfflineRedirect
              title={msg.msg}
              subTitle={msg.subMsg}
              key={msg.type + msg.timestamp}
            />
          )
        )
      case 'prechat':
        return (
          !msg.hidden && (
            <PrechatForm title={msg.msg} key={msg.type + msg.timestamp} />
          )
        )
      case 'chat.wait_queue':
      case 'chat.queue_position':
        return null
      default:
        return (
          <div key={+new Date()}>Unhandled message: {JSON.stringify(msg)}</div>
        )
    }
  }

  renderTyping(agents) {
    const agent_names = Object.values(agents).filter(agent => agent.typing)
    return agent_names.map(agent => {
      return (
        <div key={agent.nick} className="chat-msg-container agent">
          <div className="avatar-container">
            <Avatar entity={this.props.agents[agent.nick]} />
          </div>
          <div className="chat-msg-wrapper">
            <div className="chat-msg">
              <div className="typing-indicator">
                <div className="typing-indicator-part">•</div>
                <div className="typing-indicator-part">•</div>
                <div className="typing-indicator-part">•</div>
              </div>
            </div>
          </div>
        </div>
      )
    })
  }

  renderAll(isOffline, messages, agents) {
    if (isOffline) {
      if (!messages) {
        messages = []
      }
    }

    let prev = null

    return messages.map(message => {
      let addClass = ''
      const currentNick = message.nick
      const prevNick = prev && prev.nick

      if (
        prev &&
        prev.type === message.type &&
        currentNick &&
        currentNick === prevNick
      )
        addClass = 'sibling'

      prev = message

      return this.renderByType(message, agents, addClass)
    })
  }

  render() {
    return (
      <div className="message-list-container">
        <div>
          {this.renderAll(
            this.props.isOffline,
            this.props.messages,
            this.props.agents
          )}
        </div>
        {this.renderTyping(this.props.agents)}
        {this.props.queuePosition && this.props.queuePosition > 0 ? (
          <SystemMessage
            message={{
              type: 'chat.wait_queue',
              nick: 'system.queue',
              wait_queue: this.props.queuePosition
            }}
          />
        ) : null}
      </div>
    )
  }
}

MessageList.displayName = 'MessageList'
MessageList.propTypes = {
  messages: PropTypes.array,
  agents: PropTypes.object,
  isOffline: PropTypes.bool,
  isChatting: PropTypes.bool,
  lastRating: PropTypes.string,
  lastComment: PropTypes.string,
  queuePosition: PropTypes.number
}
MessageList.defaultProps = {
  messages: [],
  agents: {}
}

export default MessageList
