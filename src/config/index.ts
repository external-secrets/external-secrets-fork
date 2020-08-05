import vault from 'node-vault'
import * as kube from 'kubernetes-client'
import KubeRequest from 'kubernetes-client/backends/request'
import pino from 'pino'
import yaml from 'js-yaml'
import fs from 'fs'
import path from 'path'

import awsConfig from './aws-config'
import azureConfig from './azure-config'
import alicloudConfig from './alicloud-config'
import gcpConfig from './gcp-config'
import envConfig from './environment'
import { CustomResourceManager } from '../lib/custom-resource-manager'
import { SecretsManagerBackend } from '../lib/backends/secrets-manager-backend'
import { SystemManagerBackend } from '../lib/backends/system-manager-backend'
import { VaultBackend } from '../lib/backends/vault-backend'
import { AzureKeyVaultBackend } from '../lib/backends/azure-keyvault-backend'
import { GCPSecretsManagerBackend } from '../lib/backends/gcp-secrets-manager-backend'
import { AliCloudSecretsManagerBackend } from '../lib/backends/alicloud-secrets-manager-backend'

// Get document, or throw exception on error
export const customResourceManifest = yaml.safeLoad(
  fs.readFileSync(
    path.resolve(
      __dirname,
      '../../charts/kubernetes-external-secrets/crds/kubernetes-client.io_externalsecrets_crd.yaml'
    ),
    'utf8'
  )
)
customResourceManifest.metadata.annotations['app.kubernetes.io/managed-by'] =
  'custom-resource-manager'

const kubeconfig = new kube.KubeConfig()
kubeconfig.loadFromDefault()
const kubeBackend = new KubeRequest({ kubeconfig })
export const kubeClient = new kube.Client({ backend: kubeBackend })

export const logger = pino({
  serializers: {
    err: pino.stdSerializers.err
  },
  messageKey: envConfig.logMessageKey || 'msg',
  level: envConfig.logLevel,
  formatters: {
    level(label, number) {
      return { level: envConfig.useHumanReadableLogLevels ? label : number }
    }
  }
})

const customResourceManager = new CustomResourceManager({
  kubeClient,
  logger,
  disabled: envConfig.customResourceManagerDisabled
})

const secretsManagerBackend = new SecretsManagerBackend({
  clientFactory: awsConfig.secretsManagerFactory,
  assumeRole: awsConfig.assumeRole,
  logger
})
const systemManagerBackend = new SystemManagerBackend({
  clientFactory: awsConfig.systemManagerFactory,
  assumeRole: awsConfig.assumeRole,
  logger
})
const vaultOptions: any = {
  apiVersion: 'v1',
  endpoint: envConfig.vaultEndpoint,
  requestOptions: {
    // When running vault in HA mode, you must follow redirects on PUT/POST/DELETE
    // See: https://github.com/kr1sp1n/node-vault/issues/23
    followAllRedirects: true
  }
}
// Include the Vault Namespace header if we have provided it as an env var.
// See: https://github.com/kr1sp1n/node-vault/pull/137#issuecomment-585309687
if (envConfig.vaultNamespace) {
  vaultOptions.requestOptions.headers = {
    'X-VAULT-NAMESPACE': envConfig.vaultNamespace
  }
}
const vaultClient = vault(vaultOptions)
// The Vault token is renewed only during polling, not asynchronously. The default tokenRenewThreshold
// is three times larger than the pollerInterval so that the token is renewed before it
// expires and with at least one remaining poll opportunty to retry renewal if it fails.
const vaultTokenRenewThreshold = envConfig.vaultTokenRenewThreshold
  ? Number(envConfig.vaultTokenRenewThreshold)
  : (3 * envConfig.pollerIntervalMilliseconds) / 1000
const vaultBackend = new VaultBackend({
  client: vaultClient,
  tokenRenewThreshold: vaultTokenRenewThreshold,
  logger
})
const azureKeyVaultBackend = new AzureKeyVaultBackend({
  credential: azureConfig.azureKeyVault(),
  logger
})
const gcpSecretsManagerBackend = new GCPSecretsManagerBackend({
  client: gcpConfig.gcpSecretsManager(),
  logger
})
const alicloudSecretsManagerBackend = new AliCloudSecretsManagerBackend({
  credential: alicloudConfig.credential,
  logger
})
const backends = {
  // when adding a new backend, make sure to change the CRD property too
  secretsManager: secretsManagerBackend,
  systemManager: systemManagerBackend,
  vault: vaultBackend,
  azureKeyVault: azureKeyVaultBackend,
  gcpSecretsManager: gcpSecretsManagerBackend,
  alicloudSecretsManager: alicloudSecretsManagerBackend,

  // backwards compatibility
  secretManager: secretsManagerBackend
}

export default {
  awsConfig,
  backends,
  customResourceManager,
  customResourceManifest,
  ...envConfig,
  logger
}
