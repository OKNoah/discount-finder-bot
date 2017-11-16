import amazon from 'amazon-product-api'
import { get, orderBy } from 'lodash'
import orm from 'ormjs'

const defaultFields = {
  platform: 'ItemAttributes[0].HardwarePlatform[0]',
  image: 'LargeImage[0].URL[0]',
  url: 'DetailPageURL[0]',
  title: 'ItemAttributes[0].Title[0]'
}

export default class ProductBot {
  fields = {
    ASIN: 'ASIN[0]',
    price: 'OfferListing[0].Price[0].Amount[0]',
    discount: 'OfferListing[0].AmountSaved[0].Amount[0]',
    discountPercent: 'OfferListing[0].PercentageSaved[0]',
    prime: 'OfferListing[0].IsEligibleForPrime[0]'
  }

  constructor (credentials = {}, fields = defaultFields) {
    this.domain = credentials.domain || 'webservices.amazon.ca'

    if (fields) {
      this.fields = {
        ...this.fields,
        ...fields
      }
    }

    if (credentials.domain) {
      delete credentials.domain
    }

    if (credentials.arangoUrl) {
      const db = orm.connect({
        url: credentials.arangoUrl,
        database: credentials.arangoDb
      })
      const { Model, Edge } = db

      const productSchema = {
        ASIN: { $type: String, unique: true }
      }

      for (const key in fields) {
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
          twitterUrl: { $type: String, optional: true }
        }
      }

      this.Product = Product
      this.Offer = Offer
      this.Alert = Alert
      this.db = db
    }

    try {
      this.client = amazon.createClient(credentials)
    } catch (error) {
      console.error(error)
    }
  }

  async _search (query, args) {
    const results = []

    try {
      for (let i = 0; i < args.results; i += 10) {
        const items = await this.client.itemSearch({
          responseGroup: 'ItemAttributes,Offers,Images',
          sort: 'salesrank',
          keywords: query,
          domain: this.domain,
          ...args,
          itemPage: (i / 10) + 1
        })

        const overLimit = args.results < results.length + items.length
        const remainder = args.results % results.length

        if (overLimit) {
          results.push(...items.slice(0, remainder))
        } else {
          results.push(...items)
        }
      }
    } catch (error) {
      console.error(error)
    }

    return results
  }

  async _format (items) {
    const formatted = items.map(item => {
      const offers = get(item, 'Offers[0].Offer')
      const sortedOffers = orderBy(offers, offer => +get(offer, 'OfferListing[0].Price[0].Amount[0]'), 0)
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
      const { ASIN, title, platform, image, url } = item

      try {
        product = await this.Product.add({
          ASIN,
          title,
          platform,
          image,
          url
        })
      } catch (e) {
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

          if (!offer) {
            alert = await this.Alert.add(newOffer, newOffer)
          } else if (offer.price < item.price) {
            alert = await this.Alert.add(offer, newOffer)
          }
        } catch (e) {
          console.log("Can't save offer")
        }
      }

      if (product) {
        return Promise.resolve({
          product: product._id,
          alert: alert && alert._id,
          offer: offer && offer._id
        })
      } else {
        console.log(item)
      }
    }))

    return saves
  }

  /* "Public" methods */

  async search (query, args = { results: 20 }) {
    const items = await this._search(query, args)
    const formatted = await this._format(items)

    return formatted
  }

  async searchAndSave (query, args = undefined) {
    const items = await this.search(query, args)
    const saved = await this._save(items)

    return saved
  }
}
