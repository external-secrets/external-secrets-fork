import {
  AbstractBackend,
  SecretManifest,
  SecretData,
  SpecOptions,
  Data,
  DataFrom,
  KeyOptions
} from './abstract-backend'

interface RawSecretData {
  [name: string]: Buffer | string | number | boolean
}

export interface GetSecret {
  key: string
  keyOptions: KeyOptions
  specOptions: SpecOptions
}

/** Key Value backend class. */
export abstract class KVBackend implements AbstractBackend {
  readonly _logger: any

  /**
   * Create a Key Value backend.
   * @param {Object} logger - Logger for logging stuff.
   */
  constructor({ logger }: { logger: any }) {
    this._logger = logger
  }

  /**
   * Fetch Kubernetes secret property values.
   * @param {Object[]} data - Kubernetes secret properties.
   * @param {string} data[].key - Secret key in the backend.
   * @param {string} data[].name - Kubernetes Secret property name.
   * @param {string} data[].property - If the backend secret is an
   *   object, this is the property name of the value to use.
   * @param {Object} specOptions - Options set on spec level.
   * @returns {Promise} Promise object representing secret property values.
   */
  _fetchDataValues({
    data,
    specOptions
  }: {
    data: Data
    specOptions: SpecOptions
  }): Promise<RawSecretData[]> {
    return Promise.all<RawSecretData>(
      data.map(async (dataItem) => {
        const { name, property = null, key, ...keyOptions } = dataItem
        const plainOrObjValue = await this._get({
          key,
          keyOptions,
          specOptions
        })

        let value = plainOrObjValue
        if (property) {
          let parsedValue
          try {
            parsedValue = JSON.parse(value as string)
          } catch (err) {
            this._logger.warn(
              `Failed to JSON.parse value for '${key}',` +
                ' please verify that your secret value is correctly formatted as JSON.' +
                ` To use plain text secret remove the 'property: ${property}'`
            )
            return {}
          }

          if (!(property in parsedValue)) {
            throw new Error(`Could not find property ${property} in ${key}`)
          }

          value = parsedValue[property]
        }

        return { [name]: value }
      })
    )
  }

  /**
   * Fetch Kubernetes secret property values.
   * @param {DataFrom} dataFrom - Array of secret keys in the backend
   * @param {SpecOptions} specOptions - Options set on spec level that might be interesting for the backend
   * @returns {Promise} Promise object representing secret property values.
   */
  _fetchDataFromValues({
    dataFrom,
    specOptions
  }: {
    dataFrom: DataFrom
    specOptions: SpecOptions
  }): Promise<RawSecretData[]> {
    return Promise.all(
      dataFrom.map(async (key) => {
        const value = await this._get({ key, specOptions, keyOptions: {} })

        try {
          return JSON.parse(value as string)
        } catch (err) {
          this._logger.warn(
            `Failed to JSON.parse value for '${key}',` +
              ' please verify that your secret value is correctly formatted as JSON.'
          )
        }
      })
    )
  }

  /**
   * Get a secret property value from Key Value backend.
   * @param {string} key - Secret key in the backend.
   * @param {KeyOptions} keyOptions - Options for this specific key, eg version etc.
   * @param {SpecOptions} specOptions - Options for this external secret, eg role
   * @returns {Promise} Promise object representing secret property values.
   */
  abstract _get(secretRequest: {
    key: string
    keyOptions: KeyOptions
    specOptions: SpecOptions
  }): Promise<string | Buffer>

  /**
   * Convert secret value to buffer
   * @param {(string|Buffer|object)} plainValue - plain secret value
   * @returns {Buffer} Buffer containing value
   */
  _toBuffer(plainValue: unknown): Buffer {
    if (plainValue instanceof Buffer) {
      return plainValue
    }

    if (typeof plainValue === 'object') {
      return Buffer.from(JSON.stringify(plainValue), 'utf-8')
    }

    return Buffer.from(`${plainValue}`, 'utf8')
  }

  /**
   * Fetch Kubernetes secret manifest data.
   * @param {ExternalSecretSpec} spec - Kubernetes ExternalSecret spec.
   * @returns {Promise} Promise object representing Kubernetes secret manifest data.
   */
  async getSecretManifestData({
    spec: {
      // Use properties to be backwards compatible.
      properties = [],
      data = properties,
      dataFrom = [],
      ...specOptions
    }
  }: SecretManifest): Promise<SecretData> {
    const [dataFromValues, dataValues] = await Promise.all([
      this._fetchDataFromValues({ dataFrom, specOptions }),
      this._fetchDataValues({ data, specOptions })
    ])

    const plainValues = dataFromValues.concat(dataValues).reduce(
      (acc, parsedValue) => ({
        ...acc,
        ...parsedValue
      }),
      {}
    )

    const encodedEntries = Object.entries(
      plainValues
    ).map(([name, plainValue]) => [
      name,
      this._toBuffer(plainValue).toString('base64')
    ])

    return Object.fromEntries(encodedEntries)
  }
}
