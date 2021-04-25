const config = global.mode === 'production' ? require('../config/mongo_conf.json') : require(`../config/mongo_conf.${global.mode}.json`)
const MongoClient = require('mongodb').MongoClient
const dbUrl = config.dbUrl
const dbName = config.dbName
let db = null

const mongoConnect = async() => {
  try {
    let client = await MongoClient.connect(dbUrl, { useUnifiedTopology: true })
    db = client.db(dbName).collection('news')
  } catch (err) {
    throw new Error('MongoDB connection failed: ' + err)
  }
}

const logger = require('solid-logger')('Interfax', '', process.env.NODE_ENV === 'dev' ? false : true)
const moment = require('moment')

class SelectParams {
  constructor (params) {
    this.tickers = params.tradeItemId
    this.tags = params.tag
    this.type = params.type

    if (params.search) {
      let searchRegExp
      let searchArr = params.search.split(' ')
      if (searchArr.length === 1) {
        searchRegExp = new RegExp(searchArr[0].toLowerCase(), 'i')
      } else {
        let regExpBody = `(${searchArr.join('|')})`
        searchRegExp = new RegExp(regExpBody, 'ig')
      }
      this.$or = [{ summary: searchRegExp }, { body: searchRegExp }]
    }
    Object.keys(this).forEach(key => this[key] === undefined && delete this[key])
  }
}

const getSummary = (text) => {
  let result = text
  if (text.indexOf('<p>') !== -1) {
    result = result.substring(result.indexOf('<p>'))
  }
  result = result.replace(/<P>|<\/P>|<P\/>|\n|\r|\t|<TR>|<\/TR>|<TD>|<\/TD>|<TABLE>|<p>|<\/p>/g, '')
  result = result.replace(/<\/h[1-6]>/g, '. ')
  result = result.replace(/<\/p>/g, ' ')
  result = result.replace(/<[^>]*>|\n|\r|\t/g, '').substr(0, 100) + '...'
  return result
}

const getTags = (rubrics) => {
  let tags = []
  if (Array.isArray(rubrics)) {
    rubrics.forEach(el => {
      let tag = tagList[el].toUpperCase()
      if (tags.indexOf(tag) !== -1) {
        return
      }
      tags.push(tag)
    })
  } else {
    tags.push(tagList[rubrics].toUpperCase())
  }
  return tags
}

const etfRegExp = new RegExp(/\betf\b/i)

const tagList = {
  '11000000': 'Политика',
  '11001000': 'Политика',
  '11002000': 'Политика',
  '11003000': 'Политика',
  '11006000': 'Политика',
  '11007000': 'Политика',
  '11009000': 'Политика',
  '11010000': 'Политика',
  '11013000': 'Политика',
  '11012000': 'Политика',
  '11016000': 'Политика',
  '11018000': 'Политика',
  '11019000': 'Политика',
  '04000000': 'Финансы',
  '04006000': 'Финансы',
  '04006001': 'Финансы',
  '04006002': 'Финансы',
  '04006006': 'Финансы',
  '04006009': 'Финансы',
  '04008000': 'Экономика',
  '04008004': 'Экономика',
  '04008006': 'Валюта',
  '04008012': 'Валюта',
  '04008008': 'Финансы',
  '04008003': 'Финансы',
  '04008010': 'Финансы',
  '04008011': 'Финансы',
  '04009002': 'Финансы',
  '04009003': 'Финансы',
  '04016000': 'Финансы',
  '04016006': 'Финансы',
  '04016015': 'Финансы',
  '04016007': 'Финансы',
  '04016014': 'Финансы',
  '04005000': 'Экономика',
  '04005002': 'Экономика',
  '04005003': 'Экономика',
  '04005004': 'Экономика',
  '04005005': 'Экономика',
  '04005006': 'Экономика',
  '04005008': 'Экономика',
  '04005009': 'Экономика',
  '04005001': 'Экономика',
  '04009001': 'Экономика',
  '04002000': 'Экономика',
  '04002006': 'Экономика',
  '04012000': 'Экономика',
  '04012002': 'Экономика',
  '04012003': 'Экономика',
  '04012004': 'Экономика',
  '04011000': 'Экономика',
  '04011001': 'Экономика',
  '04011002': 'Экономика',
  '04011003': 'Экономика',
  '04011004': 'Экономика',
  '04011005': 'Экономика',
  '04011008': 'Экономика',
  '04011009': 'Экономика',
  '04001000': 'Экономика',
  '04001003': 'Экономика',
  '04013000': 'Экономика',
  '04013002': 'Экономика',
  '04013007': 'Экономика',
  '04003000': 'СМИ',
  '04010000': 'СМИ',
  '04015000': 'Экономика',
  '04007000': 'Экономика',
  '04004000': 'Экономика',
  '04014000': 'Общество',
  '02000000': 'Общество',
  '02001000': 'Общество',
  '02002000': 'Общество',
  '02003000': 'Общество',
  '02004000': 'Общество',
  '02005000': 'Общество',
  '02006000': 'Общество',
  '02008000': 'Общество',
  '03000000': 'Бедствия',
  '03004000': 'Бедствия',
  '03005000': 'Бедствия',
  '03009000': 'Бедствия',
  '03013000': 'Бедствия',
  '03014000': 'Бедствия',
  '03015000': 'Бедствия',
  '12000000': 'Общество',
  '16000000': 'Конфликты',
  '16001000': 'Конфликты',
  '16002000': 'Конфликты',
  '16003000': 'Конфликты',
  '16007000': 'Конфликты',
  '16008000': 'Конфликты',
  '16009000': 'Конфликты',
  '01000000': 'Общество',
  '05000000': 'Общество',
  '06000000': 'Общество',
  '07000000': 'Общество',
  '07001000': 'Общество',
  '07002000': 'Общество',
  '07004000': 'Общество',
  '07007000': 'Общество',
  '09000000': 'Общество',
  '09003000': 'Общество',
  '09004000': 'Общество',
  '09008000': 'Общество',
  '09009000': 'Общество',
  '09011000': 'Общество',
  '13000000': 'Наука и технологии',
  '13008000': 'Наука и технологии',
  '13009000': 'Наука и технологии',
  '13010000': 'Наука и технологии',
  '14000000': 'Общество',
  '14003000': 'Общество',
  '14012000': 'Общество',
  '14015000': 'Общество',
  '15000000': 'Общество',
  '17000000': 'Общество'
}

