/*
 * @adonisjs/attachment-lite
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Core/Application' {
  import AttachmentAdvanced from '@ioc:Adonis/Addons/AttachmentAdvanced'

  interface ContainerBindings {
    'Adonis/Addons/AttachmentAdvanced': typeof AttachmentAdvanced
  }
}
