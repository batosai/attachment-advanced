/*
 * @jrmc/attachment-advanced
 *
 * (c) Chaufourier Jeremy <jeremy@chaufourier.fr>
 *
 * Fork of @adonisjs/attachment-lite create by @adonisjs/attachment-lite
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import fs from 'node:fs'
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
import {
  getDimensions,
  pdfToImage,
  videoToImage,
  documentToImage,
  isImage,
  isPdf,
  isDocument,
  isVideo,
} from './helpers'

const REQUIRED_ATTRIBUTES = ['name', 'size', 'extname', 'mimeType']

/**
 * Attachment class represents an attachment data type
 * for Lucid models
 */
export class Attachment implements AttachmentContract {
  private static drive: DriveManagerContract
  private static attachmentConfig: AttachmentConfig
  private static environment: string

  /**
   * Reference to the Environment mode
   */
  public static getEnvironment() {
    return this.environment
  }

  /**
   * Set the Environment mode
   */
  public static setEnvironment(environment: string) {
    this.environment = environment
  }

  /**
   * Reference to the drive
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
   * Reference to the config
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
   * Regenerate variants
   */
  public static regenerate(
    attachmentOrigin: AttachmentContract,
    variantName?: string | Array<string>
  ) {
    if (attachmentOrigin && attachmentOrigin.isPersisted) {
      const attachment = new Attachment(attachmentOrigin.toObject())

      attachment.shouldBeRegenerateFor = variantName ?? 'all'

      return attachment
    }
    return null
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
   * The original name is available only when "isPersisted" is true.
   */
  public originalName: string

  /**
   * The url is available only when "isPersisted" is true.
   */
  public url: string

  /**
   * The file size in bytes
   */
  public size = this.attributes.size

  /**
   * The file width
   */
  public width: number

  /**
   * The file height
   */
  public height: number

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
   * Find if the variants should be regenerate for
   */
  public shouldBeRegenerateFor?: string | Array<string>

  /**
   * Object of attachment variants
   */
  public variants: any

  constructor(private attributes: AttachmentAttributes, private file?: MultipartFileContract) {
    if (this.attributes.name) {
      this.name = this.attributes.name
    }
    if (this.attributes.name) {
      this.name = this.attributes.name
    }
    if (this.attributes.originalName) {
      this.originalName = this.attributes.originalName
    }
    if (this.attributes.width) {
      this.width = this.attributes.width
    }
    if (this.attributes.height) {
      this.height = this.attributes.height
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
  private getVariantsConfig() {
    const { image = {}, pdf = {}, video = {}, document = {} } = Attachment.getConfig()
    let variants: object = {}
    let versions: object = {}

    if (isImage(this.mimeType) === true) {
      variants = image?.variants
    } else if (isPdf(this.mimeType) === true) {
      variants = pdf?.previews || document?.previews
    } else if (isDocument(this.mimeType) === true) {
      variants = document?.previews
    } else if (isVideo(this.mimeType) === true) {
      variants = video?.previews
    }

    if (!variants || this.options?.variants === false) return false

    if (this.options?.variants) {
      ;(this.options?.variants as Array<string>).forEach((v) => {
        versions[v] = variants[v]
      })
    }

    if (Object.keys(versions).length === 0) {
      versions = variants
    }

    if (this.shouldBeRegenerateFor && this.shouldBeRegenerateFor !== 'all') {
      const data = {}

      if (typeof this.shouldBeRegenerateFor === 'string') {
        this.shouldBeRegenerateFor = [this.shouldBeRegenerateFor]
      }

      for (const v of this.shouldBeRegenerateFor) {
        if (!versions[v]) continue

        data[v] = versions[v]
      }

      return data
    }

    return versions
  }

  /**
   * Generate variants
   */
  private async generateVariants(filePath: string | Buffer) {
    const variantsConfig = this.getVariantsConfig()

    // disabled generation if config is false or driver is Fake
    if (variantsConfig === false || this.getDisk().constructor.name === 'FakeDriver') return

    if (variantsConfig && isPdf(this.mimeType) === true && Attachment.getConfig().pdf) {
      filePath = await pdfToImage(filePath as string)
    } else if (variantsConfig && isDocument(this.mimeType) === true) {
      filePath = await documentToImage(filePath as string)
    } else if (variantsConfig && isVideo(this.mimeType) === true) {
      filePath = await videoToImage(filePath as string)
    }

    await Promise.all(
      Object.keys(variantsConfig).map(async (key) => {
        const variant = new Variant(filePath)
        const buffer = await variant.generate({
          ...variantsConfig[key],
          folder: this.options?.folder,
        })

        if (this.variants[key]) {
          await this.getDisk().delete(this.variants[key].name)
        }

        await this.getDisk().put(variant.name, buffer!)

        this.variants[key] = variant.toObject()
      })
    )

    // Delete tmp file
    if (
      this.file &&
      (isPdf(this.mimeType) || isVideo(this.mimeType) || isDocument(this.mimeType))
    ) {
      fs.unlink(filePath, () => {})
    }
  }

  /**
   * Delete variants
   */
  private async deleteVariants() {
    if (this.variants) {
      return await Promise.all(
        Object.keys(this.variants).map((k) => {
          const v = this.variants[k]
          delete this.variants[k]
          return this.getDisk().delete(v.name)
        })
      )
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
    if (this.shouldBeRegenerateFor) {
      const filePath = await this.getDisk().makePath(this.name)
      await this.generateVariants(filePath)
      await this.computeUrl()
    }

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

    await this.generateVariants(this.file?.filePath!)

    /**
     * Assign name to the file
     */
    this.name = this.file!.fileName!

    /**
     * Assign original name to the file
     */
    this.originalName = this.file!.clientName

    /**
     * Assign dimension
     */
    const dimensions = await getDimensions(this.file?.filePath!, this.mimeType)
    if (dimensions) {
      this.width = dimensions.width!
      this.height = dimensions.height!
    }
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
     * Cannot compute url for a non web env
     */
    if (Attachment.getEnvironment() === 'console') {
      return
    }

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
    if (variantName && this.variants[variantName]) {
      return this.getDisk().getUrl(this.variants[variantName].name)
    }
    return this.getDisk().getUrl(this.name)
  }

  /**
   * Returns the signed URL for the file. Same as "Drive.getSignedUrl()"
   */
  public getSignedUrl(
    options?: ContentHeaders & { expiresIn?: string | number } & { variant?: string }
  ) {
    if (options?.variant && this.variants[options.variant]) {
      return this.getDisk().getSignedUrl(this.variant(options.variant)?.name, options)
    }
    return this.getDisk().getSignedUrl(this.name, options)
  }

  /**
   * Returns variant by name
   */
  public variant(variantName: string) {
    return this.variants[variantName]
  }

  // /**
  //  * Returns preview (alias variant())
  //  */
  public preview(variantName: string) {
    return this.variants[variantName]
  }

  /**
   * Convert attachment to plain object to be persisted inside
   * the database
   */
  public toObject(): AttachmentAttributes {
    return {
      name: this.name,
      originalName: this.originalName,
      extname: this.extname,
      size: this.size,
      width: this.width,
      height: this.height,
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
