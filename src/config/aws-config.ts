/* eslint-disable no-process-env */
import * as AWS from 'aws-sdk'
import clonedeep from 'lodash.clonedeep'
import merge from 'lodash.merge'

const localstack = process.env.LOCALSTACK || 0

// For IRSA debugging using telepresence
if (process.env.NODE_ENV === 'development' && process.env.TELEPRESENCE_ROOT) {
  process.env.AWS_WEB_IDENTITY_TOKEN_FILE = require('path').join(
    process.env.TELEPRESENCE_ROOT,
    process.env.AWS_WEB_IDENTITY_TOKEN_FILE
  )
}

let secretsManagerConfig = {}
let systemManagerConfig = {}
let stsConfig: AWS.STS.Types.ClientConfiguration = {
  region: process.env.AWS_REGION || 'us-west-2',
  stsRegionalEndpoints: (process.env.AWS_STS_ENDPOINT_TYPE as any) || 'regional'
}

if (localstack) {
  secretsManagerConfig = {
    endpoint: process.env.LOCALSTACK_SM_URL || 'http://localhost:4584',
    region: process.env.AWS_REGION || 'us-west-2'
  }
  systemManagerConfig = {
    endpoint: process.env.LOCALSTACK_SSM_URL || 'http://localhost:4583',
    region: process.env.AWS_REGION || 'us-west-2'
  }
  stsConfig = {
    endpoint: process.env.LOCALSTACK_STS_URL || 'http://localhost:4592',
    region: process.env.AWS_REGION || 'us-west-2'
  }
}

export default {
  secretsManagerFactory: (opts = {}) => {
    if (localstack) {
      opts = merge(clonedeep(opts), secretsManagerConfig)
    }
    return new AWS.SecretsManager(opts)
  },
  systemManagerFactory: (opts = {}) => {
    if (localstack) {
      opts = merge(clonedeep(opts), systemManagerConfig)
    }
    return new AWS.SSM(opts)
  },
  assumeRole: (assumeRoleOpts: AWS.STS.AssumeRoleRequest) => {
    const sts = new AWS.STS(stsConfig)

    return new Promise((resolve, reject) => {
      sts.assumeRole(assumeRoleOpts, (err, res) => {
        if (err) {
          return reject(err)
        }
        resolve(res)
      })
    })
  }
}
