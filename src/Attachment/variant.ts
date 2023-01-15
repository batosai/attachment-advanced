import type { MultipartFileContract } from '@ioc:Adonis/Core/BodyParser'
import { cuid } from '@poppinss/utils/build/helpers'
import { VariantContract, VariantAttributes } from '../../adonis-typings/variant'
import sharp from 'sharp'

export class Variant implements VariantContract {
  public name: string
  public format: string
  public size: string
  public width: string
  public height: string
  public isProgressive: boolean
  public hasAlpha: boolean
  public orientation: number
  public url: string

  constructor(private file?: MultipartFileContract) {}

  public async generate(config) {
    let format = config.format ? config.format : 'jpg'
    let formatoptions = {}

    if (typeof config.format === 'object') {
      format = config.format.format ? config.format.format : 'jpg'
      formatoptions = config.format
    }

    const buffer = await sharp(this.file!.filePath, { failOnError: false })
      .withMetadata()
      .resize(config.resize!)
      .toFormat(format, formatoptions)
      .toBuffer()

    const metadata = await sharp(buffer, { failOnError: false }).metadata()
    this.format = metadata.format
    this.size = metadata.size
    this.width = metadata.width
    this.height = metadata.height
    this.isProgressive = metadata.isProgressive
    this.hasAlpha = metadata.hasAlpha
    this.orientation = metadata.orientation

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
      // mimeType: this.mimeType,
    }
  }

  private generateName(folder = null): string {
    return `${folder ? `${folder}/` : ''}${cuid()}.${this.format}`
  }
}
