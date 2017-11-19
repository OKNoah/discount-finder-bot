import Bot from '../index'
import bot1 from './create-instance.js'
import { DateTime } from 'luxon'

const tweetInterval = 10 * 60 * 1000
const searchInterval = 11 * 60 * 1000

const browseNode1 = 16329255011 // switch games
const browseNode2 = 6458584011 // ps4 games

console.log(`Initializing discount bot... \nTweet interval: ${tweetInterval / 1000} seconds \nSearch interval: ${searchInterval / 1000} seconds`)

const { awsId, awsSecret, awsTag } = process.env

const { arangoUrl, arangoDb } = process.env

const { twitterConsumerKey2, twitterConsumerSecret2, twitterTokenKey2, twitterTokenSecret2 } = process.env

const bot2 = new Bot({
  arango: {
    arangoUrl, arangoDb
  },
  amazon: {
    awsId, awsSecret, awsTag
  },
  twitter: {
    consumerKey: twitterConsumerKey2,
    consumerSecret: twitterConsumerSecret2,
    accessTokenSecret: twitterTokenSecret2,
    accessTokenKey: twitterTokenKey2
  }
})

setInterval(async () => {
  try {
    const results1 = await bot1.searchAndSave('', {
      results: 100,
      browseNode: browseNode1
    })

    const results2 = await bot1.searchAndSave('psvr', {
      results: 100,
      browseNode: browseNode2
    })

    console.log(`🔍 Searched: ${[...results1, ...results2].length} results`)
  } catch (e) {
    console.error(e)
  }
}, searchInterval);

setInterval(async () => {
  const hour = DateTime.local().hour
  if (hour < 7 || hour > 23) {
    console.log(`In sleep mode. Tweeting in ${hour - -7} hours.`)
    return
  }

  try {
    const tweet = await bot1.tweetFromQueue({
      platform: 'nintendo switch'
    })

    const tweet2 = await bot2.tweetFromQueue({
      browseNode: browseNode2
    })

    if (tweet) {
      console.log(`🐥 Tweeted: https://twitter.com/${tweet[0].user.screen_name}/status/${tweet[0].id}`)
    }

    if (tweet2) {
      console.log(`🐥 Tweeted: https://twitter.com/${tweet2[0].user.screen_name}/status/${tweet2[0].id}`)
    }
  } catch (e) {
    console.error(e)
  }
}, tweetInterval);
