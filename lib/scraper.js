/**
 * Created by stork on 07/02/2015.
 */

var cheerio = require('cheerio'),
    request = require('request'),
    _ = require('lodash'),
    Rx = require('rx');

class Scraper {
    constructor(urlTemplate) {
        this.urlTemplate = urlTemplate;
    }

    getHeroes(region, clss, type = 'era', eraOrSeason = 1, hardcore = false) {
        var compiled = _.template(this.urlTemplate),
            uri = compiled({
                region,
                type,
                eraOrSeason,
                clss,
                hardcore: hardcore ? 'hardcore-' : ''
            });
        return Rx.Observable.fromNodeCallback(request.get, request, (result) => result[1])(uri)
            .selectMany((responseBody) => {
                var $ = cheerio.load(responseBody, {ignoreWhitespace: true}),
                    table = $('#ladders-table'),
                    rows = table.find('tbody > tr');
                var results = [];
                rows.each(function () {
                    var row = $(this),
                        link = row.find('td.cell-BattleTag a').first()[0],
                        tier = row.find('td.cell-RiftLevel').text(),
                        time = row.find('td.cell-RiftTime').text();
                    if (link) {
                        link = link.attribs.href;
                        var match = link.match(/\/d3\/en\/profile\/(.+)-([0-9]+)\//);
                        var [, name, tag] = match;
                        if (name && tag)
                            results.push({
                                name: name,
                                tag: tag,
                                tier: tier.trim(),
                                time: time.trim()
                            });
                    }
                });
                return Rx.Observable.from(results);
            });
    }
}

module.exports = Scraper;