/**
 * Created by stork on 07/02/2015.
 */

var config = require('config'),
    log = require('winston'),
    Rx = require('rx'),
    argv = require('minimist')(process.argv.slice(2)),
    Scraper = require('./lib/scraper'),
    API = require('./lib/d3api'),
    Database = require('./lib/database');

Rx.config.longStackSupport = !!argv.v;

log.cli();
log.level = argv.v ? 'silly' : 'info';

var [region, clss, type, eraOrSeason] = argv._;

if (!region || !clss) {
    log.info("Missing arguments");
    log.info("Required: <eu|na> <class> [era|season] [eraNum|seasonNum]");
    log.info("Optional: -v (verbose), -h (hardcore)");
    return;
}

type = type || 'era';
eraOrSeason = eraOrSeason || 2;

var scraper = new Scraper(config.get('endpoints.rankings')),
    api = new API(),
    db = new Database(config.get('database'));

var source = scraper.getHeroes(region, clss, type, eraOrSeason)
    .take(100)
    .select((profile) => {
        return api.getEligibleHeroes(region, profile.name, profile.code, clss, !!argv.h)
            .merge(5)
            .filter((heroStub) => !!heroStub)
            .doOnNext((heroStub) => {
                log.silly("Found eligible hero stub: ", heroStub);
            })
            .select((heroStub) => api.getHeroData(region, profile.name, profile.code, heroStub.id))
            .merge(1)
            .selectMany((hero) => db.insertHero(hero, region, profile.name, profile.code,
                profile.tier, profile.time))
            .count()
            .filter((count) => count > 0)
            .select((count) => [count, profile]);
    })
    .merge(3)
    .publish()
    .refCount();

source
    .subscribe((result) => {
        var [count, profile] = result;
        log.info("Inserted %d records for:", count, profile);
    }, (err) => {
        console.dir(err);
        console.dir(err.stack);
    });
