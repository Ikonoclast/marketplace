import { Model } from 'decentraland-commons'

import { Asset } from '../Asset'
import { PublicationQueries } from '../../Publication'
import { District } from '../../District'
import { MortgageQueries } from '../../Mortgage'
import { SQL } from '../../database'
import { buildCoordinate, splitCoordinate } from '../../shared/coordinates'

export class Parcel extends Model {
  static tableName = 'parcels'
  static columnNames = [
    'id',
    'x',
    'y',
    'token_id',
    'owner',
    'update_operator',
    'data',
    'district_id',
    'estate_id',
    'tags',
    'auction_price',
    'auction_owner',
    'last_transferred_at'
  ]

  static buildId(x, y) {
    return buildCoordinate(x, y)
  }

  static splitId(id) {
    return splitCoordinate(id)
  }

  static async findByOwner(owner) {
    return new Asset(this).findByOwner(owner)
  }

  static async findByOwnerAndStatus(owner, status) {
    return new Asset(this).findByOwnerAndStatus(owner, status)
  }

  static async findOwneableParcels() {
    return this.db.query(
      SQL`SELECT *
        FROM ${SQL.raw(this.tableName)}
        WHERE district_id IS NULL`
    )
  }

  static async findLandmarks() {
    return this.db.query(
      SQL`SELECT *
        FROM ${SQL.raw(this.tableName)}
        WHERE district_id IS NOT NULL`
    )
  }

  static findWithLastActiveMortgageByBorrower(borrower) {
    return this.db.query(
      SQL`SELECT *, (
        ${PublicationQueries.findLastAssetPublicationJsonSql(this.tableName)}
      ) as publication
        FROM ${SQL.raw(this.tableName)}
        WHERE EXISTS(${MortgageQueries.findLastByBorrowerSql(borrower)})`
    )
  }

  static async findAvailable() {
    const parcels = await this.db.query(
      SQL`SELECT *
        FROM ${SQL.raw(this.tableName)}
        WHERE owner IS NULL
          AND district_id IS NULL
        ORDER BY RANDOM()
        LIMIT 1`
    )
    return parcels[0]
  }

  static async countAvailable() {
    const result = await this.db.query(
      SQL`SELECT COUNT(*)
        FROM ${SQL.raw(this.tableName)}
        WHERE owner IS NULL
          AND district_id IS NULL`
    )
    return parseInt(result[0].count, 10)
  }

  static async inRange(min, max) {
    const [minx, maxy] =
      typeof min === 'string' ? splitCoordinate(min) : [min.x, min.y]
    const [maxx, miny] =
      typeof max === 'string' ? splitCoordinate(max) : [max.x, max.y]

    return this.db.query(SQL`SELECT *, (
      ${PublicationQueries.findLastAssetPublicationJsonSql(this.tableName)}
    ) as publication
      FROM ${SQL.raw(this.tableName)}
      WHERE x BETWEEN ${minx} AND ${maxx}
        AND y BETWEEN ${miny} AND ${maxy}
      ORDER BY x ASC, y DESC`)
  }

  static async encodeTokenId(x, y) {
    const rows = await this.db.query(
      SQL`SELECT token_id
        FROM ${SQL.raw(this.tableName)}
        WHERE x = ${x}
          AND y = ${y}
        LIMIT 1`
    )
    return rows.length ? rows[0].token_id : null
  }

  static async decodeTokenId(tokenId) {
    const rows = await this.db.query(
      SQL`SELECT id
        FROM ${SQL.raw(this.tableName)}
        WHERE token_id = ${tokenId}
        LIMIT 1`
    )
    return rows.length ? rows[0].id : null
  }

  static async updateAuctionData(price, owner, timestamp, ids) {
    return this.db.query(
      SQL`UPDATE ${SQL.raw(this.tableName)}
        SET auction_price = ${price},
          auction_owner = ${owner},
          auction_timestamp = ${timestamp}
        WHERE id = ANY(${ids})`
    )
  }

  static async insert(parcel) {
    const { x, y } = parcel
    parcel.id = Parcel.buildId(x, y)

    return super.insert(parcel)
  }

  isEqual(parcel) {
    return (
      this.attributes.id === parcel.attributes.id ||
      (this.attributes.x === parcel.attributes.x &&
        this.attributes.y === parcel.attributes.y)
    )
  }

  distanceTo(parcel) {
    // Chebyshev distance
    return Math.max(
      Math.abs(this.attributes.x - parcel.attributes.x),
      Math.abs(this.attributes.y - parcel.attributes.y)
    )
  }

  isWithinBoundingBox(parcel, size) {
    return (
      Math.abs(this.attributes.x - parcel.attributes.x) <= size &&
      Math.abs(this.attributes.y - parcel.attributes.y) <= size
    )
  }

  isPlaza() {
    return District.isPlaza(this.attributes.district_id)
  }

  isRoad() {
    return District.isRoad(this.attributes.district_id)
  }
}
