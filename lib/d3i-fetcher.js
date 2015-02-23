/**
 * Created by stork on 09/02/2015.
 */

var log = require('winston'),
    config = require('config'),
    _ = require('lodash'),
    Rx = require('rx'),
    Scraper = require('./rankings-scraper'),
    API = require('./d3api'),
    Database = require('./database');

class D3iFetcher {

    constructor(region, clss, count, type, eraOrSeason, hardcore) {
        var scraper = new Scraper(config.get('endpoints.rankings')),
            api = new API(),
            db = new Database(config.get('database')),
            seasonal = type === 'season',
            longClass = config.get('model.classes')[clss],
            dbDisposable = new Rx.RefCountDisposable(Rx.Disposable.create(() => {
                //todo: make this work
                db.end();
            }));

        var source = scraper.getHeroes(region, clss, type, eraOrSeason)
            .take(count)
            .select((profile) => {
                return api.getEligibleHeroes(region, profile.name, profile.code, longClass, !!hardcore, seasonal)
                    .filter((heroStub) => !!heroStub)
                    .doOnNext((heroStub) => log.silly("Found eligible hero stub: ", heroStub))
                    .select((heroStub) => api.getHeroData(region, profile.name, profile.code,
                        heroStub.id, seasonal, eraOrSeason, hardcore))
                    .merge(1)
                    .doOnNext((hero) => log.silly("Loaded all data for hero %s", hero.name, profile))
                    .select((hero) => ({profile, hero}))
            })
            .merge(1)
            .publish()
            .refCount();

        this._heroes = source.selectMany(({hero, profile}) => {
            return db.insertHero(hero, region, profile.name, profile.code,
                profile.tier, profile.time)
                .count()
                .select((count) => ({hero, profile, count}));
        });

        this._skills = source.selectMany(({hero, profile}) => {
            return Rx.Observable.create((obs) => {
                hero.skills.active.forEach((active) => {
                    var skill = active.skill,
                        rune = active.rune;
                    obs.onNext([skill, 'skill']);
                    obs.onNext([rune, 'rune']);
                });
                hero.skills.passive.forEach((passive) => {
                    obs.onNext([passive.skill, 'passive']);
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
                    return db.insertSkillDetails(longClass, skill, skill.type);
                }).values().value());
            });

        this._items = source.selectMany(({hero, profile}) => {
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
            });
    }

    get heroes() {
        return this._heroes;
    }

    get skills() {
        return this._skills;
    }

    get items() {
        return this._items;
    }
}

module.exports = D3iFetcher;