/*
 * Expose handlers for all custom endpoints
 * Module: Custom Endpoint Builder
 */

"use strict";
var req = require("request");

module.exports = {
    map: new CustomEndpoint(function handler (ID, requestObj, request, response) {
        var reqUrl = "https://maps.googleapis.com/maps/api/staticmap?center=" + encodeURIComponent(requestObj.params.id) + "&zoom=5&size=600x300&maptype=roadmap&markers=color:blue%7Clabel:%7C" + encodeURIComponent(requestObj.params.id) + "&key=" + CONFIG.secure["google-api-token"];
        console.log(`[CEB] [${ID}] [map] Making request to ${reqUrl}`);
        req({
            url: reqUrl,
            encoding: "binary"
        }, function (err, res, body) {
            if (err || res.statusCode !== 200) {
                console.error(`[CEB] [${ID}] an error occured`);
                console.error(res.statusCode, err);
                response.end(JSON.stringify({message: "Google communication error", module: "map", status: 413}));
                return;
            }
            response.setHeader("Content-Type", "image/png");
            response.setHeader("transfer-encoding", "chunked");
            response.end(body, "binary");
            return;
        });
    })
};

function CustomEndpoint (handler) {
    var self = this;

    self.invoke = function (ID, requestObj, request, response) {
        console.log(`[CEB] [${ID}] Invoking endpoint handler...`);
        handler(ID, requestObj, request, response);
    };
}
