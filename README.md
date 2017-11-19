# "Discount finder bot" (working title)

DFB is a simple bot to find discounts on various websites and do things with them, like save them to a database, queue them for tweeting, etc.

See `index.test.js` and `examples/` for additional help. This is in active development.

### Instiantiting client

Start the bot like this. This does only basic functionality.

```js
const bot = new Bot({
  awsId: process.env.awsId,
  awsSecret: process.env.awsSecret,
  awsTag: process.env.awsTag,
  domain: process.env.domain
}, {
  /* the optional second argument is an object of fields you want included. there are many defaults already, like price, prime eligibility, etc */
  image: 'LargeImage[0].URL[0]',
  url: 'DetailPageURL[0]'
})
```

#### Database functionality

Currently ArangoDB is supported. You can install it on macOS with Brew. There is also a Docker package for installing on production.

```js
const bot = new Bot({
  // ... see above
  arangoUrl: 'http://root:@localhost:8529',
  arangoDb: 'MyDatabaseName'
})
```

### bot.search

This returns only results. It doesn't save anything. Maximum is 100 results.

```js
/* supply a keyword (e.g. 'playstation') and some other criteria. see t3chnoboy/amazon-product-api for further documentation. */
const results = await bot.search('playstation', {
  results: 15,
  searchIndex: 'VideoGames',
  minPercentageOff: '20',
  responseGroup: 'ItemAttributes,Offers,Images',
  sort: 'salesrank'
})
```

### bot.searchAndSave

This does a search (see above) and saves the results to the database like so:

Product - Collection of products.

Offer - Collection of offers. Updates whenever a price changes.

Alert - Queue of price drops between offers.

### bot.tweetFromQueue

This will look in the queue of saved price alerts and tweet one. You can also include a search query and limit on how many to tweet (1 is the default).

```js
bot.tweetFromQueue({
  limit: 2,
  platform: 'playstation 4'
})
```

### bot.blacklist

You can black list a product from the current twitter account by using `bot.blacklist(qeury)`. The product will still be tracked, but no alerts will be sent. You can undo this with `bot._removeBlacklist(query)`. This is compatible with multiple Twitter accounts if you run the bot from the same database.

```js
bot.blacklist({
  ASIN: 'B00KAI3KW2'
})
```

## Setup

```
npm install
```

For arangodb support, you'll need to install ArangoDB. It's available on Homebrew.

## Future development

If initial interest is good, and time allows, I'll consider adding:

- Price history graphs
- Graphics rendered on image
- Interaction

## Contributing

Please suggest a new name for this bot lol
