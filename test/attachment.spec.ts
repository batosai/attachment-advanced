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

import 'reflect-metadata'

import { test } from '@japa/runner'
import { join } from 'path'
import supertest from 'supertest'
import { createServer } from 'http'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { AttachmentContract } from '@ioc:Adonis/Addons/AttachmentAdvanced'
import { BodyParserMiddleware } from '@adonisjs/bodyparser/build/src/BodyParser'

import { Attachment } from '../src/Attachment'
import { attachment as attchment } from '../src/Attachment/decorator'
import { setup, cleanup, setupApplication } from '../test-helpers'

let app: ApplicationContract

test.group('Attachment | fromDbResponse', (group) => {
  group.setup(async () => {
    app = await setupApplication()
    await setup(app)

    app.container.resolveBinding('Adonis/Core/Route').commit()
    Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'))
  })

  group.teardown(async () => {
    await cleanup(app)
  })

  test('create attachment instance from db response', ({ assert }) => {
    const attachment = Attachment.fromDbResponse(
      JSON.stringify({
        size: 1440,
        name: 'foo.jpg',
        extname: 'jpg',
        mimeType: 'image/jpg',
      })
    )

    assert.isTrue(attachment?.isPersisted)
    assert.isFalse(attachment?.isLocal)
  })

  test('save method should result in noop when attachment is created from db response', async ({
    assert,
  }) => {
    const attachment = Attachment.fromDbResponse(
      JSON.stringify({
        size: 1440,
        name: 'foo.jpg',
        extname: 'jpg',
        mimeType: 'image/jpg',
      })
    )

    await attachment?.save()
    assert.equal(attachment?.name, 'foo.jpg')
  })

  test('Attachment should be null when db response is null', async ({ assert }) => {
    const attachment = Attachment.fromDbResponse(null)
    assert.isNull(attachment)
  })

  test('delete persisted file', async ({ assert }) => {
    const attachment = Attachment.fromDbResponse(
      JSON.stringify({
        size: 1440,
        name: 'foo.jpg',
        extname: 'jpg',
        mimeType: 'image/jpg',
      })
    )

    await attachment?.delete()
    assert.isTrue(attachment?.isDeleted)
  })

  test('compute file url', async ({ assert }) => {
    const attachment = Attachment.fromDbResponse(
      JSON.stringify({
        size: 1440,
        name: 'foo.jpg',
        extname: 'jpg',
        mimeType: 'image/jpg',
      })
    )

    attachment?.setOptions({ preComputeUrl: true })

    await attachment?.computeUrl()
    assert.match(attachment?.url!, /\/uploads\/foo\.jpg\?signature=/)
  })

  test('compute file url from a custom method', async ({ assert }) => {
    const attachment = Attachment.fromDbResponse(
      JSON.stringify({
        size: 1440,
        name: 'foo.jpg',
        extname: 'jpg',
        mimeType: 'image/jpg',
      })
    )

    attachment?.setOptions({
      preComputeUrl: async (_, file) => {
        return `/${file.name}`
      },
    })

    await attachment?.computeUrl()
    assert.equal(attachment?.url, '/foo.jpg')
  })
})

