import 'styles/Widget.scss'

import config from 'config'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import StatusContainer from 'components/StatusContainer'
import MessageList from 'components/MessageList'
import ChatButton from 'components/ChatButton'
import Input from 'components/Input'
import { log, get, set, isAgent, isChatBot, anyHumanAgent } from 'utils'
import { debounce, groupBy } from 'lodash'
import zChat from 'vendor/web-sdk'
import qnaChat from '../sdk/qna-sdk'
import moment from 'moment-business-days-it'
import PropTypes from 'prop-types'

const { ENV, THEME } = config

if (ENV === 'dev') {
  window.zChat = zChat
}

class App extends Component {
  constructor() {
    super()
    this.state = {
      theme: THEME,
      typing: false,
      visible: false
    }
    this.timer = null
    this.handleOnSubmit = this.handleOnSubmit.bind(this)
    this.handleOnChange = this.handleOnChange.bind(this)
    this.getVisibilityClass = this.getVisibilityClass.bind(this)
    this.minimizeOnClick = this.minimizeOnClick.bind(this)
    this.chatButtonOnClick = this.chatButtonOnClick.bind(this)
    this.mapToEntities = this.mapToEntities.bind(this)
    this.isOffline = this.isOffline.bind(this)
    this.stopTyping = debounce(this.stopTyping.bind(this), 1000)
    this.setVisible = this.setVisible.bind(this)
    this.setTheme = this.setTheme.bind(this)
    this.handleFileUpload = this.handleFileUpload.bind(this)

    this.textInput = React.createRef()
  }

  componentDidMount() {
    this.props.onRef(this)

    qnaChat.init({
      account_key: this.props.botAccountKey,
      endpoint: this.props.botEndpoint,
      services_check_url: this.props.servicesCheckUrl
    })
    zChat.init({
      account_key: this.props.chatAccountKey
    })

    const events = [
      'account_status',
      'connection_update',
      'department_update',
      'visitor_update',
      'agent_update',
      'chat',
      'error'
    ]

    events.forEach(evt => {
      zChat.on(evt, data => {
        this.props.dispatch({
          type: evt,
          detail: data
        })
      })
    })

    // Expose onThemeChange to allow dynamic change of theme
    if (ENV === 'dev') {
      window.onThemeChange = this.onThemeChange.bind(this)
    }

    this.setState({
      visible: get('visible') || this.state.visible,
      theme: get('theme') || this.state.theme
    })

    window.addEventListener(
      'storage',
      () => {
        if (get('visible') !== this.state.visible) {
          this.setState({
            visible: get('visible')
          })
        }
      },
      false
    )
  }

  UNSAFE_componentWillMount() {
    if (
      location.href.toLowerCase().includes('tutti-i-contatti-dell-assistenza')
    ) {
      this.setVisible(false)
    }
  }

  componentWillUnmount() {
    this.props.onRef(undefined)
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (
      this.props.data.connection !== 'connected' &&
      nextProps.data.connection === 'connected'
    ) {
      if (!this.props.data.chatbot.chatOperatorSettings) {
        this.getServicesStatus()
      }
    } else if (nextProps.data.connection === 'connected') {
      const [lastMessage] =
        nextProps.data && nextProps.data.chats.toArray().slice(-1)

      if (!!nextProps.data.chatbot.active) {
        if (!lastMessage) {
          this.props.dispatch({
            type: 'chat',
            detail: {
              type: 'chat.msg',
              nick: `agent:trigger:${nextProps.botName}`,
              display_name: nextProps.botName,
              member_type: 'agent',
              timestamp: +new Date(),
              msg: `Ciao sono ${nextProps.botName} e puoi chiedermi quello che vuoi!`
            }
          })
        }
      }

      if (!!lastMessage) {
        if (!nextProps.data.chatbot.active) {
          /**
           * enable this statement to activate the chatbot on agent leave
           * despite the chat won't be closed until the feedback will be received
           */
          if (
            isAgent(lastMessage.nick) &&
            lastMessage.type === 'chat.memberleave' &&
            !anyHumanAgent(nextProps.data.agents)
          ) {
            nextProps.dispatch({
              type: 'chat',
              detail: {
                type: 'chat.bot.settings',
                active: true
              }
            })
          }
        } else {
          /**
           * enable this statement to activate the chatbot on agent join
           * despite the chat won't be closed until the feedback will be received
           */
          if (
            isAgent(lastMessage.nick) &&
            lastMessage.type === 'chat.memberjoin'
          ) {
            nextProps.dispatch({
              type: 'chat',
              detail: {
                type: 'chat.bot.settings',
                active: false
              }
            })
          }
        }

        if (!this.state.visible) {
          switch (lastMessage.type) {
            case 'chat.file':
            case 'chat.request.rating':
            case 'chat.msg':
              if (
                isAgent(lastMessage.nick) &&
                !isChatBot(lastMessage.nick, nextProps.botName)
              ) {
                this.setVisible(true)
              }
          }
        }
      }
    }
  }

