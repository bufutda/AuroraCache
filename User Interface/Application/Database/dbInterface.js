/*
 * Interface to interact with the database
 * Module: Database
 */
"use strict";
var redis = require("redis");
var crypto = require("crypto");
var child_process = require("child_process").spawn;

var dbServer;
var dbClient;
var ready = false;

module.exports.init = function (callback) {
    console.log("[DB] Starting database server");
    dbServer = child_process("redis-server", [__dirname + "/redis.conf"], {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: __dirname
    });
    dbServer.on("error", function (e) {
        console.error("[DB] Error when starting DB server");
        console.error(e);
    });
    dbServer.stdout.on("data", function list (data) {
        if (!ready && (/The server is now ready to accept connections/gmi).test(data.toString())) {
            console.log("[DB] Database server is ready");
            ready = true;
            dbClient = redis.createClient({
                port: CONFIG.redisPort
            });
            dbClient.on("error", function (e) {
                console.error("[DB] an error occurred");
                console.error(e);
            });
            dbClient.on("ready", function () {
                console.log("[DB] Database client connected");
                callback();
            });
            dbClient.auth(CONFIG.secure["db-auth-token"], function (e) {
                if (e) {
                    console.error("[DB] error authenticating to server");
                    console.error(e);
                }
            });
        }
    });
    dbServer.stderr.on("data", function list (data) {
        console.error("[DB] Redis error");
        process.stderr.write(data.toString());
        process.exit(1);
    });
};

function createCacheKey (path) {
    console.log(`[DB] creating key for ${path}`);
    var sum = crypto.createHash("md5");
    sum.update(path);
    var key = sum.digest("hex");
    console.log(`[DB] key: ${key}`);
    return key;
}

module.exports.getCache = function (ID, requestObj, callback) {
    if (requestObj.nocache) {
        console.log(`[DB] [${ID}] Skipping cache check (no-cache)`);
        module.exports.cache.miss();
        callback(null, {body: null, mime: null});
        return;
    }
    console.log(`[DB] [${ID}] Searching cache`);
    var key = createCacheKey(requestObj.queryString());
    dbClient.hget(key, "body", function (err, body) {
        if (err) {
            callback(err);
            return;
        }
        if (body) {
            module.exports.cache.hit();
            dbClient.hget(key, "mime", function (err, mime) {
                if (err) {
                    callback(err);
                    return;
                }
                callback(null, {body: Buffer.from(body, "base64"), mime: mime});
            });
        } else {
            module.exports.cache.miss();
            callback(null, {body: null, mime: null});
            return;
        }
    });
};

module.exports.setCache = function (ID, requestObj, body, mime) {
    console.log(`[DB] [${ID}] New cache entry`);
    var key = createCacheKey(requestObj.queryString());
    var data = body.toString("base64");
    dbClient.hset(key, "body", data, function (err) {
        if (err) {
            console.error(`[DB] [${ID}] Error inserting data into cache`);
            console.error(err);
            return;
        }
    });
    dbClient.hset(key, "mime", mime, function (err) {
        if (err) {
            console.error(`[DB] [${ID}] Error inserting mime into cache`);
            console.error(err);
            return;
        }
    });
    dbClient.pexpire(key, module.exports.getTTL(ID, requestObj), function (err) {
        if (err) {
            console.error(`[DB] [${ID}] Error setting TTL`);
            console.error(err);
            return;
        }
    });
};

module.exports.cache = {
    hit: function () {
        dbClient.incr("cachehit", function (err) {
            if (err) {
                console.error("[DB] Error incrementing cachehit");
                console.error(err);
            }
        });
    },
    miss: function () {
        dbClient.incr("cachemiss", function (err) {
            if (err) {
                console.error("[DB] Error incromenting cachemiss");
                console.error(err);
            }
        });
    }
};

module.exports.getTTL = function (ID, requestObj) {
    var TTL = CONFIG.default_cache_time_ms;
    var matches = 0;
    for (var i = 0; i < CONFIG.cache_table.length; i++) {
        var thisMatches = 0;
        var valid = true;
        for (var prop in CONFIG.cache_table[i].prefix) {
            if (requestObj.params.hasOwnProperty(prop) && requestObj.params[prop] === CONFIG.cache_table[i].prefix[prop]) {
                console.log(`[DB] [${ID}] [${i}] match found: ${prop}`);
                thisMatches++;
            } else {
                valid = false;
            }
        }
        if (!valid) {
            console.log(`[DB] [${ID}] [${i}] rejecting entry due to incomplete match`);
        } else if (thisMatches > matches) {
            matches = thisMatches;
            TTL = CONFIG.cache_table[i].ttl_ms;
            console.log(`[DB] [${ID}] [${i}] new match winner -> TTL: ${TTL} with ${matches} matches`);
        } else {
            console.log(`[DB] [${ID}] [${i}] rejecting entry due to worse match score`);
        }
    }
    console.log(`[DB] [${ID}] TTL calculated to ${TTL}ms with ${matches} matches`);
    return TTL;
};
