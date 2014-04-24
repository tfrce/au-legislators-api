var request = require('request');
var cheerio = require('cheerio');
var _ = require('lodash');
var async = require('async');
var csv = require('csv');
var MongoClient = require('mongodb').MongoClient,
    format = require('util').format;

var url = 'http://www.aph.gov.au/Senators_and_Members/Parliamentarian_Search_Results?q=&mem=1&sen=1&par=-1&gen=0&ps=5&st=1';
var url = 'http://www.aph.gov.au/Senators_and_Members/Parliamentarian_Search_Results?expand=1&q=&mem=1&par=-1&gen=0&ps=25'

var postcode_object = {};
function postcode_objectify(postcode_array) {
    for (var j = 0; j < postcode_array.length; j++) {
       if (postcode_array[j][1] in postcode_object) {
        postcode_object[postcode_array[j][1]] = postcode_object[postcode_array[j][1]]+','+postcode_array[j][0];
       } else {
        postcode_object[postcode_array[j][1]] = postcode_array[j][0];
       }
    }
    // console.log(postcode_object);
};

csv()
.from.path(__dirname + '/postcodes.csv', { delimiter: ',', escape: '"'})
.to.array(function(dataX) { 
	postcode_objectify(dataX); 
});

MongoClient.connect(process.env.MONGOHQ_URL, function(err, db) {
    if (err) throw err;
    var collection = db.collection('legislators');
    collection.remove({}, function(err, removed) {}); // remove entire collection
    request(url, function(err, response, body) {
        var $ = cheerio.load(body);

        var parseLegislators = function(legislators) {
            var legislator = legislators.pop();
            if (legislator) {

                var data = {};

                data.name = ($('.title a', legislator).text());
                data.img_url = ($('img', legislator).attr('src'));
                data.twitter = ($('.twitter', legislator).attr('href'));
                data.facebook = ($('.facebook', legislator).attr('href'));
                data.email = ($('.mail', legislator).attr('href'));
                data.legislator_page = ($('.title a', legislator).attr('href'));
                data.party = ($('dt:contains("Party")', legislator).next().text());
                var location = $('dl dd', legislator).eq(0).text(); // make more specific (senator or member for)
                location = location.split(',');
                
                data.state = location[1];
                data.suburb = location[0];

                data.postcode = postcode_object[location[0]];

                request('http://www.aph.gov.au/' + data.legislator_page, function(err, response, body) {

                    var $ = cheerio.load(body);
                    data.summary = $('#member-summary').text();
                    collection.insert(data, function(err, docs) {

                        parseLegislators(legislators);
                    });

                    console.log(data);

                });

            } else {
                //do nothing
            }
        };

        var legislators = $('.search-filter-results li');
        console.log(legislators.length);

        var legislators_array = [];
        _.each(legislators, function(legislator, index) {
            legislators_array.push(legislator);
        });

        parseLegislators(legislators_array);
        // _.each(legislators, function(legislator, index) {
        //     var img_url = ($('img', legislator).attr('src'));
        //     var name = ($('.title a', legislator).text());
        //     var twitter = ($('.twitter', legislator).attr('href'));
        //     var legislator_page = ($('.title a', legislator).attr('href'));
        //     var data = {
        //         name: name,
        //         img_url: img_url,
        //         twitter: twitter,
        //         legislator_page: legislator_page
        //     }


        //     collection.insert(data, function(err, docs) {

        // });
        // });
    });
});
