/*
 * @jrmc/attachment-advanced
 *
 * (c) Chaufourier Jeremy <jeremy@chaufourier.fr>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { cuid } from '@poppinss/utils/build/helpers'
import { VariantContract, VariantAttributes } from '../../adonis-typings/variant'
import sharp from 'sharp'
import FileType from 'file-type'

export class Variant implements VariantContract {
  public name: string
  public format?: string
  public extname?: string
  public mimeType?: string
  public size?: number
  public width?: number
  public height?: number
  public isProgressive?: boolean
  public hasAlpha?: boolean
  public orientation?: number
  public url: string

  constructor(private file?: string | Buffer) {}

  public async generate(config) {
    let format = config.format ? config.format : 'jpg'
    let formatoptions = {}

    if (Array.isArray(config.format)) {
      format = config.format[0] ? config.format[0] : 'jpg'
      formatoptions = config.format[1]
    }

    const buffer = await sharp(this.file)
      .withMetadata()
      .resize(config.resize!)
      .toFormat(format, formatoptions)
      .toBuffer()

    const metadata = await sharp(buffer).metadata()
    const type = await FileType.fromBuffer(buffer)
    this.format = metadata.format
    this.size = metadata.size
    this.width = metadata.width
    this.height = metadata.height
    this.isProgressive = metadata.isProgressive
    this.hasAlpha = metadata.hasAlpha
    this.orientation = metadata.orientation
    this.extname = type?.ext
    this.mimeType = type?.mime

    this.name = this.generateName(config.folder)

    return buffer
  }

  public toObject(): VariantAttributes {
    return {
      name: this.name,
      format: this.format,
      size: this.size,
      width: this.width,
      height: this.height,
      isProgressive: this.isProgressive,
      hasAlpha: this.hasAlpha,
      orientation: this.orientation,
      extname: this.extname,
      mimeType: this.mimeType,
    }
  }

  private generateName(folder = null): string {
    return `${folder ? `${folder}/` : ''}${cuid()}.${this.extname}`
  }
}
