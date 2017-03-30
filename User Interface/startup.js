/*
 * Startup File - Invoke User Preferences
 *
 */

"use strict";
var preferenceParsing = require(__dirname + "/Application/preferences");
var server = require(__dirname + "/Application/server");
global.CONFIG = require(__dirname + "/conf.json");
CONFIG.secure = require(__dirname + "/secure.json");
CONFIG.endpointPath = __dirname + "/" + CONFIG.endpointFile;
preferenceParsing.parse(function callback () {
    server.invoke();
});
