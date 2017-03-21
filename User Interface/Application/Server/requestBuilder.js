/*
 * Generate request objects from defaults and request data
 * Module: Request Builder
 */

"use strict";

module.exports = function (ID, method, url, callback) {
    console.log(`[RB] [${ID}] Building request`);
    var path = url.substring(url.indexOf("?") + 1);
    path = path.split("&");
    var req = {};
    for (var i = 0; i < path.length; i++) {
        var qp = path[i].split("=");
        req[decodeURIComponent(qp[0])] = decodeURIComponent(qp[1]);
    }
    var RequestQuery = new RequestBuilder(ID, method, req);
    if (RequestQuery.error) {
        callback(RequestQuery.error);
        return;
    }
    callback(null, RequestQuery);
    return;
};

function RequestBuilder (ID, method, query) {
    var self = this;

    // check module
    console.log(`[RB] [${ID}] Checking module`);
    self.module = "main";
    self.method = method;
    var ep;
    for (var prop in ENDPOINTS) {
        if (query.type === prop) {
            self.module = prop;
            ep = ENDPOINTS[prop];
        }
    }
    if (self.module === "main" || typeof ep === "undefined") {
        error("Parameter is missing from request: type", 404);
        return;
    }
    console.log(`[RB] [${ID}] Module OK (${self.module})`);

    if (ep.hasOwnProperty("local")) {
        console.log(`[RB] [${ID}] Module is local`);
        self.local = true;
    } else {
        self.local = false;
        console.log(`[RB] [${ID}] Module is remote`);
    }

    // check method
    console.log(`[RB] [${ID}] Checking method`);
    if (ep.method !== method) {
        error("Invalid method: " + method, 405);
    }
    console.log(`[RB] [${ID}] Method OK (${method})`);

    // check parameters
    console.log(`[RB] [${ID}] Checking parameters`);
    self.params = {type: self.module};
    for (var i = 0; i < ep.parameters.length; i++) {
        console.log(`[RB] [${ID}] [${ep.parameters[i].name}] checking requirement`);
        // requirement validation
        var required = false;
        if (typeof ep.parameters[i].required === "boolean" && ep.parameters[i].required) {
            required = true;
        } else if (typeof ep.parameters[i].required === "string") {
            if (query[ep.parameters[i].required.split("==")[0]] === ep.parameters[i].required.split("==")[1]) {
                if (!query.hasOwnProperty(ep.parameters[i].name)) {
                    required = true;
                }
            }
        }
        if (required) {
            console.log(`[RB] [${ID}] [${ep.parameters[i].name}] is required`);
            if (!query.hasOwnProperty(ep.parameters[i].name)) {
                error("Parameter is missing from request: " + ep.parameters[i].name, 404);
                return;
            }
            console.log(`[RB] [${ID}] [${ep.parameters[i].name}] is provided (${query[ep.parameters[i].name]})`);
        } else if (!query.hasOwnProperty(ep.parameters[i].name)) {
            // use default
            console.log(`[RB] [${ID}] [${ep.parameters[i].name}] is not required -> default`);
            continue; // eslint-disable-line no-continue
            // self.params[ep.parameters[i].name] = ep.parameters[i].default;
        } else {
            console.log(`[RB] [${ID}] [${ep.parameters[i].name}] is not required`);
        }

        // type validation
        console.log(`[RB] [${ID}] [${ep.parameters[i].name}] checking type`);
        switch (ep.parameters[i].type) {
            case "string":
                /* falls through */
            case "date":
                break;
            case "bool":
                if (query[ep.parameters[i].name] === "true") {
                    query[ep.parameters[i].name] = true;
                } else if (query[ep.parameters[i].name] === "false") {
                    query[ep.parameters[i].name] = false;
                } else {
                    error("Invalid value for parameter: " + ep.parameters[i].name, 400);
                    return;
                }
                break;
            case "float":
                if (!isNaN(parseFloat(query[ep.parameters[i].name], 10))) {
                    query[ep.parameters[i].name] = parseFloat(query[ep.parameters[i].name], 10);
                } else {
                    error("Invalid value for parameter: " + ep.parameters[i].name, 400);
                    return;
                }
                break;
            default:
                throw new Error("Unknown parameter type: " + ep.parameters[i].type);
        }
        console.log(`[RB] [${ID}] [${ep.parameters[i].name}] type is OK`);

        // range validation
        console.log(`[RB] [${ID}] [${ep.parameters[i].name}] checking range`);
        if (ep.parameters[i].range) {
            if (ep.parameters[i].range instanceof Array) {
                console.log(`[RB] [${ID}] [${ep.parameters[i].name}] range check is choice`);
                if (ep.parameters[i].range.indexOf(query[ep.parameters[i].name]) === -1) {
                    error("Invalid value for parameter: " + ep.parameters[i].name, 400);
                    return;
                }
            } else if (ep.parameters[i].range.hasOwnProperty("min") && ep.parameters[i].range.hasOwnProperty("max")) {
                console.log(`[RB] [${ID}] [${ep.parameters[i].name}] range check is min/max`);
                if (query[ep.parameters[i].name] < ep.parameters[i].range.min) {
                    console.log(`[RB] [${ID}] [${ep.parameters[i].name}] min failed: (${query[ep.parameters[i].name]} < ${ep.parameters[i].range.min})`);
                    error("Invalid value for parameter: " + ep.parameters[i].name, 400);
                    return;
                }
                if (query[ep.parameters[i].name] > ep.parameters[i].range.max) {
                    console.log(`[RB] [${ID}] [${ep.parameters[i].name}] max failed: (${query[ep.parameters[i].name]} > ${ep.parameters[i].range.max})`);
                    error("Invalid value for parameter: " + ep.parameters[i].name, 400);
                    return;
                }
            } else {
                throw new Error("Bad range JSON for " + ep.parameters[i].name);
            }
        }
        console.log(`[RB] [${ID}] [${ep.parameters[i].name}] range is OK`);

        // all ok
        self.params[ep.parameters[i].name] = query[ep.parameters[i].name];
        console.log(`[RB] [${ID}]`, self.params);
    }

    function error (message, status) {
        self.error = {
            message: message,
            module: self.module,
            status: status
        };
    }

    self.reqObj = function () {
        return self.params;
    };

    self.queryString = function () {
        var str = "";
        for (var prop in self.params) {
            str += "&" + encodeURIComponent(prop) + "=" + encodeURIComponent(self.params[prop]);
        }
        str = "?" + str.substring(1);
        return str;
    };
}
