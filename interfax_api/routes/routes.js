const router = require('express').Router()
const storage = require('../storage/storage')

router.get('/', (req, res) => {
  res.send('Hello InterfaxApi')
})

router.get('/get-newslist', async(req, res) => {
  // logs here
  let query = req.query
  let newsList = await storage.getNewsList(query)
  res.send({ totalElements: newsList.length, news: newsList })
})

router.get('/get-new-by-id', async(req, res) => {
  // logs here
  let id = req.query.id
  let newItem = await storage.getNewById(id)
  res.send(newItem)
})

module.exports = router
