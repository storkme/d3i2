/**
 * Created by stork on 07/02/2015.
 */

var config = require('config'),
    log = require('winston'),
    Rx = require('rx'),
    Scraper = require('./lib/scraper'),
    API = require('./lib/d3api'),
    Database = require('./lib/database');

Rx.config.longStackSupport = true;

log.cli();
log.level = 'silly';

var scraper = new Scraper(config.get('endpoints.rankings')),
    api = new API(),
    db = new Database(config.get('database'));

scraper.getHeroes('eu', 'barbarian', 'era', 2)
    .take(20)
    .select((profile) => {
        return api.getEligibleHeroes('eu', profile.name, profile.code, 'barbarian', false)
            .select((heroStub) => api.getHeroData('eu', profile.name, profile.code, heroStub.id))
            .merge(1)
            .selectMany((hero) => db.insertHero(hero, 'eu', profile.name, profile.code,
                profile.tier, profile.time))
            .select(() => profile);
    })
    .merge(1)
    .subscribe((hero) => {
        console.dir(hero);
    }, (err) => {
        console.dir(err);
        console.dir(err.stack);
    });