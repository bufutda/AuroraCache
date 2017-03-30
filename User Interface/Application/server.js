/*
 * Start the web server and forward requests to the Request module
 * Module: Data Flow Control Logic
 */

 "use strict";
 var http = require("http");
 var https = require("https");
 var fs = require("fs");
 var requestHandler = require(__dirname + "/Server/requestHandler");
 global.db = require(__dirname + "/Database/dbInterface.js");
 module.exports.invoke = function () {
     console.log("[DFCL] Starting Data Flow Control Logic");
     var server;
     console.log("[DFCL] Creating Server");
     if (CONFIG.https) {
         server = https.createServer({cert: fs.readFileSync(CONFIG.certPath).toString(), key: fs.readFileSync(CONFIG.keyPath).toString()}, requestHandler);
     } else {
         server = http.createServer(requestHandler);
     }
     console.log("[DFCL] Listening on " + CONFIG.port);
     server.listen(CONFIG.port);
     db.init(function () {
         if (process.send) {
             process.send("OK");
         }
     });
 };
