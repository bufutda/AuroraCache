"use strict";
var cp = require("child_process").fork;
var fs = require("fs");
var Event = require("events").EventEmitter;
var server = cp(`${__dirname}/../User Interface/startup.js`, ["--port=9090"], {
    stdio: ["pipe", "pipe", "pipe", "ipc"]
});
var request = require("request");
var log = process.argv[2] === "--pipe";
var passed = 0;
var failed = 0;
server.on("message", function list (m) {
    if (m === "OK") {
        startup();
        server.removeListener("message", list);
    }
});
server.stdout.on("data", function (d) {
    if (log) {
        var m = d.toString().split("\n");
        for (var i = 0; i < m.length; i++) {
            if (m[i].length) {
                process.stdout.write("[CACHE] ");
                process.stdout.write(m[i] + "\n");
            }
        }
    }
});
server.stderr.on("data", function (d) {
    if (log) {
        var m = d.toString().split("\n");
        for (var i = 0; i < m.length; i++) {
            process.stderr.write("[CACHE] ");
            process.stderr.write(m[i] + "\n");
        }
    }
});
server.on("close", function (c) {
    console.log("child exited with code " + c);
    process.exit(c);
});
console.log("reading test suite...");
var suite = fs.readFileSync(`${__dirname}/suite.test`).toString().split("\n");
var ev = new Event();
function startup () {
    console.log("starting up...");
    for (var i = 0; i < suite.length; i++) {
        if (!suite[i].length || suite[i].substr(0, 1) === "#") {
            suite.splice(i--, 1);
        }
    }
    ev.on("next", function (i) {
        if (i === suite.length) {
            console.log("all done");
            if (failed) {
                console.log(`\x1b[31m${failed}/${suite.length} failed tests`);
            }
            if (passed) {
                console.log(`\x1b[32m${passed}/${suite.length} passed tests`);
            }
            server.kill();
            process.exit(failed !== 0);
        }
        console.log("\nExecuting test on URL: " + suite[i]);
        request({
            url: "https://api.auroras.live/v1/" + suite[i],
            encoding: "binary"
        }, function (err, response, body) {
            if (err) {
                console.log(err);
                fail(i);
                return;
            }
            console.log("source request came back " + response.statusCode);
            var SOURCE = {
                code: response.statusCode,
                body: body,
                mime: response.headers["content-type"]
            };
            request({
                url: "http://localhost:9090/" + suite[i],
                encoding: "binary"
            }, function (err, response, body) {
                if (err) {
                    console.log(err);
                    fail(i);
                    return;
                }
                console.log("cache request came back " + response.statusCode);
                if (SOURCE.code !== response.statusCode) {
                    console.log(`${SOURCE.code} !== ${response.statusCode}`);
                    fail(i);
                    return;
                }
                console.log("responseCode is good");
                if (SOURCE.mime !== response.headers["content-type"]) {
                    console.log(`${SOURCE.mime} !== ${response.headers["content-type"]}`);
                    fail(i);
                    return;
                }
                console.log("mime is good");
                if (SOURCE.mime !== "application/json") {
                    console.log("cannot verify image, but mime is right");
                    pass(i);
                    return;
                }
                console.log("verifying json response");
                var s;
                try {
                    s = JSON.parse(SOURCE.body.toString("utf-8"));
                    console.log("source is json");
                } catch (e) {
                    console.error(e);
                    fail(i);
                    return;
                }
                var c;
                try {
                    c = JSON.parse(body.toString("utf-8"));
                    console.log("cache is json");
                } catch (e) {
                    console.error(e);
                    fail(i);
                    return;
                }
                if (SOURCE.code !== 200) {
                    console.log("response is an error, deep-verifying JSON");
                    for (var p in s) {
                        if (!c.hasOwnProperty(p)) {
                            console.log(`Missing property in cache (${p})`);
                            fail(i);
                            return;
                        }
                        if (s[p] !== c[p]) {
                            console.log(`Differing values in cache (${p})`);
                            console.log(`api[${p}]`, s[p]);
                            console.log(`cache[${p}]`, c[p]);
                            fail(i);
                            return;
                        }
                    }
                    pass(i);
                    return;
                }
                var r = verifyjson(s, c);
                if (r === false) {
                    fail(i);
                    return;
                }
                pass(i);
            });
        });
    });
    ev.emit("next", 0);
}
function pass (i) {
    console.log(`\x1b[32m✔ \x1b[0m${suite[i]}\x1b[32m OK (${failed + ++passed}/${suite.length})\x1b[0m\n`);
    ev.emit("next", ++i);
}
function fail (i) {
    console.log(`\x1b[31mx \x1b[0m${suite[i]}\x1b[31m ERROR (${++failed + passed}/${suite.length})\x1b[0m\n`);
    ev.emit("next", ++i);
}
function verifyjson (s, c) {
    for (var p in s) {
        if (!c.hasOwnProperty(p)) {
            console.log(`missing prop in cache (${p})`);
            return false;
        }
        if (s[p] instanceof Array) {
            if (!(c[p] instanceof Array)) {
                console.log(`api[${p}] api is Array, cache is not`);
                return false;
            }
        } else if (typeof s[p] === "object") {
            if (typeof c[p] !== "object") {
                console.log(`api[${p}] is Object, cache is not`);
                return false;
            }
            return verifyjson(s[p], c[p]);
        } else if (typeof s[p] !== typeof c[p]) {
            console.log(`api[${p}] is type ${typeof s[p]}, cache is type ${typeof c[p]}`);
            return false;
        }
    }
    if (s instanceof Array && !(c instanceof Array)) {
        console.log("api is Array, cache is not");
        return false;
    }
    if (c instanceof Array && !(s instanceof Array)) {
        console.log("cache is Array, api is not");
        return false;
    }
    return true;
}
