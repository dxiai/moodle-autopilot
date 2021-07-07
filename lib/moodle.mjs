// This file contains the abstraction for the moodle API
import {MoodleError}  from "./errors.mjs";
import * as fs from "fs/promises";

import * as superagent from "superagent";

const agent = superagent.default;

const Moodle = {
    url: null,
    token: null,
    username: null,
    userid: null,
    api: {}
};

async function load_file(service_url, filename) {
    const base_query = {
        token: Moodle.accesstoken
    };

    const result = await agent
        .get(service_url)
        .query(base_query)
        .responseType("blob");

    // store binary response to file
    await fs.writeFile(filename, result.response);
}

async function postData(fun, param = {}) {
    // console.log("Post Data");
    const service_url = `${ Moodle.url }/webservice/rest/server.php`;
    // base query
    const base_query = {
        wstoken: Moodle.token,
        moodlewsrestformat: "json",
        wsfunction: fun,
    };

    const postdata = Object
        .keys(param)
        .map((k) => `${k}=${encodeURIComponent(param[k])}`)
        .join("&");

    if (!postdata) {
        throw new MoodleError({
            message: "cannot post empty data",
            function: fun,
            url: service_url
        });
    }

    // console.log(`${postdata.length}`);
    // console.log(`${postdata}`);

    const result = await agent
        .post(service_url)
        .type("form")
        .query(base_query)
        .send(postdata);

    if (result.body && Object.prototype.hasOwnProperty.call(result.body, "exception")) {
        throw new MoodleError({
            message: "Bad request",
            function: fun,
            url: result.req.path,
            code: result.body.errorcode,
            info: result.body.message,
        });
    }

    return result.body;
}

async function call(fun, param = {}) {
    // console.log("Get Data");
    // build URL
    const service_url = `${ Moodle.url }/webservice/rest/server.php`;
    // base query
    const base_query = {
        wstoken: Moodle.token,
        moodlewsrestformat: "json",
        wsfunction: fun,
    };

    // Moodle uses square brackets that are url encoded by superagent if the parameters are passed in object notation.
    const paramstr = Object
        .keys(param)
        .map((k) => `${k}=${encodeURIComponent(param[k])}`)
        .join("&");

    let result;

    if (paramstr.length) {
        result = await agent
            .get(service_url)
            .query(base_query)
            .query(paramstr);
    }
    else {
        result = await agent
            .get(service_url)
            .query(base_query);
    }


    if (Object.prototype.hasOwnProperty.call(result.body, "exception")) {
        throw new MoodleError({
            message: "Bad request",
            function: fun,
            url: result.req.path,
            code: result.body.errorcode,
            info: result.body.message,
        });
    }

    return result.body;
}

function bootstrap(funs) {
    const api = {};

    funs.forEach((f) => {
        const name = f.name;
        const match = name.split("_");
        const mod = match.slice(0,2).join("_");
        const verb = match[2];
        const action = match.slice(3).join("_");
        const action_mini = match.slice(3,5).join("_");

        if (!api[mod]) {
            api[mod] = {};
        }
        if (!api[mod][action]) {
            api[mod][action] = {};
        }

        if (!api[mod][action_mini]) {
            api[mod][action_mini] = {};
        }

        let tfun = (param = {}) => call(name, param);

        const postVerbs = [
            "save",
            "record",
            "create",
            "update"
        ];

        if (postVerbs.includes(verb)) {
            tfun = (param = {}) => postData(name, param);
        }

        if (!api[mod][action_mini][verb]) {
            api[mod][action_mini][verb] = tfun;
        }

        api[mod][action][verb] = tfun;
    });

    // Helper functions

    // download a file
    api.file = {};
    api.file.load = load_file;
    api.file.fetch = load_file;

    // get information about the active user
    api.active_user = {};
    api.active_user.get = () => ({
        username: Moodle.username,
        id: Moodle.userid
    });

    // function for raw API calls
    api.request = call;

    return api;
}

// bootstrap the connection to moodle
export async function initMoodle(url, token) {
    Moodle.url = url;
    Moodle.token = token;

    const result = await call("core_webservice_get_site_info", {});
    // console.log(result.req.path);

    Moodle.user = result.username;
    Moodle.userid = result.userid;
    Moodle.accesskey = result.userprivateaccesskey;

    Moodle.api = bootstrap(result.functions);
    return Moodle.api;
    // initialise the API to the unterpinning services
}

export function getAPI() {
    return Moodle.api;
}
