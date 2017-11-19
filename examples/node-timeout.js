import Bot from '../index'

const tweetInterval = 10 * 60 * 1000
const searchInterval = 30 * 60 * 1000

const { twitterConsumerKey, twitterConsumerSecret, twitterTokenKey, twitterTokenSecret } = process.env

const { awsId, awsSecret, awsTag } = process.env

const { arangoUrl, arangoDb } = process.env

const bot = new Bot({
  arango: {
    arangoUrl, arangoDb
  },
  amazon: {
    awsId, awsSecret, awsTag
  },
  twitter: {
    consumerKey: twitterConsumerKey,
    consumerSecret: twitterConsumerSecret,
    accessTokenSecret: twitterTokenSecret,
    accessTokenKey: twitterTokenKey
  }
})

console.log(`Initializing discount bot... \nTweet interval: ${tweetInterval / 1000} seconds \nSearch interval: ${searchInterval / 1000} seconds`)

setInterval(async () => {
  try {
    // const keywords = 'nintendo switch'
    const results = await bot.searchAndSave('', {
      results: 100,
      browseNode: 16329255011
    })

    console.log(`🔍 Searched for '${keywords}': ${results.length} results`)
  } catch (e) {
    console.error(e[0].Error)
  }
}, searchInterval);

setInterval(async () => {
  try {
    const tweet = await bot.tweetFromQueue()

    if (tweet) {
      console.log(`🐥 Tweeted: https://twitter.com/${tweet[0].user.screen_name}/${tweet[0].id}`)
    }
  } catch (e) {
    console.error(e)
  }
}, tweetInterval);
