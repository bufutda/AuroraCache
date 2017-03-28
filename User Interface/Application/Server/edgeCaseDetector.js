/*
 * Detect whether or not a request invokes an edge case,
 * and corrects the value of the parameter to conform to
 * auroras behaviour
 * Module: Edge Case Detector
 */
"use strict";

// handlers keyed by auroras modules, because the modules all handle
// errors differently
module.exports = {
    ace: function (ID, oldQuery, ep, callback) {
        if (typeof oldQuery.data === "undefined") {
            oldQuery.data = "";
        }
        if (ep.parameters[0].indexOf(oldQuery.data) === -1) {
            // data invalid
            callback({message: "Request type not found: " + oldQuery.data, code: 400});
            return;
        }
        callback(null, oldQuery);
        return;
    },
    archive: function (ID, oldQuery, ep, callback) {
        if (typeof oldQuery.action === "undefined") {
            oldQuery.action = "";
        }
        if (ep.parameters[0].indexOf(oldQuery.action) === -1) {
            // action invalid
            callback({message: "Archive action " + oldQuery.action + " not found", code: 404});
            return;
        }
        callback(null, oldQuery);
        return;
    },
    images: function (ID, oldQuery, ep, callback) {
        // could call action=list and check against images,
        // instead just forward the call
        callback(null, oldQuery);
        return;
    },
    weather: function (ID, oldQuery, ep, callback) {
        if (oldQuery.hasOwnProperty("forecast")) {
            if (oldQuery.forecast.length && oldQuery.forecast !== "0") {
                console.log(`[ECD] [${ID}] changing forecast from \"${oldQuery.forecast}\" to \"true\"`);
                oldQuery.forecast = "true";
            } else {
                console.log(`[ECD] [${ID}] changing forecast from \"${oldQuery.forecast}\" to \"false\"`);
                oldQuery.forecast = "false";
            }
            callback(null, oldQuery);
            return;
        }
        console.log(`[ECD] [${ID}] changing forecast from undefined to false`);
        oldQuery.forecast = false;
        callback(null, oldQuery);
        return;
    },
    all: function (ID, oldQuery, ep, callback) {
        for (var i = 0; i < ep.parameters.length; i++) {
            console.log(`[ECD] [${ID}] checking ${ep.parameters[i].name}`);
            if (!ep.parameters[i].required) {
                var old = oldQuery[ep.parameters[i].name];
                console.log(`[ECD] [${ID}] [${ep.parameters[i].name}] using ${ep.parameters[i].default} handler`);
                if (ep.parameters[i].default) {
                    // true handler
                    //    "" - true
                    //    "&param" - false
                    //    "&param=" - false
                    //    "&param=0" - false
                    //    "&param=1" - false
                    //    "&param=true" - true
                    //    "&param=false" - false
                    //    "&param=dlfkgj" - false
                    if (!oldQuery.hasOwnProperty(ep.parameters[i].name)) {
                        oldQuery[ep.parameters[i].name] = "true";
                    } else if (oldQuery[ep.parameters[i].name] === "true") {
                        oldQuery[ep.parameters[i].name] = "true";
                    } else {
                        oldQuery[ep.parameters[i].name] = "false";
                    }
                } else {
                    // false handler
                    //  - false
                    // &images - false
                    // &images= - false
                    // &images=0 - false
                    // &images=1 - false
                    // &images=true - true
                    // &images=false - false
                    // &images=sldkjf - false
                    if (oldQuery[ep.parameters[i].name] === "true") {
                        oldQuery[ep.parameters[i].name] = "true";
                    } else {
                        oldQuery[ep.parameters[i].name] = "false";
                    }
                }
                console.log(`[ECD] [${ID}] [${ep.parameters[i].name}] was ${old}, is now ${oldQuery[ep.parameters[i].name]}`);
            }
        }
        callback(null, oldQuery);
    }
};
