/*
 * @jrmc/attachment-advanced
 *
 * (c) Chaufourier Jeremy <jeremy@chaufourier.fr>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { AttachmentableMixin } from '@ioc:Adonis/Addons/AttachmentAdvanced'
import { Attachment } from '../Attachment'

export const Attachmentable: AttachmentableMixin = (superclass) => {
  class AttachmentableModel extends superclass {
    /**
     * Regenerate method of attachmentable model
     */
    public static async attachmentRegenerate(variantName?: string | Array<string>) {
      const entities = await this.all()

      await Promise.all(
        entities.map(async (entity) => {
          const attributeAttachments = Object.keys(entity.$attributes).filter(
            (attr) => entity.$attributes[attr] instanceof Attachment
          )

          await Promise.all(
            attributeAttachments.map(async (attr) => {
              entity.$attributes[attr] = Attachment.regenerate(
                entity.$attributes[attr],
                variantName
              )
              await entity.save()
            })
          )
        })
      )
    }
  }
  return AttachmentableModel
}
