/* eslint-env mocha */
import { expect } from 'chai'
import * as sinon from 'sinon'

import { GCPSecretsManagerBackend } from './gcp-secrets-manager-backend'

describe('GCPSecretsManagerBackend', () => {
  let loggerMock: any
  let clientMock: any
  let gcpSecretsManagerBackend: any
  const key = 'password'
  const version = [
    {
      name: 'projects/111122223333/secrets/password/versions/1',
      payload: { data: Buffer.from('test', 'utf8') }
    },
    null,
    null
  ]
  const secret = 'test'

  beforeEach(() => {
    loggerMock = sinon.mock()
    loggerMock.info = sinon.stub()
    clientMock = sinon.mock()
    clientMock.accessSecretVersion = sinon.stub().returns(version)

    gcpSecretsManagerBackend = new GCPSecretsManagerBackend({
      logger: loggerMock,
      client: clientMock
    })

    gcpSecretsManagerBackend._getProjectId = sinon
      .stub()
      .returns('111122223333')
  })

  describe('_get', () => {
    it('returns secret property value', async () => {
      const secretPropertyValue = await gcpSecretsManagerBackend._get({
        key: key,
        keyOptions: { version: 1 },
        specOptions: {
          projectId: '111122223333'
        }
      })
      expect(secretPropertyValue).equals(secret)
    })
  })
})
