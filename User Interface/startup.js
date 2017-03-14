/*
 * Startup File - Invoke User Preferences
 *
 */

"use strict";
var preferenceParsing = require(__dirname + "/Application/preferences");
var server = require(__dirname + "/Application/server");
global.CONFIG = {
    version: "0.1",
    https: false,
    certPath: null,
    port: 80,
    endpointPath: __dirname + "/auroraEndpoints.json",
    baseAPI: "https://api.auroras.live/v1/"
};
preferenceParsing.parse(function callback () {
    server.invoke();
});
