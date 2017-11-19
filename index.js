import amazonApi from 'amazon-product-api'
import { get, sortBy, truncate, pull } from 'lodash'
import orm from 'ormjs'
import Twitter from 'twitter'
import superagent from 'superagent'

const defaultFields = {
  platform: 'ItemAttributes[0].HardwarePlatform[0]',
  image: 'LargeImage[0].URL[0]',
  url: 'DetailPageURL[0]',
  title: 'ItemAttributes[0].Title[0]',
  browseNode: 'BrowseNodes[0].BrowseNode[0].BrowseNodeId[0]'
}

const defaultSearch = {
  searchIndex: 'VideoGames',
  minPercentageOff: 1
}

export default class ProductBot {
  fields = {
    ASIN: 'ASIN[0]',
    price: 'OfferListing[0].Price[0].Amount[0]',
    discount: 'OfferListing[0].AmountSaved[0].Amount[0]',
    discountPercent: 'OfferListing[0].PercentageSaved[0]',
    prime: 'OfferListing[0].IsEligibleForPrime[0]'
  }

  constructor (credentials = {}, fields = {}) {
    this.domain = credentials.domain || 'webservices.amazon.ca'
    const { twitter, amazon, arango } = credentials

    this.fields = {
      ...this.fields,
      ...defaultFields,
      ...fields
    }

    if (twitter) {
      const { consumerKey, consumerSecret, accessTokenKey, accessTokenSecret } = twitter

      this.twitter = new Twitter({
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
        access_token_key: accessTokenKey,
        access_token_secret: accessTokenSecret
      })
    }

    if (arango) {
      const db = orm.connect({
        url: arango.arangoUrl,
        database: arango.arangoDb
      })
      const { Model, Edge } = db

      const productSchema = {
        ASIN: { $type: String, unique: true },
        blacklist: { $type: [Number], optional: true }
      }

      for (const key in {...fields, ...defaultFields}) {
        productSchema[key] = {
          $type: String,
          optional: true
        }
      }

      const offerSchema = {
        price: { $type: Number, optional: true },
        discount: { $type: Number, optional: true },
        discountPercent: { $type: Number, optional: true },
        prime: { $type: Boolean, optional: true },
        product: { $type: String }
      }

      class Product extends Model {
        static schema = productSchema
      }

      class Offer extends Model {
        static schema = offerSchema
      }

      class Alert extends Edge {
        static schema = {
          tweeted: { $type: Boolean, optional: true },
          tweetId: { $type: String, optional: true }
        }
      }

      this.Product = Product
      this.Offer = Offer
      this.Alert = Alert
      this.db = db
    }

    if (amazon) {
      try {
        this.amazon = amazonApi.createClient(amazon)
      } catch (error) {
        console.error(error)
      }
    }

    this._init()
  }

  async _init () {
    if (!this.twitterId) {
      const twitterUser = await this.twitter.get('account/verify_credentials', {})
      this.twitterId = twitterUser.id
    }

    return
  }

  async _search (...args) {
    const results = []

    if (this.amazon) {
      const items = await this._searchAmazon(...args)

      results.push(...items)
    }

    return results
  }

  async _searchAmazon (query, args) {
    const results = []
    const limit = args.limit || 20

    for (let i = 0; i < limit; i += 10) {
      let items = []

      try {
        items = await this.amazon.itemSearch({
          responseGroup: 'ItemAttributes,Offers,Images,BrowseNodes',
          sort: 'salesrank',
          keywords: query,
          domain: this.domain,
          ...defaultSearch,
          ...args,
          itemPage: (i / 10) + 1
        })
      } catch (error) {
        console.log('error', error)
        break
      }

      const overLimit = limit < results.length + items.length
      const remainder = limit % results.length

      if (overLimit) {
        results.push(...items.slice(0, remainder))
      } else {
        results.push(...items)
      }
    }

    return results
  }

  async _format (items) {
    const formatted = items.map(item => {
      const offers = get(item, 'Offers[0].Offer')
      const sortedOffers = sortBy(offers, offer => +get(offer, 'OfferListing[0].Price[0].Amount[0]', 9999))
      const price = +get(sortedOffers[0], 'OfferListing[0].Price[0].Amount[0]', 0) / 100
      const discount = +get(sortedOffers[0], 'OfferListing[0].AmountSaved[0].Amount[0]', 0) / 100
      const discountPercent = +get(sortedOffers[0], 'OfferListing[0].PercentageSaved[0]', 0)
      const prime = !!+get(sortedOffers[0], 'OfferListing[0].IsEligibleForPrime[0]', 0)
      const additionalFields = {}

      for (const key in this.fields) {
        const field = get(item, this.fields[key], undefined)

        additionalFields[key] = field
      }

      return {
        ...additionalFields,
        price,
        prime,
        discount,
        discountPercent
      }
    })

    return formatted
  }

