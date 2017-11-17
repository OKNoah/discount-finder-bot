import Bot from '../index'

const tweetInterval = 10 * 60 * 1000
const searchInterval = 30 * 60 * 1000

const browseNode1 = 16329255011 // switch games
const browseNode2 = 6458584011 // ps4 games

console.log(`Initializing discount bot... \nTweet interval: ${tweetInterval / 1000} seconds \nSearch interval: ${searchInterval / 1000} seconds`)

const {
  twitterConsumerKey,
  twitterConsumerSecret,
  twitterConsumerKey2,
  twitterConsumerSecret2,
  twitterTokenKey,
  twitterTokenSecret,
  twitterTokenKey2,
  twitterTokenSecret2
} = process.env

const bot1 = new Bot({
  ...process.env,
  twitter: {
    consumerKey: twitterConsumerKey,
    consumerSecret: twitterConsumerSecret,
    accessTokenSecret: twitterTokenSecret,
    accessTokenKey: twitterTokenKey
  }
})

const bot2 = new Bot({
  ...process.env,
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
    console.error(e[0].Error)
  }
}, searchInterval);

setInterval(async () => {
  try {
    const tweet = await bot1.tweetFromQueue({
      platform: 'nintendo switch',
      browseNode: browseNode1
    })

    const tweet2 = await bot2.tweetFromQueue({
      browseNode: browseNode2
    })

    if (tweet && tweet2) {
      console.log(`🐥 Tweeted: https://twitter.com/${tweet[0].user.screen_name}/${tweet[0].id}`)
      console.log(`🐥 Tweeted: https://twitter.com/${tweet2[0].user.screen_name}/${tweet[0].id}`)
    }
  } catch (e) {
    console.error(e)
  }
}, tweetInterval);
