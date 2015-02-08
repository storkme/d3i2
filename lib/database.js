/**
 * Created by stork on 07/02/2015.
 */

var pg = require('pg'),
    Rx = require('rx'),
    _ = require('lodash'),
    log = require('winston');

class Database {

    constructor(config) {
        this.conf = config;
    }

    insertHero(hero, region, profileName, profileCode, rankingTier, rankingTime) {
        return this.query({
            name: 'del_hero',
            text: `DELETE FROM hero WHERE hero_id = $1`,
            values: [hero.id]
        })
            .selectMany(() => {
                return this.insert('hero', {
                    'hero_id': hero.id,
                    'name': hero.name,
                    'class': hero.class,
                    'battle_tag': profileName + '-' + profileCode,
                    'ranking_tier': rankingTier,
                    'ranking_time': rankingTime,
                    'last_updated': hero['last-updated'],
                    'paragon_level': hero.paragonLevel,
                    'region': region,
                    'seasonCreated': hero.seasonCreated,
                    'hardcore': hero.hardcore
                }, true)
                    .selectMany((hero_id) => {
                        var stats = Rx.Observable.forkJoin(
                                Object.keys(hero.stats).map((name) => this.insert('hero_stats', {
                                    hero_id,
                                    name,
                                    value: hero.stats[name]
                                })))
                            .doOnCompleted(() => console.log("["+hero_id+"] Inserted stats")),
                            items = this.insertItems(hero_id, hero.items)
                                .doOnCompleted(() => console.log("["+hero_id+"] Inserted items")),
                            skills = this.insertSkills(hero_id, hero.skills)
                                .doOnCompleted(() => console.log("["+hero_id+"] Inserted skills"));

                        return Rx.Observable.merge(stats, items, skills);
                    });
            });
    }

    insertItems(hero_id, items) {
        return Rx.Observable.forkJoin(Object.keys(items).map((slot) => {
            let item = items[slot];
            return this.insert('items', {
                hero_id,
                item_id: item.id,
                name: item.name,
                icon: item.icon,
                color: item.displayColor,
                tooltip_params: item.tooltipParams,
                slot: slot,
                data: item.data
            }, true)
                .selectMany((item_id) => {
                    var attrs = Rx.Observable.forkJoin(Object.keys(item.data.attributesRaw).map((attrName) => this.insert('item_attrs', {
                            item_id,
                            name: attrName,
                            val_min: item.data.attributesRaw[attrName].min,
                            val_max: item.data.attributesRaw[attrName].max
                        }))),
                        gems = Rx.Observable.forkJoin(item.data.gems.map((gem) => this.insert('item_gems', {
                            item_id,
                            gem_id: gem.item.id,
                            rank: !_.isUndefined(gem.jewelRank) ? gem.jewelRank : -1
                        })));

                    return Rx.Observable.forkJoin(attrs, gems);
                });
        }));
    }

    insertSkills(hero_id, skills) {
        return Rx.Observable.forkJoin(
            Rx.Observable.forkJoin(
                skills.active.map((activeSkill) => this.insert('hero_skills', {
                    hero_id,
                    name: activeSkill.skill.slug,
                    rune: activeSkill.rune.slug,
                    type: 'skill'
                }))),
            Rx.Observable.forkJoin(skills.passive.map(
                (passive) => this.insert('hero_skills', {
                    hero_id,
                    name: passive.skill.slug,
                    rune: null,
                    type: 'passive'
                })))
        );
    }

    insert(table, data, returnId = false) {
        var keys = Object.keys(data),
            vals = keys.map((key) => data[key]),
            placeholders = _.range(keys.length).map((n) => '$' + (n + 1)).join(','),
            queryText = `INSERT INTO ${table} (${keys.join(',')})
                    VALUES (${placeholders})`;

        if (returnId) {
            queryText += ' RETURNING id';
        }

        var queryObj = {
            name: `insert_${table}`,
            text: queryText,
            values: vals
        };

        var res = this.query(queryObj);
        if (returnId) {
            res = res.select((result) => result.rows[0].id);
        }
        return res;
    }

    query(obj) {
        return Rx.Observable.using(
            () => {
                var doneFn,
                    disposable = Rx.Observable.fromNodeCallback(pg.connect, pg)(this.conf)
                        .doOnNext((result) => {
                            doneFn = result[1];
                        });

                disposable.dispose = () => {
                    if (doneFn) {
                        doneFn();
                    }
                };
                return disposable;
            },
            (futureConnection) => {
                return futureConnection
                    .selectMany((connection) => {
                        var [conn, doneFn] = connection;
                        return Rx.Observable.fromNodeCallback(conn.query, conn)(obj);
                    });
            });
    }
}

module.exports = Database;