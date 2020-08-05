// make-promises-safe installs an process.on('unhandledRejection') handler
// that prints the stacktrace and exits the process
// with an exit code of 1, just like any uncaught exception.
require('make-promises-safe')

import Prometheus from 'prom-client'
import { Daemon } from '../lib/daemon'
import { MetricsServer } from '../lib/metrics-server'
import { Metrics } from '../lib/metrics'
import { getExternalSecretEvents } from '../lib/external-secret'
import { PollerFactory } from '../lib/poller-factory'
import config, { kubeClient } from '../config'

const {
  backends,
  customResourceManager,
  customResourceManifest,
  logger,
  metricsPort,
  pollerIntervalMilliseconds,
  pollingDisabled,
  rolePermittedAnnotation,
  namingPermittedAnnotation,
  enforceNamespaceAnnotation
} = config

async function main() {
  logger.info('loading kube specs')
  await kubeClient.loadSpec()
  logger.info('successfully loaded kube specs')
  await customResourceManager.manageCrd({ customResourceManifest })

  const externalSecretEvents = getExternalSecretEvents({
    kubeClient,
    customResourceManifest,
    logger
  })

  const registry = Prometheus.register
  const metrics = new Metrics({ registry })

  const pollerFactory = new PollerFactory({
    backends,
    kubeClient,
    metrics,
    pollerIntervalMilliseconds,
    rolePermittedAnnotation,
    namingPermittedAnnotation,
    enforceNamespaceAnnotation,
    customResourceManifest,
    pollingDisabled,
    logger
  })

  const daemon = new Daemon({
    externalSecretEvents,
    logger,
    pollerFactory
  })

  const metricsServer = new MetricsServer({
    port: metricsPort,
    registry,
    logger
  })

  logger.info('starting app')
  daemon.start()
  metricsServer.start()
  logger.info('successfully started app')
}

main()
