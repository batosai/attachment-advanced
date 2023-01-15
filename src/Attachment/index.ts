/*
 * @adonisjs/attachment-lite
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { Exception } from '@poppinss/utils'
import { cuid } from '@poppinss/utils/build/helpers'
import type { MultipartFileContract } from '@ioc:Adonis/Core/BodyParser'
import type { DriveManagerContract, ContentHeaders } from '@ioc:Adonis/Core/Drive'
import type {
  AttachmentOptions,
  AttachmentContract,
  AttachmentAttributes,
  AttachmentConfig,
  AttachmentConstructorContract,
} from '@ioc:Adonis/Addons/AttachmentAdvanced'
import { Variant } from './variant'

const REQUIRED_ATTRIBUTES = ['name', 'size', 'extname', 'mimeType']

/**
 * Attachment class represents an attachment data type
 * for Lucid models
 */
export class Attachment implements AttachmentContract {
  private static drive: DriveManagerContract
  private static attachmentConfig: AttachmentConfig

  /**
   * Refrence to the drive
   */
  public static getDrive() {
    return this.drive
  }

  /**
   * Set the drive instance
   */
  public static setDrive(drive: DriveManagerContract) {
    this.drive = drive
  }

  /**
   * Refrence to the config
   */
  public static getConfig() {
    return this.attachmentConfig
  }

  /**
   * Set the config instance
   */
  public static setConfig(config: AttachmentConfig) {
    this.attachmentConfig = config
  }

  /**
   * Create attachment instance from the bodyparser
   * file
   */
  public static fromFile(file: MultipartFileContract) {
    const attributes = {
      extname: file.extname!,
      mimeType: `${file.type}/${file.subtype}`,
      size: file.size!,
      variants: {},
    }

    return new Attachment(attributes, file)
  }

  /**
   * Create attachment instance from the database response
   */
  public static fromDbResponse(response: any) {
    if (response === null) {
      return null
    }

    const attributes = typeof response === 'string' ? JSON.parse(response) : response

    /**
     * Validate the db response
     */
    REQUIRED_ATTRIBUTES.forEach((attribute) => {
      if (attributes[attribute] === undefined) {
        throw new Exception(
          `Cannot create attachment from database response. Missing attribute "${attribute}"`
        )
      }
    })

    const attachment = new Attachment(attributes)

    /**
     * Files fetched from DB are always persisted
     */
    attachment.isPersisted = true
    return attachment
  }

  /**
   * Attachment options
   */
  private options?: AttachmentOptions

  /**
   * The name is available only when "isPersisted" is true.
   */
  public name: string

  /**
   * The url is available only when "isPersisted" is true.
   */
  public url: string

  /**
   * The file size in bytes
   */
  public size = this.attributes.size

  /**
   * The file extname. Inferred from the bodyparser file extname
   * property
   */
  public extname = this.attributes.extname

  /**
   * The file mimetype.
   */
  public mimeType = this.attributes.mimeType

  /**
   * "isLocal = true" means the instance is created locally
   * using the bodyparser file object
   */
  public isLocal = !!this.file

  /**
   * Find if the file has been persisted or not.
   */
  public isPersisted = false

  /**
   * Find if the file has been deleted or not
   */
  public isDeleted: boolean

  /**
   * Object of attachment variants
   */
  public variants: any

  constructor(private attributes: AttachmentAttributes, private file?: MultipartFileContract) {
    if (this.attributes.name) {
      this.name = this.attributes.name
    }
    if (this.attributes.variants) {
      this.variants = this.attributes.variants
    }
  }

  /**
   * Generates the name for the attachment and prefixes
   * the folder (if defined)
   */
  private generateName(extname = this.extname): string {
    if (this.name) {
      return this.name
    }

    const folder = this.options?.folder
    return `${folder ? `${folder}/` : ''}${cuid()}.${extname}`
  }

  /**
   * Returns disk instance
   */
  private getDisk() {
    const disk = this.options?.disk
    const Drive = (this.constructor as AttachmentConstructorContract).getDrive()
    return disk ? Drive.use(disk) : Drive.use()
  }

  /**
   * Generate variants
   */
  private getOptionVariants() {
    const { variants } = Attachment.getConfig()
    let versions = {}
    console.log(this.options?.variants)
    if (this.options?.variants) {
      this.options?.variants.forEach((v) => {
        versions[v] = variants[v]
      })
    }

    if (this.options?.variant) {
      versions[this.options?.variant] = variants[this.options?.variant]
    }

    if (Object.keys(versions).length === 0) {
      versions = variants
    }

    return versions
  }

