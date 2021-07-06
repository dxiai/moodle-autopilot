// This file contains the abstraction for the moodle API
const {MoodleError} = require("./errors");

const agent = require("superagent");

const Moodle = {
    url: null,
    token: null,
    username: null,
    userid: null,
    api: {}
};

async function call(fun, param = {}) {
    console.log(fun);
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


    if (result.body.hasOwnProperty("exception")) {
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

    // FIXME: handle upload and post data correctly
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

        if (!api[mod][action_mini][verb]) {
            api[mod][action_mini][verb] = (param = {}) => call(name, param);
        }

        api[mod][action][verb] = (param = {}) => call(name, param);
    });

    api.request = call;

    return api;
}

// bootstrap the connection to moodle
async function initMoodle(url, token) {
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

function getAPI() {
    return Moodle.api;
}

module.exports = {
    initMoodle,
    call,
    getAPI
};