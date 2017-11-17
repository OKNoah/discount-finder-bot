import test from 'ava'
import Bot from './index'

require('dotenv').config()

const {
  awsId,
  awsSecret,
  awsTag,
  domain,
  arangoUrl,
  arangoDb,
  twitterConsumerKey,
  twitterConsumerSecret,
  twitterTokenKey,
  twitterTokenSecret
} = process.env

const bot = new Bot({
  awsId,
  awsSecret,
  awsTag,
  domain,
  arangoUrl,
  arangoDb,
  twitter: {
    consumerKey: twitterConsumerKey,
    consumerSecret: twitterConsumerSecret,
    accessTokenSecret: twitterTokenSecret,
    accessTokenKey: twitterTokenKey
  }
})

test('finds some products', async (t) => {
  const results = await bot.search('playstation', {
    results: 15,
    searchIndex: 'VideoGames',
    minPercentageOff: 20
  })

  t.is(results.length, 15)
})

test('find and save to database', async (t) => {
  const results = await bot.searchAndSave('', {
    results: 15,
    searchIndex: 'VideoGames',
    browseNode: 16329255011,
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

  t.truthy(queue)
})

test('tweet from queue', async (t) => {
  const tweeted = await bot.tweetFromQueue({
    limit: 1,
    place_id: '1e5cb4d0509db554'
  })

  t.truthy(tweeted)
})
