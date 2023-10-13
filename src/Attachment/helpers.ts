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
import { promisify } from 'node:util'
import { cuid } from '@poppinss/utils/build/helpers'
import { Poppler } from 'node-poppler'
import ffmpeg from 'fluent-ffmpeg'
import convert from 'node-convert'
import imgSize from 'image-size'
import { Attachment } from '.'

const sizeOf = promisify(imgSize)

export const getDimensions = async (filePath, mimeType) => {
  const { video } = Attachment.getConfig()

  try {
    if (isImage(mimeType)) {
      return sizeOf(filePath)
    } else if (isVideo(mimeType)) {
      if (video) {
        return new Promise<any>((resolve) => {
          ffmpeg(filePath).ffprobe(0, (err, data) => {
            if (err) {
              console.log(err)
            }

            resolve({
              width: data.streams[0].width,
              height: data.streams[0].height,
            })
          })
        })
      }
    }
  } catch (error) {}

  return false
}

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
      'video/x-matroska', // mkv
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
      'application/vnd.apple.numbers',
      'application/vnd.apple.pages',
      'application/vnd.oasis.opendocument.spreadsheet', // ods
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'text/csv',
      'application/rtf',
      'text/plain',
    ].includes(mimeType)
  ) {
    return true
  }
  return false
}