  /**
   * Generate variants
   */
  private async generateVariants() {
    const variants = this.getOptionVariants()

    for (const key in variants) {
      const variant = new Variant(this.file)
      const buffer = await variant.generate({
        ...variants[key],
        folder: this.options?.folder,
      })

      await this.getDisk().put(variant.name, buffer!)

      this.variants[key] = variant.toObject()
    }
  }

  /**
   * Delete variants
   */
  private async deleteVariants() {
    for (const key in this.variants) {
      await this.getDisk().delete(this.variants[key].name)
    }
  }

  /**
   * Define persistance options
   */
  public setOptions(options?: AttachmentOptions) {
    this.options = options
    return this
  }

  /**
   * Save file to the disk. Results if noop when "this.isLocal = false"
   */
  public async save() {
    /**
     * Do not persist already persisted file or if the
     * instance is not local
     */
    if (!this.isLocal || this.isPersisted) {
      return
    }

    /**
     * Write to the disk
     */
    await this.file!.moveToDisk('./', { name: this.generateName() }, this.options?.disk)

    await this.generateVariants()

    /**
     * Assign name to the file
     */
    this.name = this.file!.fileName!

    /**
     * File has been persisted
     */
    this.isPersisted = true

    /**
     * Compute the URL
     */
    await this.computeUrl()
  }

  /**
   * Delete the file from the disk
   */
  public async delete() {
    if (!this.isPersisted) {
      return
    }

    await this.getDisk().delete(this.name)
    await this.deleteVariants()
    this.isDeleted = true
    this.isPersisted = false
  }

  /**
   * Computes the URL for the attachment
   */
  public async computeUrl() {
    /**
     * Cannot compute url for a non persisted file
     */
    if (!this.isPersisted) {
      return
    }

    /**
     * Do not compute url unless preComputeUrl is set to true
     */
    if (!this.options?.preComputeUrl) {
      return
    }

    const disk = this.getDisk()

    /**
     * Generate url using the user defined preComputeUrl method
     */
    if (typeof this.options.preComputeUrl === 'function') {
      this.url = await this.options.preComputeUrl(disk, this)
      return
    }

    /**
     * Self compute the URL if "preComputeUrl" is set to true
     */
    const fileVisibility = await disk.getVisibility(this.name)
    if (fileVisibility === 'private') {
      this.url = await disk.getSignedUrl(this.name)
    } else {
      this.url = await disk.getUrl(this.name)
    }

    for (const key in this.variants) {
      const fileVariantVisibility = await disk.getVisibility(this.variants[key].name)
      if (fileVariantVisibility === 'private') {
        this.variants[key].url = await disk.getSignedUrl(this.variants[key].name)
      } else {
        this.variants[key].url = await disk.getUrl(this.variants[key].name)
      }
    }
  }

  /**
   * Returns the URL for the file. Same as "Drive.getUrl()"
   */
  public getUrl(variantName?: string | null) {
    if (variantName) {
      return this.getDisk().getUrl(this.variants[variantName].name)
    }
    return this.getDisk().getUrl(this.name)
  }

  /**
   * Returns the signed URL for the file. Same as "Drive.getSignedUrl()"
   */
  public getSignedUrl(
    variantName?: string | null,
    options?: ContentHeaders & { expiresIn?: string | number }
  ) {
    if (variantName) {
      return this.getDisk().getSignedUrl(this.variant(variantName).name, options)
    }
    return this.getDisk().getSignedUrl(this.name, options)
  }

  /**
   * Returns the URL for the file. Same as "Drive.getUrl()"
   */
  public getPreviewUrl() {
    const { preview } = Attachment.getConfig()
    return this.getDisk().getUrl(this.variant(preview).name)
  }

  /**
   * Returns the signed URL for the file. Same as "Drive.getSignedUrl()"
   */
  public getPreviewSignedUrl(options?: ContentHeaders & { expiresIn?: string | number }) {
    const { preview } = Attachment.getConfig()
    return this.getDisk().getSignedUrl(this.variant(preview).name, options)
  }

  /**
   * Returns variant by name
   */
  public variant(variantName: string) {
    return this.variants[variantName]
  }

  /**
   * Returns preview
   */
  public preview() {
    const { preview } = Attachment.getConfig()
    return this.variant(preview)
  }

  /**
   * Convert attachment to plain object to be persisted inside
   * the database
   */
  public toObject(): AttachmentAttributes {
    return {
      name: this.name,
      extname: this.extname,
      size: this.size,
      mimeType: this.mimeType,
      variants: this.variants,
    }
  }

  /**
   * Convert attachment to JSON object to be sent over
   * the wire
   */
  public toJSON(): AttachmentAttributes & { url?: string } {
    return {
      ...(this.url ? { url: this.url } : {}),
      ...this.toObject(),
    }
  }
}
