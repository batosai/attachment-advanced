export interface VariantContract {
  name: string
  format: string
  size: string
  width: string
  height: string
  isProgressive: boolean
  hasAlpha: boolean
  orientation: number
  url: string

  toObject(): VariantAttributes
  generate(config: object): Promise<Buffer>
}

export type VariantAttributes = {
  name: string
  format: string
  size: string
  width: string
  height: string
  isProgressive: boolean
  hasAlpha: boolean
  orientation: number
}
