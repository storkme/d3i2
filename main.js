/**
 * Created by stork on 07/02/2015.
 */

var config = require('config'),
    log = require('winston'),
    Rx = require('rx'),
    program = require('commander'),
    D3iFetcher = require('./lib/d3i-fetcher');

log.cli();

program
    .version(require('./package.json').version)
    .command('get <region> <class>')
    .description('Fetch profile data for the given class on the given region')
    .option('-h, --hardcore', 'hardcore mode', false)
    .option('-s, --season <season_num>', 'seasonal')
    .option('-l, --limit <max_entries>', 'how many ranking entries to inspect', 100)
    .option('-v, --verbose', 'verbose logging', false)
    .action((region, clss, options) => {
        log.level = options.verbose ? 'silly' : 'debug';
        var type = options.season ? 'season' : 'era',
            eraOrSeason = options.season || config.get('model.currentEra');
        log.info("region=%s, class=%s, type=%s, eraOrSeason=%s", region, clss, type, eraOrSeason);

        var fetcher = new D3iFetcher(region, clss, options.max_entries,
            type, eraOrSeason, options.hardcore);

        fetcher.heroes.subscribe(({hero, profile, count}) => {
            log.info("Inserted %d records for %s:", count, hero.name, profile);
        }, (err) => {
            log.warn("Error inserting data", err);
        }, () => log.info("Finished saving hero data"));

        fetcher.items.subscribe(Rx.helpers.noop,
            (err) => log.warn("Error aggregating skills", err),
            () => log.info("Finished inserting skills"));

        fetcher.skills.subscribe(Rx.helpers.noop,
            (err) =>log.warn("Error aggregating skills", err),
            () => log.info("Finished inserting skills"));
    });

program.parse(process.argv);