/* eslint-env mocha */
import { expect } from 'chai'
import * as sinon from 'sinon'

import { Daemon } from './daemon'

describe('Daemon', () => {
  let daemon: any
  let loggerMock: any
  let pollerMock: any
  let pollerFactory: any

  beforeEach(() => {
    loggerMock = sinon.mock()
    loggerMock.info = sinon.stub()
    loggerMock.debug = sinon.stub()

    pollerMock = sinon.mock()
    pollerMock.start = sinon.stub().returns(pollerMock)
    pollerMock.stop = sinon.stub().returns(pollerMock)

    pollerFactory = sinon.mock()
    pollerFactory.createPoller = sinon.stub().returns(pollerMock)

    daemon = new Daemon({
      logger: loggerMock,
      pollerFactory,
      externalSecretEvents: null
    })
  })

  afterEach(() => {
    sinon.restore()
  })

  it('starts new pollers for external secrets', async () => {
    const fakeExternalSecretEvents = (async function* () {
      yield {
        type: 'ADDED',
        object: {
          metadata: {
            name: 'foo',
            namespace: 'foo',
            resourceVersion: '1'
          },
          spec: {}
        }
      }
    })()
    daemon._externalSecretEvents = fakeExternalSecretEvents

    await daemon.start()
    daemon.stop()

    expect(pollerMock.start.called).to.equal(true)
    expect(pollerMock.stop.called).to.equal(true)
  })

  it('tries to remove existing poller on ADDED events', async () => {
    const fakeExternalSecretEvents = (async function* () {
      yield {
        type: 'ADDED',
        object: {
          metadata: {
            name: 'foo',
            namespace: 'foo',
            uid: 'test-id'
          }
        }
      }
    })()

    daemon._externalSecretEvents = fakeExternalSecretEvents
    daemon._addPoller = sinon.mock()
    daemon._removePoller = sinon.mock()

    await daemon.start()
    daemon.stop()

    expect(daemon._addPoller.called).to.equal(true)
    expect(daemon._removePoller.calledWith('test-id')).to.equal(true)
  })

  it('tries to remove existing poller on MODIFIED event', async () => {
    const fakeExternalSecretEvents = (async function* () {
      yield {
        type: 'MODIFIED',
        object: {
          metadata: {
            name: 'foo',
            namespace: 'foo',
            uid: 'test-id'
          }
        }
      }
    })()

    daemon._externalSecretEvents = fakeExternalSecretEvents
    daemon._addPoller = sinon.mock()
    daemon._removePoller = sinon.mock()

    await daemon.start()
    daemon.stop()

    expect(daemon._addPoller.called).to.equal(true)
    expect(daemon._removePoller.calledWith('test-id')).to.equal(true)
  })
})
