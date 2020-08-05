import express from 'express'
import Prometheus from 'prom-client'
import { Server } from 'http'

/** MetricsServer class. */
export class MetricsServer {
  private _port: number
  private _logger: any
  private _registry: any
  private _app: express.Application
  private _server?: Server

  /**
   * Create Metrics Server
   * @param {number} port  - the port to listen on
   * @param {Object} logger - Logger for logging stuff
   * @param {Object} register - Prometheus registry that holds metric data
   */
  constructor({ port, logger, registry }: any) {
    this._port = port
    this._logger = logger
    this._registry = registry

    this._app = express()
    this._app.get('/metrics', (req, res) => {
      res.set('Content-Type', Prometheus.register.contentType)
      res.end(this._registry.metrics())
    })
  }

  /**
   * Start the metrics server: Listen on a TCP port and serve metrics over HTTP
   */
  start() {
    return new Promise((resolve, reject) => {
      this._server = this._app.listen(this._port, () => {
        this._logger.info(`MetricsServer listening on port ${this._port}`)
        resolve()
      })
      this._app.on('error', (err) => reject(err))
    })
  }

  /**
   * Stop the metrics server
   */
  stop() {
    return new Promise((resolve, reject) => {
      this._server?.close((err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  }
}