  handleOnChange() {
    if (!this.state.typing) {
      zChat.sendTyping(true)
      this.setState({ typing: true })
    }
    this.stopTyping()
  }

  stopTyping() {
    if (!this.state.typing) return

    zChat.sendTyping(false)
    this.setState({ typing: false })
  }

  setVisitorInfo(info) {
    zChat.setVisitorInfo(info, err => {
      if (err) log('Error setting visitor info')
    })
  }

  handleOnSubmit(event) {
    event && event.preventDefault()

    const msg = this.textInput.current.getRawInput().value

    // Don't send empty messages
    if (!msg) return

    // Don't allow visitor to send msg if not chatting
    if (this.isOffline()) {
      this.textInput.current.getRawInput().value = ''

      this.props.dispatch({
        type: 'chat',
        detail: {
          type: 'chat.msg',
          nick: 'visitor:anonymous',
          display_name: 'Tu',
          member_type: 'visitor',
          timestamp: +new Date(),
          msg
        }
      })

      if (this.checkKeyword(msg)) {
        this.handleRequestOperator(true)
        return
      }

      const { minConfidence } = this.props.data.chatbot

      this.props.dispatch({
        type: 'chat',
        detail: {
          type: 'typing',
          nick: `agent:trigger:${this.props.botName}`,
          typing: true
        }
      })

      qnaChat
        .sendChatMsg(msg)
        .then(json => {
          if (!json.answers) {
            this.props.dispatch({
              type: 'chat',
              detail: {
                type: 'chat.msg',
                nick: `agent:trigger:${this.props.botName}`,
                display_name: this.props.botName,
                member_type: 'agent',
                timestamp: +new Date(),
                msg:
                  'Si è verificato un errore imprevisto. Riprova tra qualche minuto!'
              }
            })
          } else if (json.answers[0].score >= minConfidence) {
            this.props.dispatch({
              type: 'chat',
              detail: {
                type: 'chat.msg',
                nick: `agent:trigger:${this.props.botName}`,
                display_name: this.props.botName,
                member_type: 'agent',
                timestamp: +new Date(),
                msg: json.answers[0].answer
              }
            })
          } else {
            this.handleRequestOperator()
          }

          this.props.dispatch({
            type: 'chat',
            detail: {
              type: 'typing',
              nick: `agent:trigger:${this.props.botName}`,
              typing: false
            }
          })

          return json
        })
        .catch(err => {
          this.textInput.current.getRawInput().value = ''
          if (err) {
            log('Error occured >>>', err)

            this.props.dispatch({
              type: 'chat',
              detail: {
                type: 'typing',
                nick: `agent:trigger:${this.props.botName}`,
                typing: false
              }
            })
          }
          return
        })

      return
    }

    // Immediately stop typing
    this.stopTyping.flush()
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
    this.textInput.current.getRawInput().value = ''
  }

  handleFileUpload(event) {
    event.preventDefault()

    // Don't allow visitor to send file if offline
    if (this.isOffline()) return

    // Only send the first file dropped on input
    const file = event.dataTransfer
      ? event.dataTransfer.files[0]
      : event.target.files[0]

    // Generate attachment object for local echo
    const attachment = {
      mime_type: file.type,
      name: file.name,
      size: file.size,
      url: window.URL.createObjectURL(file)
    }

    zChat.sendFile(file, err => {
      if (err) {
        log('Error occured >>>', err)
        return
      }
    })

    this.props.dispatch({
      type: 'synthetic',
      detail: {
        type: 'visitor_send_file',
        attachment
      }
    })
  }

  checkKeyword(word) {
    const { keywords } = this.props.data.chatbot

    const cleanWord = word.trim().toLowerCase()

    return (
      keywords &&
      keywords.reduce((res, k) => {
        const lk = k.toLowerCase()

        return res || cleanWord.includes(lk)
      }, false)
    )
  }

