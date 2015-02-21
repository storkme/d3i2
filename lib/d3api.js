/**
 * Created by stork on 07/02/2015.
 */

var Rx = require('rx'),
    request = require('request'),
    config = require('config'),
    log = require('winston'),
    _ = require('lodash');

class D3API {
    constructor() {
        this.apiEndpoints = config.get('endpoints.api');
        this.itemSlots = config.get('model.items');
    }

    getEligibleHeroes(region, name, code, clss, hardcore, seasonal) {
        return D3API.apiCall(this.apiEndpoints.profile, {region, name, code})
            .select((profile) => {
                return _(profile.heroes).filter((hero) =>
                     hero.level === 70
                        && !hero.dead
                        && hero.class === clss
                        && hero.hardcore === !!hardcore
                        && hero.seasonal === !!seasonal
                )
                    .sortBy('last-updated')
                    .reverse()
                    .value()[0];
            });
    }

    getHeroData(region, name, code, heroId) {
        return D3API.apiCall(this.apiEndpoints.hero, {region, name, code, heroId})
            .filter((hero) => {
                var requiredItems = config.get('model.items.required'),
                    hasAllSkills = hero.skills.active.length === 6 &&
                        hero.skills.active.every((active) => active.skill && active.rune &&
                        active.skill.slug && active.rune.slug);
                return hero.skills.passive.length === 4 &&
                        hero.skills.passive.every((passive) => !!passive.skill) &&
                    hasAllSkills &&
                    _.includes.apply(null, [Object.keys(hero.items)].concat(requiredItems));
            })
            .select((hero) => {
                var items = config.get('model.items.required').concat(config.get('model.items.optional'))
                    .filter((slot) => !!hero.items[slot]);
                return Rx.Observable.for(items, (slot) => {
                    return D3API.apiCall(this.apiEndpoints.item, {region, itemData: hero.items[slot].tooltipParams})
                        .select((itemData) => [slot, itemData]);
                })
                    .reduce((acc, result) => {
                        var [slot, itemData] = result;
                        acc.items[slot].data = itemData;
                        return acc;
                    }, hero);
            })
            .merge(1);
    }

    static apiCall(uriTemplate, params) {
        var compiled = _.template(uriTemplate),
            uri = compiled(params);
        return Rx.Observable.fromNodeCallback(request.get, request, (result) => JSON.parse(result[1]))(uri)
            .doOnNext(() => log.silly("Fetched: %s", uri))
            .catch((err) => {
                log.warn("Error fetching uri %s", uri, err);
                return Rx.Observable.empty();
            });
    }
}

module.exports = D3API;