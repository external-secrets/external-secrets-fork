/* eslint-env mocha */
import { expect } from 'chai'

import config, { kubeClient, customResourceManifest } from '../../src/config'
import { waitForSecret, uuid } from './framework'

const { awsConfig } = config

const ssm = awsConfig.systemManagerFactory()

describe('ssm', async () => {
  it('should pull existing secret from ssm and create a secret from it', async () => {
    let result: any = await ssm
      .putParameter({
        Name: `/e2e/${uuid}/name`,
        Type: 'String',
        Value: 'foo'
      })
      .promise()
      .catch((err) => {
        expect(err).to.equal(null)
      })

    result = await kubeClient.apis[customResourceManifest.spec.group].v1
      .namespaces('default')
      [customResourceManifest.spec.names.plural].post({
        body: {
          apiVersion: 'kubernetes-client.io/v1',
          kind: 'ExternalSecret',
          metadata: {
            name: `e2e-ssm-${uuid}`
          },
          spec: {
            backendType: 'systemManager',
            data: [
              {
                key: `/e2e/${uuid}/name`,
                name: 'name'
              }
            ]
          }
        }
      })

    expect(result).to.not.equal(undefined)
    expect(result.statusCode).to.equal(201)

    const secret = await waitForSecret('default', `e2e-ssm-${uuid}`)
    expect(secret.body.data.name).to.equal('Zm9v')
  })

  describe('permitted annotation', async () => {
    beforeEach(async () => {
      await kubeClient.api.v1.namespaces('default').patch({
        body: {
          metadata: {
            annotations: {
              'iam.amazonaws.com/permitted': '^(foo|bar)'
            }
          }
        }
      })
    })

    afterEach(async () => {
      await kubeClient.api.v1.namespaces('default').patch({
        body: {
          metadata: {
            annotations: {
              'iam.amazonaws.com/permitted': '.*'
            }
          }
        }
      })
    })

    it('should not pull from ssm', async () => {
      let result: any = await ssm
        .putParameter({
          Name: `/e2e/permitted/${uuid}`,
          Type: 'String',
          Value: 'foo'
        })
        .promise()
        .catch((err) => {
          expect(err).to.equal(null)
        })

      result = await kubeClient.apis[customResourceManifest.spec.group].v1
        .namespaces('default')
        [customResourceManifest.spec.names.plural].post({
          body: {
            apiVersion: 'kubernetes-client.io/v1',
            kind: 'ExternalSecret',
            metadata: {
              name: `e2e-ssm-permitted-${uuid}`
            },
            spec: {
              backendType: 'systemManager',
              roleArn: 'let-me-be-root',
              data: [
                {
                  key: `/e2e/permitted/${uuid}`,
                  name: 'name'
                }
              ]
            }
          }
        })

      expect(result).to.not.equal(undefined)
      expect(result.statusCode).to.equal(201)

      const secret = await waitForSecret('default', `e2e-ssm-permitted-${uuid}`)
      expect(secret).to.equal(undefined)

      result = await kubeClient.apis[customResourceManifest.spec.group].v1
        .namespaces('default')
        .externalsecrets(`e2e-ssm-permitted-${uuid}`)
        .get()
      expect(result).to.not.equal(undefined)
      expect(result.body.status.status).to.contain(
        'namespace does not allow to assume role let-me-be-root'
      )
    })
  })
})
