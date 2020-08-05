/* eslint-env mocha */
import { expect } from 'chai'
import * as sinon from 'sinon'
import { Readable } from 'stream'

import { getExternalSecretEvents } from './external-secret'

describe('getExternalSecretEvents', () => {
  let kubeClientMock: any
  let externalSecretsApiMock: any
  let fakeCustomResourceManifest: any
  let loggerMock: any
  let mockedStream: any

  beforeEach(() => {
    fakeCustomResourceManifest = {
      spec: {
        group: 'kubernetes-client.io',
        names: {
          plural: 'externalsecrets'
        }
      }
    }
    externalSecretsApiMock = sinon.mock()

    mockedStream = new Readable()
    mockedStream._read = () => {}

    externalSecretsApiMock.get = sinon.stub()
    kubeClientMock = sinon.mock()
    kubeClientMock.apis = sinon.mock()
    kubeClientMock.apis['kubernetes-client.io'] = sinon.mock()
    kubeClientMock.apis['kubernetes-client.io'].v1 = sinon.mock()
    kubeClientMock.apis['kubernetes-client.io'].v1.watch = sinon.mock()
    kubeClientMock.apis[
      'kubernetes-client.io'
    ].v1.watch.externalsecrets = sinon.mock()
    kubeClientMock.apis[
      'kubernetes-client.io'
    ].v1.watch.externalsecrets.getStream = () => mockedStream

    loggerMock = sinon.mock()
    loggerMock.info = sinon.stub()
    loggerMock.warn = sinon.stub()
    loggerMock.error = sinon.stub()
    loggerMock.debug = sinon.stub()
  })

  it('gets a stream of external secret events', async () => {
    const fakeExternalSecretObject = {
      apiVersion: 'kubernetes-client.io/v1',
      kind: 'ExternalSecret',
      metadata: {
        name: 'my-secret',
        namespace: 'default'
      },
      spec: { backendType: 'secretsManager', data: [] }
    }

    const events = getExternalSecretEvents({
      kubeClient: kubeClientMock,
      customResourceManifest: fakeCustomResourceManifest,
      logger: loggerMock
    })

    mockedStream.push(
      `${JSON.stringify({
        type: 'MODIFIED',
        object: fakeExternalSecretObject
      })}\n`
    )

    mockedStream.push(
      `${JSON.stringify({
        type: 'ADDED',
        object: fakeExternalSecretObject
      })}\n`
    )

    mockedStream.push(
      `${JSON.stringify({
        type: 'DELETED',
        object: fakeExternalSecretObject
      })}\n`
    )

    mockedStream.push(
      `${JSON.stringify({
        type: 'DELETED_ALL'
      })}\n`
    )

    const modifiedEvent: any = await events.next()
    expect(modifiedEvent.value.type).is.equal('MODIFIED')
    expect(modifiedEvent.value.object).is.deep.equal(fakeExternalSecretObject)

    const addedEvent: any = await events.next()
    expect(addedEvent.value.type).is.equal('ADDED')
    expect(addedEvent.value.object).is.deep.equal(fakeExternalSecretObject)

    const deletedEvent = await events.next()
    expect(deletedEvent.value.type).is.equal('DELETED')
    expect(deletedEvent.value.object).is.deep.equal(fakeExternalSecretObject)

    const deletedAllEvent = await events.next()
    expect(deletedAllEvent.value.type).is.equal('DELETED_ALL')
    expect(deletedAllEvent.value.object).is.deep.equal(undefined)
  })
})
