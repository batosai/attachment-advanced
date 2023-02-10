/*
 * @jrmc/attachment-advanced
 *
 * (c) Chaufourier Jeremy <jeremy@chaufourier.fr>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Addons/AttachmentAdvanced' {
  import { ColumnOptions, LucidModel } from '@ioc:Adonis/Lucid/Orm'
  import { NormalizeConstructor } from '@ioc:Adonis/Core/Helpers'
  import { MultipartFileContract } from '@ioc:Adonis/Core/BodyParser'
  import {
    DisksList,
    ContentHeaders,
    DriverContract,
    DriveManagerContract,
  } from '@ioc:Adonis/Core/Drive'

  /**
   * Attachment attributes. Required in order
   * to new up an attachment instance
   */
  export type AttachmentAttributes = {
    name?: string
    size: number
    extname: string
    mimeType: string
    variants: object
  }

  /**
   * Options used to persist the attachment to
   * the disk
   */
  export type AttachmentOptions = {
    disk?: keyof DisksList
    folder?: string
    variants?: boolean | Array<string>
    preComputeUrl?:
      | boolean
      | ((disk: DriverContract, attachment: AttachmentContract) => Promise<string>)
  }

  /**
   * Shape of config accepted by the attachment module.
   */
  export type AttachmentConfig = {
    options?: object
    pdf?: any
    image?: any
    video?: any
    document?: any
  }

  /**
   * Attachment class represents an attachment data type
   * for Lucid models
   */
  export interface AttachmentContract {
    /**
     * The name is available only when "isPersisted" is true.
     */
    name: string

    /**
     * The url is available only when "isPersisted" is true.
     */
    url: string

    /**
     * The file size in bytes
     */
    size: number

    /**
     * The file extname. Inferred from the bodyparser file extname
     * property
     */
    extname: string

    /**
     * The file mimetype.
     */
    mimeType: string

    /**
     * "isLocal = true" means the instance is created locally
     * using the bodyparser file object
     */
    isLocal: boolean

    /**
     * Find if the file has been persisted or not.
     */
    isPersisted: boolean

    /**
     * Find if the file has been deleted or not
     */
    isDeleted: boolean

    /**
     * Find if the variants should be regenerate for
     */
    shouldBeRegenerateFor?: string | Array<string>

    /**
     * Object of attachment variants
     */
    variants: object

    /**
     * Define persistance options
     */
    setOptions(options?: AttachmentOptions): this

    /**
     * Save file to the disk. Results if noop when "this.isLocal = false"
     */
    save(): Promise<void>

    /**
     * Delete the file from the disk
     */
    delete(): Promise<void>

    /**
     * Computes the URL for the attachment
     */
    computeUrl(): Promise<void>

    /**
     * Returns the URL for the file. Same as "Drive.getUrl()"
     */
    getUrl(variantName?: string): Promise<string>

    /**
     * Returns the signed URL for the file. Same as "Drive.getSignedUrl()"
     */
    getSignedUrl(
      options?: ContentHeaders & { expiresIn?: string | number } & { variant?: string }
    ): Promise<string>

    /**
     * Returns variant (alias variant())
     */
    preview(variantName: string): object

    /**
     * Returns variant
     */
    variant(variantName: string): object

    /**
     * Convert attachment to plain object to be persisted inside
     * the database
     */
    toObject(): AttachmentAttributes

    /**
     * Convert attachment to JSON object to be sent over
     * the wire
     */
    toJSON(): AttachmentAttributes & { url?: string }
  }

  /**
   * File attachment decorator
   */
  export type AttachmentDecorator = (
    options?: AttachmentOptions & Partial<ColumnOptions>
  ) => <TKey extends string, TTarget extends { [K in TKey]?: AttachmentContract | null }>(
    target: TTarget,
    property: TKey
  ) => void

  /**
   * Attachment class constructor
   */
  export interface AttachmentConstructorContract {
    new (attributes: AttachmentAttributes, file?: MultipartFileContract): AttachmentContract
    fromFile(file: MultipartFileContract): AttachmentContract
    fromDbResponse(response: string): AttachmentContract
    regenerate(
      attachment: AttachmentContract,
      variantName?: string | Array<string>
    ): AttachmentContract | null
    getDrive(): DriveManagerContract
    setDrive(drive: DriveManagerContract): void
    getConfig(): object
    setConfig(config: object): void
    getEnvironment(): string
    setEnvironment(env: string)
  }

  /**
   * Filterable model
   */
  export interface AttachmentableModel {
    attachmentRegenerate(variantName?: string | Array<string>)
  }

  /**
   * Attachmentable mixin
   */
  export interface AttachmentableMixin {
    <T extends NormalizeConstructor<LucidModel>>(superclass: T): T & AttachmentableModel
  }

  export const Attachmentable: AttachmentableMixin
  export const attachment: AttachmentDecorator
  export const Attachment: AttachmentConstructorContract
}