  async _save (items) {
    const saves = await Promise.all(items.map(async (item) => {
      let product = undefined
      let offer = undefined
      let alert = undefined
      const { platform } = item

      try {
        product = await this.Product.add({
          ...item,
          platform: platform && platform.toLowerCase().replace('_', '')
        })
      } catch (e) {
        // console.log('e', e)
        try {
          product = await this.Product.findOne({
            where: { ASIN: item.ASIN }
          })
          if (!product) {
            console.log(item.ASIN)
          }
        } catch (error) {
          // console.log('e', error)
        }
      }

      if (product) {
        try {
          offer = await this.Offer.findOne({
            where: { product: product._id },
            sort: 'offer.createdAt DESC'
          })          
        } catch (e) {
        }
      }

      if (!offer || offer.price !== item.price) {
        try {
          const newOffer = await this.Offer.add({
            ...item,
            product: product._id
          })

          if (!offer && newOffer.discount > 0) {
            alert = await this.Alert.add(newOffer, newOffer)
          } else if (offer && offer.price < item.price) {
            alert = await this.Alert.add(offer, newOffer)
          }
        } catch (e) {
          // console.log("Can't save offer")
        }
      }

      return Promise.resolve({
        product: product && product._id,
        alert: alert && alert._id,
        offer: offer && offer._id
      })
    }))

    return saves
  }

  async _getQueue (query = {}) {
    const db = await this.Product._getDatabase()
    let filters = ''

    for (const key in query) {
      filters += ' filter p.' + key + ' like @' + key
    }

    const aql = `
      for p in Product
        ${filters}
        let blacklist = (
            for id in p.blacklist
                filter id == @twitterId
                return id
        )
        filter length(blacklist) < 1
        for o in Offer
            filter o.product == p._id
            for a in Alert
                filter a._from == o._id
                filter a.tweeted != true
                sort a.createdAt DESC
                return {
                    product: p,
                    offer: o,
                    alert: a
                }
    `

    const queue = await db.query({
      query: aql,
      bindVars: {
        ...query,
        twitterId: this.twitterId
      }
    })

    return queue.all()
  }

  async _tweet (data) {
    let image = ''
    let tweet = truncate(data.product.title, { length: 150 })

    const hashtags = [
      'Canada'
    ]

    if (data.product.platform) {
      hashtags.push(data.product.platform)
    }

    tweet += `\n \n ${
      hashtags.map(tag => `#${tag.replace(' ', '').replace('_', '')}`).join(' ')
    }`

    tweet += `\n \n Save $${data.offer.discount} (${data.offer.discountPercent}%) => $${data.offer.price}!`

    tweet += `\n ${data.offer.prime ? '✅' : '🚫'} Prime`

    tweet += `\n \n ${data.product.url}`

    if (data.product.image) {
      const imageData = await superagent.get(data.product.image)

      image = await this.twitter.post('media/upload', { media: imageData.body })
    }

    const tweeted = await this.twitter.post('statuses/update', {
      status: tweet,
      media_ids: image.media_id_string
    })

    if (tweeted) {
      const alert = await this.Alert.findOne({
        where: { _id: data.alert._id }
      })
      alert.tweeted = true
      alert.tweetId = tweeted.id.toString()
      await alert.save()
    }

    return tweeted
  }

  async _blacklist (query) {
    const item = await this.Product.findOne({
      where: query
    })

    if (!item.blacklist) {
      item.blacklist = []
    }

    item.blacklist.push(this.twitterId)
    await item.save()

    return await item.update()
  }

  async _removeBlacklist (query) {
    const item = await this.Product.findOne({
      where: query
    })

    if (item.blacklist) {
      pull(item.blacklist, this.twitterId)
    }

    await item.save()
    await item.update()
    return item
  }

  /* "Public" methods */

  async search (query, args = { results: 20 }) {
    const items = await this._search(query, args)
    const formatted = await this._format(items)

    return formatted
  }

  async searchAndSave (query, args) {
    const items = await this.search(query, args)
    const saved = await this._save(items)

    return saved
  }

  async getQueue (query = {}) {
    const items = await this._getQueue(query)

    return items
  }

  async tweetFromQueue (query = {}) {
    const tweets = []
    const lim = query.limit || 1
    if (query.limit) {
      delete query.limit
    }
    const items = await this.getQueue(query)

    if (!items || items.length === 0) {
      throw new Error('Nothing queued to tweet.')
    }

    for (let i = 0; i < lim; i++) {
      const tweet = await this._tweet(items[i])

      tweets.push(tweet)
    }

    return tweets
  }

  async blacklist (query = {}) {
    const item = await this._blacklist(query)

    return item
  }
}
