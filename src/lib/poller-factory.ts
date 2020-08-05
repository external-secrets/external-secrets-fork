import { Poller } from './poller'

export class PollerFactory {
  private _logger: any
  private _metrics: any
  private _backends: any
  private _kubeClient: any
  private _pollerIntervalMilliseconds: any
  private _customResourceManifest: any
  private _rolePermittedAnnotation: any
  private _namingPermittedAnnotation: any
  private _enforceNamespaceAnnotation: any
  private _pollingDisabled: any

  /**
   * Create PollerFactory.
   * @param {Object} backends - Backends for fetching secret properties.
   * @param {Object} kubeClient - Client for interacting with kubernetes cluster.
   * @param {Object} metrics - Metrics client
   * @param {Object} customResourceManifest - CRD manifest
   * @param {Object} logger - Logger for logging stuff.
   * @param {number} pollerIntervalMilliseconds - Interval time in milliseconds for polling secret properties.
   * @param {String} rolePermittedAnnotation - namespace annotation that defines which roles can be assumed within this namespace
   */
  constructor({
    backends,
    kubeClient,
    metrics,
    pollerIntervalMilliseconds,
    rolePermittedAnnotation,
    namingPermittedAnnotation,
    customResourceManifest,
    enforceNamespaceAnnotation,
    pollingDisabled,
    logger
  }: any) {
    this._logger = logger
    this._metrics = metrics
    this._backends = backends
    this._kubeClient = kubeClient
    this._pollerIntervalMilliseconds = pollerIntervalMilliseconds
    this._customResourceManifest = customResourceManifest
    this._rolePermittedAnnotation = rolePermittedAnnotation
    this._namingPermittedAnnotation = namingPermittedAnnotation
    this._enforceNamespaceAnnotation = enforceNamespaceAnnotation
    this._pollingDisabled = pollingDisabled
  }

  /**
   * Create poller
   * @param {Object} externalSecret - External Secret custom resource oject
   */
  createPoller({ externalSecret }: any) {
    const poller = new Poller({
      backends: this._backends,
      intervalMilliseconds: this._pollerIntervalMilliseconds,
      kubeClient: this._kubeClient,
      logger: this._logger,
      metrics: this._metrics,
      customResourceManifest: this._customResourceManifest,
      rolePermittedAnnotation: this._rolePermittedAnnotation,
      namingPermittedAnnotation: this._namingPermittedAnnotation,
      enforceNamespaceAnnotation: this._enforceNamespaceAnnotation,
      pollingDisabled: this._pollingDisabled,
      externalSecret
    })

    return poller
  }
}