  handleRequestOperator(intentional) {
    if (!!this.areOperatorsAvaliable()) {
      this.props.dispatch({
        type: 'chat',
        detail: {
          type: 'prechat',
          nick: `agent:trigger:${this.props.botName}`,
          display_name: this.props.botName,
          member_type: 'agent',
          timestamp: +new Date(),
          msg: `${
            !intentional ? 'Non riesco a rispondere alla tua domanda. ' : ''
          }Vuoi essere messo in contatto con un operatore? Presentati!`
        }
      })
    } else {
      this.props.dispatch({
        type: 'chat',
        detail: {
          type: 'offline',
          nick: `agent:trigger:${this.props.botName}`,
          display_name: this.props.botName,
          member_type: 'agent',
          timestamp: +new Date(),
          msg: `${
            !intentional
              ? 'Non riesco a rispondere alla tua domanda e al momento non ci sono operatori disponibili.'
              : 'Al momento non ci sono operatori disponibili.'
          }`,
          subMsg: this.getOperatorAvailabilityString()
        }
      })
    }
  }

  getSchedules() {
    const zChatOperatorSettings = zChat.getOperatingHours()
    const schedules =
      zChatOperatorSettings[`${zChatOperatorSettings.type}_schedule`]

    if (zChatOperatorSettings.type === 'department') {
      return Object.keys(schedules).reduce((res, next) => {
        if (!res) {
          res = schedules[next]
        } else {
          res = Object.keys(res).map(dk => [...res[dk], ...schedules[next][dk]])
        }
        return res
      }, null)
    }
    return schedules
  }

  getServicesStatus() {
    return qnaChat.getServicesStatus().then(json => {
      if (json.hypeNoAuthServiceList) {
        const chatBotSettings = json.hypeNoAuthServiceList.find(
          x => x.service === 'CHATBOT'
        )

        const zChatOperatorSettings = zChat.getOperatingHours()

        const currClientDate = new Date()

        const schedules = this.getSchedules()

        const currDayProperSchedule = schedules[`${currClientDate.getDay()}`]
          .map(o => {
            o.startDate = new Date()
            o.endDate = new Date()
            o.startDate.setHours(0, o.start, 0, 0)
            o.endDate.setHours(0, o.end, 0, 0)
            return o
          })
          .find(o => o.startDate < currClientDate && o.endDate > currClientDate)

        let chatOperatorSettings = {
          ...json.hypeNoAuthServiceList.find(x => x.service === 'CHAT'),
          status: zChatOperatorSettings.enabled ? 'ACTIVE' : 'INACTIVE'
        }
        if (!!currDayProperSchedule) {
          chatOperatorSettings = {
            ...chatOperatorSettings,
            startTime: currDayProperSchedule.startDate
              .toTimeString()
              .replace(/(\d+\:\d+).*/, '$1'),
            endTime: currDayProperSchedule.endDate
              .toTimeString()
              .replace(/(\d+\:\d+).*/, '$1')
          }
        } else {
          chatOperatorSettings = {
            ...chatOperatorSettings,
            startTime: currClientDate
              .toTimeString()
              .replace(/(\d+\:\d+).*/, '$1'),
            endTime: currClientDate.toTimeString().replace(/(\d+\:\d+).*/, '$1')
          }
        }

        const keywords = [
          ...new Set([
            ...this.props.keywords.map(k => k.toLowerCase()),
            ...JSON.parse(chatOperatorSettings.addtInfo).keywords.map(k =>
              k.toLowerCase()
            )
          ])
        ].filter(k => !!k)

        const isBotActive =
          get('chatbotActive') === undefined
            ? this.isServiceActive(chatBotSettings)
            : get('chatbotActive')

        if (isBotActive) {
          this.props.dispatch({
            type: 'agent_update',
            detail: {
              display_name: this.props.botName,
              nick: `agent:trigger:${this.props.botName}`,
              member_type: 'agent',
              bot: true
            }
          })
        }

        this.props.dispatch({
          type: 'chat',
          detail: {
            type: 'chat.bot.settings',
            chatOperatorSettings,
            serverToClientTimeSpan:
              moment(json.serverTime).valueOf() - currClientDate.getTime(),
            active: isBotActive,
            minConfidence: Number(chatBotSettings.addtInfo),
            keywords
          }
        })
      }
      return json
    })
  }

  isServiceActive(settings) {
    return settings && settings.status === 'ACTIVE'
  }

