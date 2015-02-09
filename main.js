/**
 * Created by stork on 07/02/2015.
 */

var config = require('config'),
    log = require('winston'),
    Rx = require('rx'),
    _=  require('lodash'),
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
    log.info("Required: <eu|us> <class> [era|season] [eraNum|seasonNum]");
    log.info("Optional: -v (verbose), -h (hardcore)");
    return;
}

type = type || 'era';
eraOrSeason = eraOrSeason || 2;

log.info("region=%s, class=%s, type=%s, eraOrSeason=%s", region, clss, type, eraOrSeason);

var scraper = new Scraper(config.get('endpoints.rankings')),
    api = new API(),
    db = new Database(config.get('database')),
    dbDisposable = new Rx.RefCountDisposable(Rx.Disposable.create(() => {
        //todo: make this work
        db.end();
    }));

var source = scraper.getHeroes(region, clss, type, eraOrSeason)
    .take(2)
    .select((profile) => {
        return api.getEligibleHeroes(region, profile.name, profile.code, clss, !!argv.h)
            .filter((heroStub) => !!heroStub)
            .doOnNext((heroStub) => log.silly("Found eligible hero stub: ", heroStub))
            .select((heroStub) => api.getHeroData(region, profile.name, profile.code, heroStub.id))
            .merge(1)
            .doOnNext((hero) => log.silly("Loaded all data for hero %s", hero.name, profile))
            .select((hero) => ({profile, hero}))
    })
    .merge(1)
    .publish()
    .refCount();

//data writer
source
    .selectMany(({hero, profile}) => {
        return db.insertHero(hero, region, profile.name, profile.code,
            profile.tier, profile.time)
            .count()
            .select((count) => ({hero, profile, count}));
    })
    .subscribe(({hero, profile, count}) => {
        log.info("Inserted %d records for:", count, profile);
    }, (err) => {
        log.warn("Error inserting data", err);
    }, () => log.info("Finished saving hero data"));

//skills
source
    .selectMany(({hero, profile}) => {
        return Rx.Observable.create((obs) => {
            hero.skills.active.forEach((active) => {
                var skill = active.skill,
                    rune = active.rune;
                obs.onNext([skill, 'skill']);
                obs.onNext([rune, 'rune']);
            });
            hero.skills.passive.forEach((passive) => {
                obs.onNext([passive, 'passive']);
            });
            obs.onCompleted();
        })
    })
    .reduce((acc, next) => {
        var [skill, type] = next,
            key = skill.slug;
        skill.type = type;
        if (!acc[key]) {
            acc[key] = skill;
        }
        return acc;
    }, {})
    .selectMany((skills) => {
        return Rx.Observable.merge(_(skills).mapValues((skill) => {
            return db.insertSkillDetails(clss, skill, skill.type);
        }).values().value());
    })
    .subscribe((result) => {
        //nada
    }, (err) => {
        log.warn("Error aggregating skills", err);
    }, () => log.info("Finished inserting skills"));

//items
source
    .selectMany(({hero, profile}) => {
        return Rx.Observable.create((obs) => {
            Object.keys(hero.items).forEach((slot) => {
                var item = hero.items[slot];
                obs.onNext(item.data);
                if (item.data.gems) {
                    item.data.gems.forEach((gem) => obs.onNext(gem.item));
                }
            });
            obs.onCompleted();
        });
    })
    .reduce((acc, item) => {
        if (!acc[item.id]) {
            acc[item.id] = item;
        }
        return acc;
    }, {})
    .selectMany((items) => {
        return Rx.Observable.merge(_(items).mapValues((item) => {
            return db.insertItemDetails(item);
        }).values().value());
    })
    .subscribe((next) => {
    },
    (err) => log.warn("Error aggregating items", err),
    () => log.info("Finished inserting items"));