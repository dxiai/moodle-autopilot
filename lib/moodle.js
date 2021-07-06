// This file contains the abstraction for the moodle API

const agent = require("superagent");

const Moodle = {
    url: "",
    user: "",
    token: "",
    userid: "",
};

function call(fun, param = {}) {
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

    return agent
        .get(service_url)
        .query(base_query)
        .query(paramstr);
}

function frankencall(module, subject, verb, param) {
    const fun = [module, verb, subject].join("_");
    return call(fun, param);
}

function bootstrap() {
    // core_user_get_users_by_field
}

// bootstrap the connection to moodle
async function initMoodle(url, user, token) {
    Moodle.url = url;
    Moodle.user = user;
    Moodle.token = token;

    const param = {
        "values[0]": Moodle.user,
        "field": "email"
    };

    const result = await frankencall("core_user", "users_by_field", "get", param);

    // console.log(result.req.path);
    if (!Array.isArray(result.body)) {
        throw new Error("Invalid Request");
    }

    if (!(result.body.length & result.body[0].id > 0)) {
        throw new Error("No such user");
    }

    Moodle.userid = result.body[0].id;
    console.log(Moodle);
}

module.exports = {
    initMoodle
};