  getOperatorAvailabilityString() {
    const daysMap = {
      '0': 'Domenica',
      '1': 'Lunedì',
      '2': 'Martedì',
      '3': 'Mercoledì',
      '4': 'Giovedì',
      '5': 'Venerdì',
      '6': 'Sabato'
    }

    const schedules = this.getSchedules()

    const sortedSchedulesKeys = Object.keys(schedules).sort((a, b) => {
      if (b !== '0') return 0
      return -1
    })

    let groupNames = []

    const rawGroupedSchedules = groupBy(
      sortedSchedulesKeys.map(k => ({
        day: k,
        schedules: [...schedules[k]]
      })),
      o => {
        const id = o.schedules.reduce((res, next) => {
          res += `${next.start}-${next.end}-`
          return res
        }, '')
        if ((groupNames[groupNames.length - 1] || {}).id !== id) {
          groupNames = [
            ...groupNames,
            { index: `${groupNames.length + 1}`, id }
          ]
        }

        return groupNames[groupNames.length - 1].index
      }
    )

    const groupedSchedules = Object.keys(rawGroupedSchedules).reduce(
      (res, next) => {
        if (rawGroupedSchedules[next].some(o => o.schedules.length > 0)) {
          res[next] = rawGroupedSchedules[next]
        }
        return res
      },
      {}
    )

    const readableGroups = Object.keys(groupedSchedules).map(k => {
      const createReadableDayFromFirstAvailableSchedule = (
        daysRes,
        nextSchedule
      ) => {
        if (
          !daysRes &&
          !!groupedSchedules[k][nextSchedule].schedules &&
          groupedSchedules[k][nextSchedule].schedules.length > 0
        ) {
          daysRes = groupedSchedules[k][nextSchedule].day
        }
        return daysRes
      }

      const startIndex = Object.keys(groupedSchedules[k]).reduce(
        createReadableDayFromFirstAvailableSchedule,
        null
      )

      const endIndex = Object.keys(groupedSchedules[k])
        .reverse()
        .reduce(createReadableDayFromFirstAvailableSchedule, null)

      const startDay = daysMap[startIndex]
      const endDay = daysMap[endIndex]

      const times = groupedSchedules[k][0].schedules.map(s => {
        const startT = new Date()
        const endT = new Date()

        startT.setHours(0, s.start, 0, 0), endT.setHours(0, s.end, 0, 0)

        return {
          start: startT.toTimeString().replace(/(\d+\:\d+).*/, '$1'),
          end: endT.toTimeString().replace(/(\d+\:\d+).*/, '$1')
        }
      })

      let phrase

      if (startDay === endDay) {
        phrase = `${startIndex === '0' ? 'la' : 'il'} ${startDay} `
      } else {
        phrase = `${startIndex === '0' ? 'dalla' : 'dal'} ${startDay} ${
          endIndex === '0' ? 'alla' : 'al'
        } ${endDay} `
      }

      return (
        phrase +
        times.reduce((res, next, i) => {
          res = `${res}${i > 0 ? ' e ' : ''}dalle ${next.start} alle ${
            next.end
          }`
          return res
        }, '')
      )
    })

    return `Puoi chattare con un operatore ${readableGroups.join(
      ', '
    )}, esclusi i festivi.`
  }

  getServerTime() {
    const clientTime = new Date()
    //@mock
    // const clientTime = new Date(
    //   new Date().toISOString().replace(/.*T/, '2019-11-08T')
    // )
    return moment(
      clientTime.getTime() + this.props.data.chatbot.serverToClientTimeSpan
    )
  }

  areOperatorsAvaliable() {
    const processItem = settings => {
      if (!settings)
        return {
          available: false,
          availableNow: false
        }

      try {
        const time = this.getServerTime()
        const startTime = moment(
          time.toISOString().replace(/T.*/, ` ${settings.startTime}`)
        ).toDate()
        const endTime = moment(
          time.toISOString().replace(/T.*/, ` ${settings.endTime}`)
        ).toDate()

        const available = this.isServiceActive(settings)

        console.log(moment('2019-21-04').isBusinessDay())

        const availableNow =
          available &&
          time.isAfter(startTime) &&
          time.isBefore(endTime) &&
          time.isBusinessDay()

        const availableUntil = endTime

        return {
          available,
          availableNow,
          availableUntil
        }
      } catch (err) {
        log('Error occured >>>', err)
        return {
          available: false,
          availableNow: false
        }
      }
    }

    const { available, availableNow, availableUntil } = processItem(
      this.props.data.chatbot.chatOperatorSettings
    )

    if (!available) return false

    const operatorChatStillAvailable = this.getServerTime().isBefore(
      availableUntil
    )

    return availableNow && operatorChatStillAvailable
  }

