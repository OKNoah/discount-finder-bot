import test from 'ava'
import Bot from './index'

require('dotenv').config()

const {
  awsId,
  awsSecret,
  awsTag,
  domain,
  arangoUrl,
  arangoDb
} = process.env

const bot = new Bot({
  awsId,
  awsSecret,
  awsTag,
  domain,
  arangoUrl,
  arangoDb
})

test('finds some products', async (t) => {
  const results = await bot.search('playstation', {
    results: 15,
    searchIndex: 'VideoGames',
    minPercentageOff: '20'
  })

  t.is(results.length, 15)
})

test('find and save to database', async (t) => {
  const results = await bot.searchAndSave('playstation', {
    results: 15,
    searchIndex: 'VideoGames',
    minPercentageOff: '20'
  })

  t.is(results.length, 15)
  t.is(!!(results[0].product), true)
})
