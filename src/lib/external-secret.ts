import JSONStream from 'json-stream'

/**
 * Creates an FIFO queue which you can put to and take from.
 * If theres nothing to take it will wait with resolving until
 * something is put to the queue.
 * @returns {Object} Queue instance with put and take methods
 */
function createEventQueue() {
  const queuedEvents: any[] = []
  const waitingResolvers: any[] = []

  return {
    take: () =>
      queuedEvents.length > 0
        ? Promise.resolve(queuedEvents.shift())
        : new Promise((resolve) => waitingResolvers.push(resolve)),
    put: (msg: any) =>
      waitingResolvers.length > 0
        ? waitingResolvers.shift()(msg)
        : queuedEvents.push(msg)
  }
}

async function startWatcher({
  kubeClient,
  customResourceManifest,
  logger,
  eventQueue
}: any) {
  const deathQueue = createEventQueue()

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      logger.debug('Starting watch stream')

      const stream = kubeClient.apis[
        customResourceManifest.spec.group
      ].v1.watch[customResourceManifest.spec.names.plural].getStream()

      const jsonStream = new JSONStream()
      stream.pipe(jsonStream)

      jsonStream.on('data', eventQueue.put)

      jsonStream.on('error', (err: any) => {
        logger.warn(err, 'Got error on stream')
        deathQueue.put('ERROR')
      })

      jsonStream.on('end', () => {
        deathQueue.put('END')
      })

      await deathQueue.take()

      logger.debug('Stopping watch stream')
      eventQueue.put({ type: 'DELETED_ALL' })

      stream.abort()
    }
  } catch (err) {
    logger.error(err, 'Watcher crashed')
  }
}

/**
 * Get a stream of external secret events. This implementation uses
 * watch and yields as a stream of events.
 * @param {Object} kubeClient - Client for interacting with kubernetes cluster.
 * @param {Object} customResourceManifest - Custom resource manifest.
 * @returns {Object} An async generator that yields externalsecret events.
 */
export function getExternalSecretEvents({
  kubeClient,
  customResourceManifest,
  logger
}: any) {
  return (async function* () {
    const eventQueue = createEventQueue()

    startWatcher({
      kubeClient,
      customResourceManifest,
      logger,
      eventQueue
    })

    while (true) {
      yield await eventQueue.take()
    }
  })()
}
