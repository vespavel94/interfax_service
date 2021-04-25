global.mode = process.env.NODE_ENV
const methods = require('./methods/methods')
const storage = require('./storage/storage')
const rabbit = require('./rabbit/rabbit')
const logger = require('solid-logger')('Interfax', '', global.mode === 'dev' ? false : true)

const express = require('express')
const bodyParser = require('body-parser')
const routes = require('./routes/routes')
const port = process.env.PORT || 3030

console.log(`Interfax_API started in mode: ${process.env.NODE_ENV}`)

const start = async () => {
  try {
    console.log('Mongo connection...')
    await storage.connect()
    logger.debug(`Connected to MongoDB`)
    console.log('Connected to MongoDB')

    console.log('Authentication Interfax Account...')
    await methods.auth()
    console.log('Authentication succeed')
    logger.debug('Authentication succeed')

    await rabbit.start()
    console.log('Rabbit started')
    
    methods.getNewsList()

    const server = express()
    server.use(bodyParser.json())
    server.use(bodyParser.urlencoded({ extended: true }))
    server.use(routes)
    
    server.listen(port, () => {
      console.log(`HTTP server started on ${port} port`)
      logger.debug(`HTTP server started on ${port} port`)
    })
  } catch (err) {
    console.log(err)
    console.log('Restart in 10 sec...')
    logger.debug(err)
    setTimeout(() => {
      start()
    }, 10000)
  }
}

start()
