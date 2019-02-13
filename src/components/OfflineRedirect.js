'use strict'

import React, { Component } from 'react'
import CardContainer from 'components/CardContainer'
import MessageSvg from 'components/MessageSvg'
import ActionButton from 'components/ActionButton'
import ReactCSSTransitionGroup from 'react-addons-css-transition-group'
import PropTypes from 'prop-types'

class OfflineRedirect extends Component {
  constructor(props) {
    super(props)
    this.openSupportCenter = this.openSupportCenter.bind(this)
  }

  openSupportCenter() {
    const url =
      'https://support.hype.it/hc/it/articles/360003472313-Tutti-i-contatti-dell-assistenza'
    window.open(url)
  }

  render() {
    return (
      <CardContainer
        title={this.props.title}
        addClass="offline-card"
        icon={<MessageSvg />}
      >
        <div>
          <div className="offline-subtitle">{this.props.subTitle}</div>
          <div className="offline-caption">
            Se lo desideri, puoi comunque contattarci su altri canali:
          </div>
        </div>
        <ReactCSSTransitionGroup
          className="offline-container"
          transitionName="offline-grow"
          transitionEnterTimeout={250}
          transitionLeaveTimeout={250}
        >
          <div className="offline-form">
            <div className="button-container">
              <ActionButton
                addClass="button-send"
                label="Support Center"
                onClick={this.openSupportCenter}
              />
            </div>
          </div>
        </ReactCSSTransitionGroup>
      </CardContainer>
    )
  }
}

OfflineRedirect.displayName = 'OfflineRedirect'
OfflineRedirect.propTypes = {
  onClick: PropTypes.func,
  addClass: PropTypes.string,
  title: PropTypes.string,
  subTitle: PropTypes.string
}

export default OfflineRedirect