test.group('Attachment | fromFile', (group) => {
  group.setup(async () => {
    app = await setupApplication()
    await setup(app)

    app.container.resolveBinding('Adonis/Core/Route').commit()
    Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'))
  })

  group.teardown(async () => {
    await cleanup(app)
  })

  test('create attachment from the user uploaded file', async ({ assert }) => {
    const server = createServer((req, res) => {
      const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res)
      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!
        const attachment = Attachment.fromFile(file)
        await attachment.save()

        assert.isTrue(attachment.isPersisted)
        assert.isTrue(attachment.isLocal)

        ctx.response.send(attachment)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../documents/cat.jpeg'))

    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    assert.isTrue(await Drive.exists(body.name))
    assert.isTrue(await Drive.exists(body.variants.thumbnail.name))
  })

  test('store attachment inside a nested folder', async ({ assert }) => {
    const server = createServer((req, res) => {
      const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res)
      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!
        const attachment = Attachment.fromFile(file)
        attachment.setOptions({ folder: 'users/avatars' })
        await attachment.save()

        assert.isTrue(attachment.isPersisted)
        assert.isTrue(attachment.isLocal)

        ctx.response.send(attachment)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../documents/cat.jpeg'))

    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    assert.isTrue(body.name.startsWith('users/avatars'))
    assert.isTrue(await Drive.exists(body.name))
  })

  test('pre compute url for newly created file', async ({ assert }) => {
    const server = createServer((req, res) => {
      const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!
        const attachment = Attachment.fromFile(file)
        attachment.setOptions({ preComputeUrl: true })
        await attachment.save()

        assert.isTrue(attachment.isPersisted)
        assert.isTrue(attachment.isLocal)

        ctx.response.send(attachment)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../documents/cat.jpeg'))

    assert.isDefined(body.url)
  })

  test('delete local file', async ({ assert }) => {
    const server = createServer((req, res) => {
      const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!
        const attachment = Attachment.fromFile(file)
        attachment.setOptions({ preComputeUrl: true })
        await attachment.save()
        await attachment.delete()

        assert.isFalse(attachment.isPersisted)
        assert.isTrue(attachment.isLocal)
        assert.isTrue(attachment.isDeleted)

        ctx.response.send(attachment)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../documents/cat.jpeg'))

    assert.isDefined(body.url)
  })

  test('create attachment from the user uploaded file with pdf file', async ({ assert }) => {
    const server = createServer((req, res) => {
      const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res)
      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!
        const attachment = Attachment.fromFile(file)
        await attachment.save()

        assert.isTrue(attachment.isPersisted)
        assert.isTrue(attachment.isLocal)

        ctx.response.send(attachment)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../documents/doc.pdf'))

    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    assert.isTrue(await Drive.exists(body.name))
    assert.isTrue(await Drive.exists(body.variants.thumbnail.name))
  })

  test('create attachment from the user uploaded file with odt file', async ({ assert }) => {
    const server = createServer((req, res) => {
      const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res)
      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!
        const attachment = Attachment.fromFile(file)
        await attachment.save()

        assert.isTrue(attachment.isPersisted)
        assert.isTrue(attachment.isLocal)

        ctx.response.send(attachment)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../documents/doc.odt'))

    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    assert.isTrue(await Drive.exists(body.name))
    assert.isTrue(await Drive.exists(body.variants.thumbnail.name))
  })//.disableTimeout()

  test('create attachment from the user uploaded file with mp4 file', async ({ assert }) => {
    const server = createServer((req, res) => {
      const ctx = app.container.resolveBinding('Adonis/Core/HttpContext').create('/', {}, req, res)
      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!
        const attachment = Attachment.fromFile(file)
        await attachment.save()

        assert.isTrue(attachment.isPersisted)
        assert.isTrue(attachment.isLocal)

        ctx.response.send(attachment)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../documents/small.mp4'))

    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    assert.isTrue(await Drive.exists(body.name))
    assert.isTrue(await Drive.exists(body.variants.thumbnail.name))
  })
})

test.group('Attachment | regenerate', (group) => {
  group.setup(async () => {
    app = await setupApplication()
    await setup(app)

    app.container.resolveBinding('Adonis/Core/Route').commit()
    Attachment.setDrive(app.container.resolveBinding('Adonis/Core/Drive'))
    Attachment.setConfig(app.container.resolveBinding('Adonis/Core/Config').get('attachment', {}))
  })

  group.each.teardown(async () => {
    await app.container.resolveBinding('Adonis/Lucid/Database').connection().truncate('users')
  })

  group.teardown(async () => {
    await cleanup(app)
  })

  test('regenerate attachment from the user uploaded file', async ({ assert }) => {
    const Drive = app.container.resolveBinding('Adonis/Core/Drive')
    const { column, BaseModel } = app.container.use('Adonis/Lucid/Orm')
    const HttpContext = app.container.resolveBinding('Adonis/Core/HttpContext')
    const Db = app.container.resolveBinding('Adonis/Lucid/Database')

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @attchment()
      public avatar: AttachmentContract | null
    }

    const server = createServer((req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)

      app.container.make(BodyParserMiddleware).handle(ctx, async () => {
        const file = ctx.request.file('avatar')!
        const trx = await Db.transaction()

        const user = new User()
        user.username = 'virk'
        user.avatar = Attachment.fromFile(file)

        try {
          await user.useTransaction(trx).save()
        } catch (error) {
          await trx.rollback()
        }

        user.avatar = Attachment.regenerate(user.avatar)

        try {
          await user.useTransaction(trx).save()
          await trx.commit()
        } catch (error) {
          await trx.rollback()
        }

        ctx.response.send(user.avatar)
        ctx.response.finish()
      })
    })

    const { body } = await supertest(server)
      .post('/')
      .attach('avatar', join(__dirname, '../documents/cat.jpeg'))

    assert.isTrue(await Drive.exists(body.variants.thumbnail.name))
  })
})
