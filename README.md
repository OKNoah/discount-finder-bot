# "Discount finder bot" (working title)

DFB is a simple bot to find discounts on various websites and do things with them, like save them to a database, queue them for tweeting, etc.

Since it's in active developement, see the `index.test.js` file for it's current functionality. Here is an idea as of the time of this writing:

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

/* supply a keyword (e.g. 'playstation') and some other criteria. see t3chnoboy/amazon-product-api for further documentation. */
const results = await bot.search('playstation', {
  results: 15,
  searchIndex: 'VideoGames',
  minPercentageOff: '20',
  responseGroup: 'ItemAttributes,Offers,Images',
  sort: 'salesrank'
})
```

## Setup

```
npm install
```

For future arangodb support, you'll need to install ArangoDB. It's available on Homebrew.

## Contributing

Please suggest a new name for this bot lol