module.exports = {
  async pushNewItem (raw) {
    let newItem = {
      id: raw.i,
      published: raw.pd,
      type: 'new',
      title: raw.h,
      summary: getSummary(raw.c),
      body: raw.c,
      tickers: raw.rt ? (Array.isArray(raw.rt['a:string']) ? raw.rt['a:string'] : raw.rt['a:string'].split(',')) : [],
      tags: raw.r ? getTags(raw.r['a:string']) : []
    }
    if (newItem.body.toLowerCase().indexOf('банк россии') !== -1 || newItem.body.toLowerCase().indexOf('офз') !== -1) { // добавление тикера ОФЗ
      Array.isArray(newItem.tickers) ? newItem.tickers.push('BOND') : newItem.tickers = ['BOND']
    }
    if (newItem.body.toLowerCase().indexOf('нефть') !== -1) { // добавление тикера BRENT
      Array.isArray(newItem.tickers) ? newItem.tickers.push('BR') : newItem.tickers = ['BR']
    }
    if (newItem.body.toLowerCase().indexOf('золот') !== -1) { // добавление тикера GOLD
      Array.isArray(newItem.tickers) ? newItem.tickers.push('GOLD') : newItem.tickers = ['GOLD']
    }
    if (newItem.body.indexOf('РТС') !== -1) { // добавление тикера РТС
      Array.isArray(newItem.tickers) ? newItem.tickers.push('RTS') : newItem.tickers = ['RTS']
    }
    if (etfRegExp.test(newItem.body)) { // добавление тикера ETF
      Array.isArray(newItem.tickers) ? newItem.tickers.push('ETF') : newItem.tickers = ['ETF']
    }
    if ((newItem.tags !== null && newItem.tags.indexOf('ВАЛЮТА') !== -1) || newItem.title.toLowerCase().indexOf('евро') !== -1 || newItem.title.toLowerCase().indexOf('доллар') !== -1) {
      Array.isArray(newItem.tickers) ? newItem.tickers.push('CURRENCY') : newItem.tickers = ['CURRENCY']
      if (newItem.tags.indexOf('ВАЛЮТА') === -1) {
        newItem.tags.push('ВАЛЮТА')
      }
    }

    let result = await db.insertOne(newItem)
    logger.debug(`Pushed item ${result.ops[0].id}`)
  },

  async pushReviewItem (params) {
    let id = params.id.toString()
    while (id.length < 20) {
      id = '0' + id
    }
    let reviewItem = {
      id,
      published: moment(parseInt(params.published)).format('YYYY-MM-DDTHH:mm:ss'),
      type: 'review',
      title: params.title,
      summary: getSummary(params.body),
      marketSentiment: params.market_sentiment ? params.market_sentiment : null,
      body: params.body,
      priority: null,
      tickers: params.ticker.length ? params.ticker : [],
      tags: [params.type.toUpperCase()]
    }
    
    try {
      let result = await db.findOneAndUpdate({ id: id }, { $set: reviewItem }, { upsert: true, returnOriginal: false })
      if (result.lastErrorObject.updatedExisting) {
        logger.debug(`Updated item ${result.value.id}`)
        return('UPDATED')
      } else {
        logger.debug(`Created item ${result.value.id}`)
        return('NEW')
      }
    } catch (err) {
      logger.debug(err)

      // consciously used RETURN instead of THROW
      return(new Error('ERROR PUSHING REVIEW: ' + err))
    }
  },

  async removeReviewItem (id) {
    id = id.toString()
    while (id.length < 20) {
      id = '0' + id
    }

    await db.deleteOne({ id })
    return (`Item ${id} REMOVED`)
  },

  async getNewsList (params) {
    let query = new SelectParams(params)
    let offset = params.offset ? parseInt(params.offset) : null
    let limit = params.limit ? parseInt(params.limit) : null

    let newsList = await db.find(query, { projection: { body: 0 } }).sort({ published: -1 }).skip(offset).limit(limit).toArray()
    return newsList
  },

  async getNewById (id) {
    let newItem = await db.findOne({ id })
    return newItem
  },

  async connect () {
    await mongoConnect()
  }
}
