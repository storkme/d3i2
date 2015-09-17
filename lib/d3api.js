/**
 * Created by stork on 07/02/2015.
 */

import needle from 'needle';
import Rx from 'rx';
import config from 'config';
import log from 'winston';
import _ from 'lodash';

class D3API {
  constructor(apiToken) {
    this.apiEndpoints = config.get('endpoints.api');
    this.itemSlots = config.get('model.items');
    this.apiToken = apiToken;
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

  getHeroData(region, name, code, heroId, isSeasonal, season) {
    return D3API.apiCall(this.apiEndpoints.hero, {region, name, code, heroId})
      .filter((hero) => {
        var requiredItems = config.get('model.items.required'),
          hasAllSkills = hero.skills.active.length === 6 &&
            hero.skills.active.every((active) => active.skill && active.rune &&
            active.skill.slug && active.rune.slug),
          seasonal = isSeasonal ? hero.seasonCreated == season : true;

        var result = hero.skills.passive.length === 4 &&
          hero.skills.passive.every((passive) => !!passive.skill) &&
          hasAllSkills &&
          _.includes.apply(null, [Object.keys(hero.items)].concat(requiredItems));

        if (!result) {
          log.silly("[%s] [%s-%s] %s (%d): filtered out: hasSkills=%s, seasonal=%s",
            region, name, code, hero.name, heroId, hasAllSkills, seasonal);
        }

        return result;
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

  getLeaderboards(region, season, leaderboard) {
    let vals = _.curry(_.values);
    return D3API.apiCall(this.apiEndpoints.rankings, {region, season, leaderboard}, this.apiToken)
      .select(({rows}) =>
        rows.map(({player, order, data}) => ({
          player: player.map(p => _.assign(p, _.zipObject(p.data.map(vals)))),
          order,
          rift: _.zipObject(data.map(vals))
        }))
    );
  }

  static apiCall(uriTemplate, params, token) {
    let compiled = _.template(uriTemplate);
    let uri = compiled(params);
    let opts = token ? {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    } : {};

    return Rx.Observable.fromNodeCallback(needle.get, needle, (result) => JSON.parse(result[1]))(uri, opts)
      .doOnNext(() => log.silly("Fetched: %s", uri))
      .catch((err) => {
        log.warn("Error fetching uri %s", uri, err);
        return Rx.Observable.empty();
      });
  }
}

export default D3API;