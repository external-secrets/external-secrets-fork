/* eslint-env mocha */
import { expect } from 'chai'
import * as sinon from 'sinon'
import Prometheus from 'prom-client'
import request from 'supertest'

import { MetricsServer } from './metrics-server'
import { Metrics } from './metrics'

describe('MetricsServer', () => {
  let server: any
  let loggerMock: any
  let registry: any
  let metrics: any

  beforeEach(async () => {
    loggerMock = sinon.mock()
    loggerMock.info = sinon.stub()
    registry = new Prometheus.Registry()
    metrics = new Metrics({ registry })

    server = new MetricsServer({
      logger: loggerMock,
      registry: registry,
      port: 3918
    })

    await server.start()
  })

  afterEach(async () => {
    sinon.restore()
    await server.stop()
  })

  it('start server to serve metrics', async () => {
    metrics.observeSync({
      name: 'foo',
      namespace: 'example',
      backend: 'foo',
      status: 'success'
    })

    metrics.observeSync({
      name: 'bar',
      namespace: 'example',
      backend: 'foo',
      status: 'failed'
    })

    const res = await request('http://localhost:3918')
      .get('/metrics')
      .expect('Content-Type', Prometheus.register.contentType)
      .expect(200)

    expect(res.text).to.have.string(
      'sync_calls{name="foo",namespace="example",backend="foo",status="success"} 1'
    )
    expect(res.text).to.have.string(
      'sync_calls{name="bar",namespace="example",backend="foo",status="failed"} 1'
    )
    expect(res.text).to.have.string(
      'last_state{name="foo",namespace="example",backend="foo"} 1'
    )
    expect(res.text).to.have.string(
      'last_state{name="bar",namespace="example",backend="foo"} -1'
    )
  })
})
