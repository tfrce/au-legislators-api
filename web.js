// web.js
//require node modules (see package.json)
var cors = require("cors");
var express = require("express");
var logfmt = require("logfmt");

var MongoClient = require('mongodb').MongoClient,
    format = require('util').format;

var app = express();

app.use(cors());

MongoClient.connect(process.env.MONGOHQ_URL, function(err, db) {
    if (err) throw err;
    var collection = db.collection('legislators');

    app.use(logfmt.requestLogger());
    app.get('/', function(req, res) {

        collection.find().toArray(function(err, docs) {
            res.send({
                legislators: docs
            });
        });

    });
    console.log(process.env.MONGOHQ_URL);

    var port = Number(process.env.PORT || 5000);
    app.listen(port, function() {
        console.log("Listening on " + port);
    });

});
