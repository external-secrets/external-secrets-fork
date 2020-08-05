/* eslint-env mocha */
import { expect } from 'chai'
import * as sinon from 'sinon'
import Prometheus from 'prom-client'

import { Metrics } from './metrics'

describe('Metrics', () => {
  let registry: any
  let metrics: any

  beforeEach(async () => {
    registry = new Prometheus.Registry()
    metrics = new Metrics({ registry })
  })

  afterEach(async () => {
    sinon.restore()
  })

  it('should store metrics', async () => {
    metrics.observeSync({
      name: 'foo',
      namespace: 'example',
      backend: 'foo',
      status: 'success'
    })
    expect(registry.metrics()).to.have.string(
      'sync_calls{name="foo",namespace="example",backend="foo",status="success"} 1'
    )
  })
})
