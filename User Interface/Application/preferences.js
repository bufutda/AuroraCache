/*
 * Parser for command-line preferences
 * Module: UserPreferencesHandling
 */

"use strict";

module.exports.parse = function (callback) {
    for (var i = 2; i < process.argv.length; i++) {
        var arg = process.argv[i].split("=");
        if (arg[0].substr(0, 2) === "--") {
            arg[0] = arg[0].substr(2);
            switch (arg[0]) {
                case "help":
                    helpText(0);
                    break;
                case "port":
                    if (!isNaN(parseInt(arg[1], 10))) {
                        console.log("[UPH] Using Port: " + arg[1]);
                        CONFIG.port = parseInt(arg[1], 10);
                    } else {
                        badArg(i);
                    }
                    break;
                default:
                    badArg(i);
                    break;
            }
        } else {
            console.error("[UPH] Error Parsing Argument: " + process.argv[i] + "\n");
            helpText(1);
        }
    }
    console.log("[UPH] Command-Line preference parsing complete.");
    console.log("[UPH] Loading endpoints from " + CONFIG.endpointPath);
    var endpoints = require(CONFIG.endpointPath).endpoints;
    global.ENDPOINTS = {};
    for (var i = 0; i < endpoints.length; i++) {
        var ep = endpoints[i];
        ENDPOINTS[ep.path] = ep;
        if (ep.hasOwnProperty("comment")) {
            console.warn("[UPH] Warning in " + ep.path + ": " + ep.comment);
        }
    }
    console.log("[UPH] Endpoint parsing complete");
    callback();
    return;
};

function helpText (code) {
    console.log("AuroraCache v" + CONFIG.version);
    console.log("\t--help\t\tPrint help text and exit");
    process.exit(code);
}

function badArg (i) {
    console.error("[UPH] Illegal Argument: " + process.argv[i] + "\n");
    helpText(1);
}
