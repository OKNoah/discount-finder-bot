# "Discount finder bot" (working title)

DFB is a simple bot to find discounts on various websites and do things with them, like save them to a database, queue them for tweeting, etc.

Since it's in active developement, see the `index.test.js` file for it's current functionality. Here is an idea as of the time of this writing:

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

Currently ArangoDB is supported.

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

## Setup

```
npm install
```

For future arangodb support, you'll need to install ArangoDB. It's available on Homebrew.

## Contributing

Please suggest a new name for this bot lol
