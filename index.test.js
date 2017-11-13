import test from 'ava'
import Bot from './index'

const bot = new Bot({
  awsId: process.env.awsId,
  awsSecret: process.env.awsSecret,
  awsTag: process.env.awsTag,
  domain: process.env.domain
})

test('finds some products', async (t) => {
  const results = await bot.search('playstation', {
    results: 15,
    searchIndex: 'VideoGames',
    minPercentageOff: '20',
    responseGroup: 'ItemAttributes,Offers,Images',
    sort: 'salesrank'
  })

  console.log(JSON.stringify(results, null, 2))

  t.is(results.length, 15)
})
