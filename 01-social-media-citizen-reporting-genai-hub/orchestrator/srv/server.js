const cds = require('@sap/cds')
const cors = require('cors')
let app = {}


cds
    .on('bootstrap', _app => {
        app = _app
        app.use(cors()) // allow to be called from e.g. editor.swagger.io 
    })
module.exports = cds.server