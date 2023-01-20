/*
 * @jrmc/attachment-advanced
 *
 * (c) Chaufourier Jeremy <jeremy@chaufourier.fr>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import os from 'node:os'
import path from 'node:path'
import { cuid } from '@poppinss/utils/build/helpers'
import { Poppler } from 'node-poppler'
import { Attachment } from '.'

export const pdfToImage = async (pdfPath) => {
  const { pdf } = Attachment.getConfig()
  const poppler = new Poppler(pdf?.bin)
  const options = {
    firstPageToConvert: 1,
    lastPageToConvert: 1,
    jpegFile: true,
  }

  const filePath = path.join(os.tmpdir(), cuid())
  await poppler.pdfToCairo(pdfPath, filePath, options)
  return filePath + '-1.jpg'
}

export const isImage = (mimeType) => {
  if (
    ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/tiff'].includes(
      mimeType
    )
  ) {
    return true
  }
  return false
}

export const isPdf = (mimeType) => {
  if (['application/pdf'].includes(mimeType)) {
    return true
  }
  return false
}

export const isVideo = (mimeType) => {
  if (
    [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/vnd.avi',
      'video/mpeg',
      'video/3gpp',
      'video/ogg',
      'video/x-flv',
    ].includes(mimeType)
  ) {
    return true
  }
  return false
}

export const isDocument = (mimeType) => {
  if ([''].includes(mimeType)) {
    return true
  }
  return false
}
