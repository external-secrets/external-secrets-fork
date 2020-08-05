/* eslint-env mocha */
import { kubeClient } from '../../src/config'

before(async () => {
  await kubeClient.loadSpec()
})
