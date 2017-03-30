/*
 * Handle requests incoming
 * Module: Request
 */

"use strict";
var requestBuilder = require(__dirname + "/requestBuilder");
var dataRequester = require(__dirname + "/Aurora Data/requester");
var customEndpoints = require(__dirname + "/customEndpoints");
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
            response.statusCode = err.statusCode;
            delete connections[ID];
            response.end(JSON.stringify(err));
            return;
        }
        console.log(`[R] [${ID}] Built request is ${requestObj.queryString()}`);

        // not part of aurora
        if (requestObj.local) {
            console.log(`[R] [${ID}] Invoking custom endpoint builder`);
            customEndpoints[requestObj.module].invoke(ID, requestObj, request, response);
            return;
        }

        db.getCache(ID, requestObj, function (err, cacheEntry) {
            if (err) {
                console.error(`[DB] [${ID}] Error getting cache entry`);
                console.error(err);
                response.statusCode = 500;
                response.end(JSON.stringify({message: "Internal server error", module: requestObj.module, statusCode: 500}));
                return;
            }
            if (cacheEntry && cacheEntry.body && cacheEntry.mime) {
                console.log(`[R] [${ID}] cache hit`);
                var statusCode;
                if (cacheEntry.mime === "application/json") {
                    statusCode = JSON.parse(cacheEntry.body).statusCode ? JSON.parse(cacheEntry.body).statusCode : 200;
                } else {
                    statusCode = 200;
                }
                finishRequest(ID, response, cacheEntry.mime, statusCode, cacheEntry.body);
            } else {
                console.log(`[R] [${ID}] cache miss`);
                dataRequester.request(ID, requestObj, function callback (err, mime, aurora, status) {
                    if (err) {
                        console.error(`[DR] [${ID}] Error: ${err.message}`);
                        console.log(`[R] [${ID}] Ending request`);
                        delete connections[ID];
                        response.statusCode = err.status;
                        try {
                            aurora = JSON.parse(aurora.toString("utf-8"));
                            response.statusCode = aurora.status ? aurora.status : err.status;
                            response.end(JSON.stringify(aurora));
                        } catch (e) {
                            response.end(JSON.stringify({message: err.message, module: err.module, statusCode: err.status}));
                        }
                        return;
                    }
                    finishRequest(ID, response, mime, status, aurora);
                    return;
                });
            }
        });
    });
};

function endRequest (ID, code, response) {
    console.log(`[R] [${ID}] Terminating connection with ${code}`);
    response.statusCode = code;
    delete connections[ID];
    response.end();
}

function finishRequest (ID, response, mime, status, aurora) {
    response.setHeader("Content-Type", mime);
    response.setHeader("transfer-encoding", "chunked");
    response.statusCode = status;
    if (mime === "application/json") {
        aurora = JSON.parse(aurora.toString("utf-8"));
        aurora.note = "Powered by Auroras.live";
        aurora = JSON.stringify(aurora);
        response.end(aurora);
    } else {
        response.end(aurora, "binary");
    }
    console.log(`[R] [${ID}] Ending request`);
    delete connections[ID];
}
