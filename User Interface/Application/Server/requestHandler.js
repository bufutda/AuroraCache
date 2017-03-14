/*
 * Handle requests incoming
 * Module: Request
 */

"use strict";
var requestBuilder = require(__dirname + "/requestBuilder");
var dataRequester = require(__dirname + "/Aurora Data/requester");

var connections = {};
module.exports = function requestHandler (request, response) {
    console.log(`[R] Incoming request: ${request.method} ${request.url}`);
    console.log("[R] Generating ID");
    var ID;
    do {
        ID = Math.floor(Math.random() * 10000000000).toString(16) + "-" + Math.floor(Math.random() * 10000000000).toString(16);
    } while (connections.hasOwnProperty(ID));
    connections[ID] = this;
    console.log(`[R] [${ID}] ID Generation complete`);
    console.log(`[R] [${ID}] Setting response headers`);
    response.setHeader("Server", "AuroraCache/" + CONFIG.version);
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Content-Type", "application/json");
    response.statusCode = 200;

    if (request.url === "/favicon.ico") {
        endRequest(ID, 404, response);
        return;
    }

    requestBuilder(ID, request.method, request.url, function callback (err, requestObj) {
        if (err) {
            console.error(`[R] [${ID}] Bad request:`, err.message);
            console.log(`[R] [${ID}] Ending request`);
            delete connections[ID];
            response.end(JSON.stringify(err));
            return;
        }

        console.warn(`[R] [${ID}] Skipping cache check`);
        // TODO -> Use the built request to check the cache

        // no cache entry; grab data from aurora
        dataRequester.request(ID, requestObj, function callback (err, mime, aurora) {
            if (err) {
                console.error(`[DR] [${ID}] Error: ${err.message}`);
                console.log(`[R] [${ID}] Ending request`);
                delete connections[ID];
                try {
                    aurora = JSON.parse(aurora);
                    response.end(JSON.stringify(aurora));
                } catch (e) {
                    response.end(JSON.stringify({message: err.message, module: err.module, status: err.status}));
                }
                return;
            }
            response.setHeader("Content-Type", mime);
            response.setHeader("transfer-encoding", "chunked");
            if (mime === "application/json") {
                aurora.note = "Powered by Auroras.live";
                aurora = JSON.stringify(aurora);
                response.end(aurora);
            } else {
                response.end(aurora, "binary");
            }
            console.log(`[R] [${ID}] Ending request`);
            delete connections[ID];
            return;
        });
    });
};

function endRequest (ID, code, response) {
    console.log(`[R] [${ID}] Terminating connection with ${code}`);
    response.statusCode = code;
    delete connections[ID];
    response.end();
}
