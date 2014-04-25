var request = require('request');
var cheerio = require('cheerio');
var _ = require('lodash');
var async = require('async');
var csv = require('csv');
var MongoClient = require('mongodb').MongoClient,
    format = require('util').format;

// var url = 'http://www.aph.gov.au/Senators_and_Members/Parliamentarian_Search_Results?q=&mem=1&sen=1&par=-1&gen=0&ps=5&st=1';
var url = 'http://www.aph.gov.au/Senators_and_Members/Parliamentarian_Search_Results?q=&mem=1&sen=1&par=-1&gen=0&ps=100&st=1'
var base_url = 'http://www.aph.gov.au';

var postcode_object = {};

function postcode_objectify(postcode_array) {
    for (var j = 0; j < postcode_array.length; j++) {
        if (postcode_array[j][1] in postcode_object) {
            postcode_object[postcode_array[j][1]].push(postcode_array[j][0]);
        } else {
            postcode_object[postcode_array[j][1]] = [postcode_array[j][0]];
        }
    }
};

csv()
.from.path(__dirname + '/postcodes.csv', {
    delimiter: ',',
    escape: '"'
})
.to.array(function(csv_data) {
    postcode_objectify(csv_data);
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

                
                data.name = $('.title a', legislator).text();
                data.img_url = $('img', legislator).attr('src');
                data.twitter = $('.twitter', legislator).attr('href');
                data.facebook = $('.facebook', legislator).attr('href');
                data.email = $('.mail', legislator).attr('href');
                data.legislator_page = base_url + $('.title a', legislator).attr('href');
                data.MPID = data.legislator_page.match(/MPID\=(.*)/)[1];
                data.party = $('dt:contains("Party")', legislator).next().text();
                
                var location = $('dl dd', legislator).eq(0).text(); // make more specific (senator or member for)
                location = location.split(',');

                if (location.length>1){
                // house members
                data.member_type ="house";    
                data.state = location[1] && location[1].trim() || '';
                data.electorate_location = location[0];
                data.postcodes = postcode_object[data.electorate_location];
                } else{
                //senate members
                data.member_type ="senate";    
                data.state = location[0];
                data.electorate_location = location[0];
                data.postcodes = [];
                }
                
                data.contact_form = base_url + $('.btn-contact-form').attr('href');

                request( data.legislator_page, function(err, response, body ) {

                    var $ = cheerio.load(body);
                    var second_column = $('.col-third').eq(1).html();
                    var third_column = $('.col-third').eq(2).html();
                    var websites = $('')

                    data.electorate_office_phone = $('dt:contains("phone")', second_column).next().text();
                    data.electorate_office_fax = $('dt:contains("Fax")', second_column).next().text();
                    data.electorate_office_toll_free = $('dt:contains("Free")', second_column).next().text();//broken
            
                    data.personal_website = $('a:contains("Personal website")',third_column).attr('href');
                    data.party_website = $('a:contains("Party website")',third_column).attr('href');
                    data.alternative_url = base_url + $('h3:contains("Alternative URL")',third_column).next().children('a').attr('href');


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
