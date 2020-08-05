declare module 'json-stream' {
  import { EventEmitter } from 'events'
  // import * as JSONStreamSrc from 'json-stream';
  export default class JSONStream extends EventEmitter {
    constructor(value?: any)
  }
}
