/*
 * @jrmc/attachment-advanced
 *
 * (c) Chaufourier Jeremy <jeremy@chaufourier.fr>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { BaseCommand, flags } from '@adonisjs/core/build/standalone'

export default class Attachment extends BaseCommand {
  public static commandName = 'attachment:regenerate'
  public static description = ''

  public static settings = {
    loadApp: true,
    stayAlive: false,
  }

  @flags.string({ alias: 'M' })
  public model: string

  @flags.array({ alias: 'V' })
  public variants: string[]

  public async run() {
    const path = this.application.resolveNamespaceDirectory('models')

    const Models = this.application.helpers.requireAll(
      this.application.makePath(path || 'app/Models'),
      false
    )

    await Promise.all(
      Object.keys(Models!).map(async (k) => {
        if (this.model && k !== this.model) return
        if (Models![k].attachmentRegenerate) {
          await Models![k].attachmentRegenerate(this.variants)
        }
      })
    )
  }
}
