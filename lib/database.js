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
                        var stats = Rx.Observable.merge(
                                Object.keys(hero.stats).map((name) => this.insert('hero_stats', {
                                    hero_id,
                                    name,
                                    value: hero.stats[name]
                                }))),
                            items = this.insertItems(hero_id, hero.items),
                            skills = this.insertSkills(hero_id, hero.skills);

                        return Rx.Observable.merge(stats, items, skills);
                    });
            });
    }

    insertItems(hero_id, items) {
        return Rx.Observable.merge(Object.keys(items).map((slot) => {
            let item = items[slot];
            return this.insert('hero_items', {
                hero_id,
                item_id: item.id,
                name: item.name,
                icon: item.icon,
                color: item.displayColor,
                tooltip_params: item.tooltipParams,
                slot: slot
            }, true)
                .selectMany((item_id) => {
                    var attrs = Rx.Observable.merge(Object.keys(item.data.attributesRaw).map((attrName) => this.insert('item_attrs', {
                            item_id,
                            name: attrName,
                            val_min: item.data.attributesRaw[attrName].min,
                            val_max: item.data.attributesRaw[attrName].max
                        }))),
                        gems = Rx.Observable.merge(item.data.gems.map((gem) => this.insert('item_gems', {
                            item_id,
                            gem_id: gem.item.id,
                            rank: !_.isUndefined(gem.jewelRank) ? gem.jewelRank : -1
                        })));

                    return Rx.Observable.merge(attrs, gems);
                });
        }));
    }

    insertSkills(hero_id, skills) {
        return Rx.Observable.merge(
            Rx.Observable.merge(
                skills.active.map((activeSkill) => this.insert('hero_skills', {
                    hero_id,
                    name: activeSkill.skill.slug,
                    rune: activeSkill.rune.slug,
                    type: 'skill'
                }))),
            Rx.Observable.merge(skills.passive.map(
                (passive) => this.insert('hero_skills', {
                    hero_id,
                    name: passive.skill.slug,
                    rune: null,
                    type: 'passive'
                })))
        );
    }

    insertSkillDetails(clss, skill, type) {
        return this.query({
            name: 'get_skills',
            text: `SELECT * FROM skills WHERE class = $1
                AND slug = $2
                AND type = $3`,
            values: [clss, skill.slug, type]
        }).selectMany((result) => {
            if (result.rows.length > 0) {
                return Rx.Observable.empty();
            } else {
                return this.insert('skills', {
                    id: skill.skillCalcId,
                    parent_id: null,
                    slug: skill.slug,
                    name: skill.name,
                    level: skill.level,
                    tooltip: skill.tooltipUrl || skill.tooltipParams,
                    description: skill.description,
                    'class': clss,
                    icon: skill.icon,
                    type: type
                });

            }
        });
    }

    insertItemDetails(item) {
        return this.query({
            name: 'get_item_details',
            text: `SELECT * FROM items WHERE id = $1`,
            values: [item.id]
        })
            .selectMany((result) => {
                if (result.rows.length > 0) {
                    return Rx.Observable.empty();
                } else {
                    return this.insert('items', {
                        id: item.id,
                        name: item.name,
                        icon: item.icon,
                        color: item.displayColor,
                        type: item.typeName
                    });
                }
            });
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