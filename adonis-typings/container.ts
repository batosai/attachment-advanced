/*
 * @jrmc/attachment-advanced
 *
 * (c) Chaufourier Jeremy <jeremy@chaufourier.fr>
 *
 * Fork of @adonisjs/attachment-lite create by @adonisjs/attachment-lite
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
