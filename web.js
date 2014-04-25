// web.js
//require node modules (see package.json)
var cors = require("cors");
var express = require("express");
var logfmt = require("logfmt");

var MongoClient = require('mongodb').MongoClient,
    format = require('util').format;

var app = express();

function postcode_to_state(postcode) {
    if ((postcode >= 2600 && postcode <= 2618) || (String(postcode).substring(0, 2) == '29')) {
        return 'Australian Capital Territory';
    } else if (String(postcode).charAt(0) == '2') {
        return 'New South Wales';
    } else if (String(postcode).charAt(0) == '3') {
        return 'Victoria';
    } else if (String(postcode).charAt(0) == '4') {
        return 'Queensland';
    } else if (String(postcode).charAt(0) == '5') {
        return 'South Australia';
    } else if (String(postcode).charAt(0) == '6') {
        return 'Western Australia';
    } else if (String(postcode).charAt(0) == '7') {
        return 'Tasmania';
    } else if (String(postcode).charAt(0) == '8' || String(postcode).charAt(0) == '9') {
        return 'Northern Territory';
    }
};


app.use(cors());

MongoClient.connect(process.env.MONGOHQ_URL, function(err, db) {
    if (err) throw err;
    var collection = db.collection('legislators');

    app.use(logfmt.requestLogger());
    app.get('/legislators/', function(req, res) {

        var postcode = req.query.postcode;
        var state = postcode_to_state(postcode);

        

        var senate_docs ="";
        collection.find({ state:state, member_type:'senate' }).toArray(function(err, docs) {
            senate_docs = docs;
        collection.find({ postcodes:postcode, member_type:'house' }).toArray(function(err, docs) {
            res.send({
                legislators: senate_docs.concat(docs)
            });
        });
        });



    });
    console.log(process.env.MONGOHQ_URL);

    var port = Number(process.env.PORT || 5000);
    app.listen(port, function() {
        console.log("Listening on " + port);
    });

});
