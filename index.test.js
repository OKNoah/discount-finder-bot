import test from 'ava'
import bot from './examples/create-instance.js'

const switchNode = 16329255011 // switch games
const ps4Node = 6458584011 // ps4 games

let products = []

test.before('before', async (t) => {
  products = await bot.search('psvr', {
    browseNode: ps4Node
  })

  t.truthy(products)
})

test('finds some products', async (t) => {
  const results = await bot.search('psvr', {
    browseNode: ps4Node,
    minPercentageOff: 1,
    limit: 15
  })

  t.is(results.length, 15)
})

test('find and save to database', async (t) => {
  const results = await bot.searchAndSave('', {
    limit: 15,
    searchIndex: 'VideoGames',
    browseNode: switchNode,
    minPercentageOff: 1
  })

  t.is(results.length, 15)
  t.truthy(results[0] && results[0].product)
})

test('get alert queue', async (t) => {
  // optional search query
  const queue = await bot.getQueue({
    platform: 'nintendo switch'
  })

  t.truthy(queue.length)
})

test('tweet from queue', async (t) => {
  const tweeted = await bot.tweetFromQueue({
    limit: 1,
    platform: 'nintendo switch'
  })

  t.truthy(tweeted)
})

test('blacklist product', async (t) => {
  const blacklisted = await bot.blacklist({
    ASIN: products[0].ASIN
  })

  t.truthy(blacklisted.blacklist.length >= 1)
})

test.after('remove blacklist', async (t) => {
  const blacklisted = await bot._removeBlacklist({
    ASIN: products[0].ASIN
  })

  t.falsy(blacklisted.blacklist.length)
})
