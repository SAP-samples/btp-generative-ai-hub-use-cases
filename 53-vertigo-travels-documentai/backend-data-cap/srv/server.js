const { promisify } = require('util')
const cds = require('@sap/cds')
Object.defineProperty(cds.compile.to, 'openapi', { configurable: true, get: () => require('@sap/cds-dk/lib/compile/openapi') })
const cors = require('cors')
let app, docCache = {}

cds
    .on('bootstrap', _app => {
        app = _app
        app.use(cors()) // allow to be called from e.g. editor.swagger.io 
    })
module.exports = cds.server