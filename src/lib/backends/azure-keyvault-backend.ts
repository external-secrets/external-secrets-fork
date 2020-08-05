import { SecretClient } from '@azure/keyvault-secrets'

import { KVBackend, GetSecret } from './kv-backend'

/** Secrets Manager backend class. */
export class AzureKeyVaultBackend extends KVBackend {
  private _credential: any

  /**
   * Create Key Vault backend.
   * @param {Object} credential - Credentials for authenticating with Azure Key Vault.
   * @param {Object} logger - Logger for logging stuff.
   */
  constructor({ credential, logger }: any) {
    super({ logger })
    this._credential = credential
  }

  _keyvaultClient({ keyVaultName }: any) {
    const url = `https://${keyVaultName}.vault.azure.net`
    const client = new SecretClient(url, this._credential)
    return client
  }

  /**
   * Get secret property value from Azure Key Vault.
   * @param {string} key - Key used to store secret property value in Azure Key Vault.
   * @param {string} specOptions.keyVaultName - Name of the azure key vault
   * @param {string} keyOptions.isBinary - Does the secret contain a binary? Set to "true" to handle as binary. Does not work with "property"
   * @returns {Promise} Promise object representing secret property value.
   */

  async _get({ key, keyOptions, specOptions: { keyVaultName } }: GetSecret) {
    const client = this._keyvaultClient({ keyVaultName })
    this._logger.info(
      `fetching secret ${key} from Azure KeyVault ${keyVaultName}`
    )
    const secret = await client.getSecret(key)
    // Handle binary files, since the Azure client does not
    if (keyOptions && keyOptions.isBinary) {
      return Buffer.from(secret.value!, 'base64')
    }
    return JSON.stringify(secret)
  }
}
