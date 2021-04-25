const channelMQ = global.mode === 'production' || global.mode === 'test' ? 'Interfax' : 'Interfax_local'
const storage = require('../storage/storage')
const rabbitmq = new (require('solid-communication-foundation'))(null, channelMQ, require('solid-logger')('scf', 'interfax:rabbitmq', global.mode === 'dev' ? false : true))
const moment = require('moment')
const startTime = moment()
const axios = require('axios')
const minify = require('html-minifier').minify

rabbitmq.on('GetNewsList', async(request) => {
  let params = request.message.Data
  let newsList = await storage.getNewsList(params)
  rabbitmq.sendResponse(request, newsList)
})

rabbitmq.on('GetNewById', async(request) => {
  let id = request.message.Data.id
  let newItem = await storage.getNewById(id)
  rabbitmq.sendResponse(request, newItem)
})

rabbitmq.on('SendReviewItem', async(request) => {
  let reviewParams = request.message.Data
  let response
  try {
    response = await axios.get(reviewParams.url)
  } catch (err) {
    return rabbitmq.sendResponse(request, {
      success: false,
      message: 'Get review body failed: ' + err
    })
  }

  let body = minify(response.data, {
    collapseWhitespace: true,
    minifyCSS: true
  })

  reviewParams.body = body
  let pushResult = await storage.pushReviewItem(reviewParams)
  if (pushResult instanceof Error) {
    rabbitmq.sendResponse(request, {
      success: false,
      message: pushResult.message
    })
  } else {
    rabbitmq.sendResponse(request, {
      success: true,
      message: pushResult
    })
  }
})

rabbitmq.on('RemoveReviewItem', async(request) => {
  try {
    let result = await storage.removeReviewItem(request.message.Data.id)
    rabbitmq.sendResponse(request, {
      success: true,
      message: result
    })
  } catch (err) {
    rabbitmq.sendResponse(request, {
      success: false,
      message: 'Removing reviewItem failed: ' + err
    })
  }
})

rabbitmq.on('$state', (request) => {
  rabbitmq.sendResponse(request, {
    service: channelMQ,
    mode: global.mode,
    timestamp: moment().toISOString(true),
    starttime: startTime.toISOString(true),
    uptime: moment.duration(moment().diff(startTime)),
    uptimeHumanize: moment.duration(moment().diff(startTime)).locale('ru').humanize(),
    components: {}
  })
})

module.exports = {
  start () {
    return new Promise((resolve, reject) => {
      rabbitmq.start(() => {
        resolve()
      }, (err) => {
        reject(new Error('Rabbit not started: ' + err))
      })
    })
  }
}