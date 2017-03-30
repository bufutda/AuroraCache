/*
 * Grab data directly from auroras.live
 * Module: Full Aurora Data
 */

"use strict";
var requestL = require("request");

module.exports.request = function (ID, req, callback) {
    console.log(`[FAD] [${ID}] Requesting live data`);
    var url = CONFIG.baseAPI + req.queryString();
    requestL({
        url: url,
        encoding: null
    }, function (err, response, body) {
        if (err) {
            console.error(`[FAD] [${ID}] Request error`);
            console.error(err);
            callback({message: "Internal Requester Error", status: 500, module: req.module});
            return;
        }
        db.setCache(ID, req, body, response.headers["content-type"]);
        switch (response.headers["content-type"]) {
            case "application/json":
                callback(null, response.headers["content-type"], body, response.statusCode); // eslint-disable-line callback-return
                return;
            case "image/jpeg":
                callback(null, response.headers["content-type"], body, response.statusCode); // eslint-disable-line callback-return
                return;
            default:
                console.error(`[FAD] [${ID}] Bad response MIME: ${response.headers["content-type"]}`);
                callback({message: "Bad Aurora Response", status: 422, module: req.module}); // eslint-disable-line callback-return
                return;
        }
    });
};
