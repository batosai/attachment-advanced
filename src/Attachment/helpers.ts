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
import ffmpeg from 'fluent-ffmpeg'
import convert from 'node-convert'
import { Attachment } from '.'

export const pdfToImage = async (pdfPath) => {
  const { pdf } = Attachment.getConfig()
  const bin = pdf?.bin ?? '/usr/bin'
  const poppler = new Poppler(bin)
  const options = {
    firstPageToConvert: 1,
    lastPageToConvert: 1,
    jpegFile: true,
  }

  const filePath = path.join(os.tmpdir(), cuid())
  await poppler.pdfToCairo(pdfPath, filePath, options)
  return filePath + '-1.jpg'
}

export const videoToImage = async (videoPath) => {
  return new Promise<string>((resolve) => {
    const folder = os.tmpdir()
    const filename = `${cuid()}.png`
    ffmpeg(videoPath)
      .screenshots({
        count: 1,
        filename,
        folder,
      })
      .on('end', () => {
        resolve(path.join(folder, filename))
      })
  })
}

export const documentToImage = async (documentPath) => {
  const type = 'jpg'
  const outdir = os.tmpdir()
  const filename = path.basename(documentPath.replace(path.extname(documentPath), `.${type}`))
  await convert(documentPath, {
    // output: filename,
    outdir: os.tmpdir(),
    type,
  })
  return path.join(outdir, filename)
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
  if (
    [
      'application/pdf',
      'application/vnd.oasis.opendocument.text', // odt
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/msword', // doc
      'application/rtf',
      'text/plain',
    ].includes(mimeType)
  ) {
    return true
  }
  return false
}
