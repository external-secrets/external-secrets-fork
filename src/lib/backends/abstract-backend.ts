export interface KeyOptions {
  [option: string]: any
}

export interface DataEntry extends KeyOptions {
  key: string
  name: string
  property?: string
}

export type Data = DataEntry[]

export type DataFrom = string[]

export interface SpecOptions {
  [option: string]: any
}

export interface Spec extends SpecOptions {
  properties?: Data
  data: Data
  dataFrom: DataFrom
}

export interface SecretManifest {
  spec: Spec
}

export interface SecretData {
  [option: string]: string
}

/** Abstract backend class. */
export interface AbstractBackend {
  /**
   * Fetch Kubernetes secret manifest data.
   */
  getSecretManifestData(secretManifest: SecretManifest): Promise<SecretData>
}
