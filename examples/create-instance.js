import Bot from '../index'

const { twitterConsumerKey, twitterConsumerSecret, twitterTokenKey, twitterTokenSecret } = process.env

const { awsId, awsSecret, awsTag } = process.env

const { arangoUrl, arangoDb } = process.env

export default new Bot({
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
