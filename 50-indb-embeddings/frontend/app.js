/* Load NodeJS Modules */
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
require('dotenv').config();

var app = express();
app.use(express.static(__dirname));

app.get('/getenvironmentvariables', function (req, res) {
    var xvar = process.env.PY_ENDPOINT;
    res.setHeader('Content-Type', 'application/json')
    res.status(200)
    res.send(JSON.stringify(xvar))
});

var port = process.env.PORT || 30000;

app.listen(port, function () {
    console.log('Example app listening on port ' + port);
});
