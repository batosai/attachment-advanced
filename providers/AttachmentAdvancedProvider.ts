/*
 * @jrmc/attachment-advanced
 *
 * (c) Chaufourier Jeremy <jeremy@chaufourier.fr>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class AttachmentAdvancedProvider {
  constructor(protected application: ApplicationContract) {}

  public register() {
    this.application.container.bind('Adonis/Addons/AttachmentAdvanced', () => {
      const { Attachment } = require('../src/Attachment')
      const { attachment } = require('../src/Attachment/decorator')
      const { Attachmentable } = require('../src/Mixin')

      return {
        Attachment,
        attachment,
        Attachmentable,
      }
    })
  }

  public boot() {
    this.application.container.withBindings(
      ['Adonis/Addons/AttachmentAdvanced', 'Adonis/Core/Drive', 'Adonis/Core/Config'],
      (AttachmentAdvanced, Drive, Config) => {
        AttachmentAdvanced.Attachment.setDrive(Drive)
        AttachmentAdvanced.Attachment.setConfig(Config.get('attachment', {}))
        AttachmentAdvanced.Attachment.setEnvironment(this.application.environment)
      }
    )
  }
}
