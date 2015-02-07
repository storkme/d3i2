/**
 * From https://github.com/meoguru/traceur-source-maps
 * Created by stork on 07/02/2015.
 */
var traceur = require('traceur');

require('traceur-source-maps').install(traceur);

traceur.require.makeDefault(function (filePath) {
    return !~filePath.indexOf('node_modules');
});
// There is no need to pass `{ sourceMaps: true }` as options,
// source mapping is always enabled after install

require('./main');