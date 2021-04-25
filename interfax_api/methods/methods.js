const axios = require('axios')
const parseXml = require('xml2js')
const fs = require('fs')

const xmlTemplates = require('../xml_templates/templates')
const storage = require('../storage/storage')
const logger = require('solid-logger')('Interfax', '', global.mode === 'dev' ? false : false)

// updateTimestamp is taken from update_marker file.
// file doesn't exist on first start, so IF block creates it 
if (!fs.existsSync('config/update_marker.json')) {
  fs.writeFileSync('config/update_marker.json', JSON.stringify({ updateMarker: '' }))
}
let updateTimestamp = require('../config/update_marker.json')

const parser = new parseXml.Parser({ explicitArray: false, ignoreAttrs: true })
const url = 'http://services.ifx.ru/IFXService.svc'

// Interfax SOAP API uses cookie for authorization
let authCookie = null

const checkInObject = (obj, name) => {
  let res = null
  for ( let i in obj ) {
    // eslint-disable-next-line no-prototype-builtins
    if (obj.hasOwnProperty(i)) {
      if (i === name) {
        res = obj[i]
        break
      }
      if (obj[i] && obj[i].constructor === Object) {
        let check = checkInObject(obj[i], name)
        if (check) {
          res = check
          break
        }
      }
    }
  }
  return res
}

module.exports = {
  async auth () {
    try {
      let response = await axios.post(url, xmlTemplates.xmlLogin(), {
        headers: {
          'Content-Type': 'application/soap+xml;charset=UTF-8;action="http://ifx.ru/IFX3WebService/IIFXService/OpenSession"'
        }
      })
      authCookie = response.headers['set-cookie'].join(';')
      return
    } catch (err) {
      throw new Error('Authentication failed: ' + err)
    }
  },

  // gets NewsList w/o details
  async getNewsList () {
    let response

    try {
      response = await axios.post(url, xmlTemplates.xmlGetNews(updateTimestamp.updateMarker), {
        headers: {
          'Content-Type': 'application/soap+xml;charset=UTF-8;action="http://ifx.ru/IFX3WebService/IIFXService/GetRealtimeNewsByProductWithSelections"',
          'Cookie': authCookie
        }
      })
    } catch (err) {
      logger.debug('Error getting News list: ' + err)
      return
    }

    let parseResult = await parser.parseStringPromise(response.data)
    let newsList = checkInObject(parseResult, 'c_nwli')
    if (newsList !== null) {
      if (Array.isArray(newsList)) {
        logger.debug(newsList.length + ' new news in this chunk')
        this.getMultipleNews(newsList)
      } else {
        let id = newsList['i']

        // no need to wait getNewItem, but err must be handled
        this.getNewItem(id).catch(err => logger.debug(err))
      }
    } else {
      logger.debug('No new News in this chunk')
    }
    updateTimestamp.updateMarker = checkInObject(parseResult, 'grnmresp').mbnup
    fs.writeFileSync('config/update_marker.json', JSON.stringify(updateTimestamp))
    
    // grabs NewsList every 60 secs
    setTimeout(() => {
      this.getNewsList()
    }, 60000)
  },

  // get NewItem details by id
  getNewItem (id) {
    return new Promise((resolve, reject) => {
      axios.post(url, xmlTemplates.xmlGetNewById(id), {
        headers: {
          'Content-Type': 'application/soap+xml;charset=UTF-8;action="http://ifx.ru/IFX3WebService/IIFXService/GetEntireNewsByID"',
          'Cookie': authCookie
        }
      })
      .then(response => {
        parser.parseString(response.data, (err, res) => {
          let newItem = checkInObject(res, 'mbn')
          storage.pushNewItem(newItem)
          resolve(newItem)
        })
      })
      .catch((err) => {
        reject(new Error(`Error getting new ${id} details: ` + err))
      })
    })
  },

  async getMultipleNews (newsList) {
    // here it's important to download items one by one,
    // so FOR OF with AWAIT are used
    for (let newItem of newsList) {
      let id = newItem['i']
      try {
        await this.getNewItem(id)
      } catch (err) {
        logger.debug(err)
      }
    }
  }
}