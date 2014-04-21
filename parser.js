var url = 'http://www.aph.gov.au/Senators_and_Members/Parliamentarian_Search_Results?q=&mem=1&sen=1&par=-1&gen=0&ps=100&st=1';

var request = require('request');
var cheerio = require('cheerio');
var _ = require('lodash'); 

request(url, function (err, response, body) {
	var $ = cheerio.load(body);
	console.log($('a').attr('href'));
	var legislators = $('.search-filter-results li');
	_.each(legislators , function (legislator, index) {
		var img_url = ($('img' ,legislator).attr('src'));
		var name = ($('.title a' ,legislator).text());
		var data = {
			name: name,
			img_url: img_url
		}
		console.log(data);

	})
});