  getVisibilityClass() {
    return this.state.visible ? 'visible' : ''
  }

  minimizeOnClick() {
    this.setVisible(false)
  }

  chatButtonOnClick() {
    this.setVisible(true)
  }

  setVisible(visible) {
    this.setState({
      visible
    })
    set('visible', visible)
  }

  mapToEntities(visitor, agents) {
    const entities = {}
    if (visitor) {
      entities[visitor.nick] = {
        ...visitor,
        type: 'visitor'
      }
    }

    if (agents && Object.keys(agents).length) {
      Object.values(agents).forEach(agent => {
        if (!agent.nick) return

        entities[agent.nick] = {
          ...agent,
          type: 'agent'
        }
      })
    }

    if (
      this.props.data.account_status === 'offline' &&
      !this.props.data.is_chatting
    ) {
      entities['agent:offline'] = {
        type: 'agent',
        nick: 'agent:offline'
      }
    }

    return entities
  }

  setTheme(theme) {
    this.setState({
      theme
    })
    set('theme', theme)
  }

  onThemeChange(theme) {
    if (theme !== 'docked' && theme !== 'normal') {
      theme = 'docked'
    }

    this.setTheme(theme)
  }

  getTheme() {
    return this.state.theme
  }

  isOffline() {
    return (
      (this.props.data.account_status === 'offline' &&
        !this.props.data.is_chatting) ||
      !!this.props.data.chatbot.active
    )
  }

  render() {
    if (!this.props.chatAccountKey) {
      if (ENV === 'dev') {
        return (
          <div className="warning-container">
            <div className="warning">
              🚨🚨🚨&nbsp;&nbsp;&nbsp;You might have forgotten to configure the
              widget with your own account key.&nbsp;&nbsp;&nbsp;🚨🚨🚨
              <br />
              <br />
              Check the README for more details.
            </div>
          </div>
        )
      } else {
        return <div />
      }
    }

    const entities = this.mapToEntities(
      this.props.data.visitor,
      this.props.data.agents
    )
    const isOffline = this.isOffline()

    return (
      <div className={`index ${this.props.theme}`}>
        <div
          className={`widget-container ${this.getTheme()} ${this.getVisibilityClass()}`}
        >
          <StatusContainer
            accountStatus={this.props.data.account_status}
            minimizeOnClick={this.minimizeOnClick}
            isOffline={isOffline}
          />
          <MessageList
            isChatting={this.props.data.is_chatting}
            isOffline={isOffline}
            messages={this.props.data && this.props.data.chats.toArray()}
            agents={this.props.data.agents}
            entities={entities}
            lastRating={this.props.data.last_chat_rating}
            lastComment={this.props.data.last_chat_comment}
            queuePosition={this.props.data.queue_position}
          />
          <div
            className={`spinner-container ${
              this.state.visible &&
              (this.props.data.connection !== 'connected' ||
                !this.props.data.chatbot.chatOperatorSettings)
                ? 'visible'
                : ''
            }`}
          >
            <div className="spinner" />
          </div>
          <Input
            addClass={/*this.props.data.is_chatting ?*/ 'visible' /*: ''*/}
            ref={this.textInput}
            onSubmit={this.handleOnSubmit}
            onChange={this.handleOnChange}
            onFocus={this.inputOnFocus}
            onFileUpload={this.handleFileUpload}
            isOffline={isOffline}
          />
        </div>
        <ChatButton
          addClass={this.getVisibilityClass()}
          onClick={this.chatButtonOnClick}
        />
      </div>
    )
  }
}

App.displayName = 'App'

App.propTypes = {
  theme: PropTypes.string,
  chatAccountKey: PropTypes.string,
  botAccountKey: PropTypes.string,
  botEndpoint: PropTypes.string,
  botName: PropTypes.string,
  emailAddress: PropTypes.string,
  servicesCheckUrl: PropTypes.string,
  keywords: PropTypes.array
}

App.defaultProps = {
  keywords: ['operatore']
}

const mapStateToProps = state => {
  return {
    data: state
  }
}

const WrappedApp = connect(mapStateToProps)(App)

export default WrappedApp
