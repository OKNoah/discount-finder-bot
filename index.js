import amazon from 'amazon-product-api'
import { get, orderBy } from 'lodash'

export default class ProductBot {
  fields = {
    /* price: 'OfferListing[0].Price[0].Amount[0]',
    discount: 'OfferListing[0].AmountSaved[0].Amount[0]',
    discountPercent: 'OfferListing[0].PercentageSaved[0]',
    prime: 'OfferListing[0].IsEligibleForPrime[0]',*/
    platform: 'ItemAttributes[0].HardwarePlatform[0]',
    image: 'LargeImage[0].URL[0]',
    url: 'DetailPageURL[0]',
    ASIN: 'ASIN[0]',
    title: 'ItemAttributes[0].Title[0]'
  }

  constructor (credentials = {}, fields = undefined) {
    this.domain = credentials.domain || 'webservices.amazon.ca'

    if (fields) {
      this.fields = fields
    }

    if (credentials.domain) {
      delete credentials.domain
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
          ...args,
          keywords: query,
          domain: args.domain || this.domain,
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
      console.error(error[0].Error)
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
        price,
        prime,
        discount,
        discountPercent,
        ...additionalFields
      }
    })

    return formatted
  }

  /* "Public" methods */

  async search (query, args = { results: 20 }) {
    const items = await this._search(query, args)
    const formatted = await this._format(items)

    return formatted
  }
}
