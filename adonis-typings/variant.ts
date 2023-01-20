/*
 * @jrmc/attachment-advanced
 *
 * (c) Chaufourier Jeremy <jeremy@chaufourier.fr>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

export interface VariantContract {
  name: string
  format: string
  extname?: string
  mimeType?: string
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
  extname?: string
  mimeType?: string
  size: string
  width: string
  height: string
  isProgressive: boolean
  hasAlpha: boolean
  orientation: number
}
