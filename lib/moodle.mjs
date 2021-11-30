// This file contains the abstraction for the moodle API
import * as fs from "fs/promises";

import * as superagent from "superagent";

const agent = superagent.default;

/**
 * MoodleError gives some introspection into request errors from the moodle API
 */
export class MoodleError extends Error {
    constructor(mobject, ...params) {
        super(mobject.message, ...params);
        this.api = mobject.api;
        this.code = mobject.code;
        this.info = mobject.info;
        this.url = mobject.url;
        if (mobject.data) {
            this.data = mobject.data;
        }
    }
}

/**
 * Moodle API verbs are somewhat obscure and these verbs point always to POST requests. 
 * Everything else appears to be a GET request. 
 * PUT or DELETE verbs are never used. 
 */
const postVerbs = [
    "save",
    "record",
    "create",
    "update"
];

/**
 * This function allows us to call the moodle api like this: 
 *     moodle.core_course.get.contents({courseid})
 */
function bootstrap(api, api_functions) {
    api_functions.forEach((f) => {
        const name = f.name;
        const match = name.split("_");
        const mod = match.slice(0,2).join("_");
        const verb = match[2];
        const action = match.slice(3).join("_");
        const action_mini = match.slice(3,5).join("_");

        if (!api[mod]) {
            api[mod] = {};
        }
        if (!api[mod][verb]) {
            api[mod][verb] = {};
        }

        let api_handler = (param = {}) => api.getAPI(name, param);

        if (postVerbs.includes(verb)) {
            api_handler = (param = {}) => api.postAPI(name, param);
        }

        // moodle has some extremely long function names
        // that make no sense. This creates shortcuts to these functions
        // by abbreviating them to the first two parts.
        if (action !== action_mini && !api[mod][verb][action_mini]) {
            api[mod][verb][action_mini] = api_handler;
        }

        api[mod][verb][action] = api_handler;
    });
}

/**
 * Helper querystring function as Moodle bends the normal parameter string handling 
 * by including square brackets. Normally such characters would be URL encoded, but then
 * Moodle will no longer work. Therefore, we cannot use superagents internal API but have 
 * to encode the querystring manually.
 * 
 * @param params 
 * @returns {String} encoded query string
 */
function handleMoodleParameters(params) {
    return Object
        .keys(params)
        .map((k) => `${k}=${encodeURIComponent(params[k])}`)
        .join("&");
}

/**
 * Moodle Connection Class
 *
 * Manages the connection to a moodle instance
 */
export class Moodle {
    #user = {};
    #base_parameter= {}

    constructor(url) {
        this.url = url;
    }

    get active_user() {
        return {
            username: this.#user.name,
            id: this.#user.id
        };
    }

    async connect(token) {
        // TODO: check URL validity
        // TODO: verify the Moodle API is actually exposed under this URL.
        // pre cache the base parameter
        this.#base_parameter = {
            wstoken: token,
            moodlewsrestformat: "json",
        };

        const result = await this.getAPI("core_webservice_get_site_info", {});

        // keep the user data
        this.#user = {
            name: result.username,
            id: result.userid,
            private_key: result.userprivateaccesskey,
        };

        bootstrap(this, result.functions);
    }

    async getAPI(api_function, param) {
        const service_url = `${ this.url }/webservice/rest/server.php`;
        // base query
        const base_query = {
            wsfunction: api_function,
        };

        // Moodle uses square brackets that are url encoded by superagent if the parameters are passed in object notation.
        const parameter_string = handleMoodleParameters(param);

        let result;

        // console.log(api_function);

        if (parameter_string.length) {
            result = await agent
                .get(service_url)
                .query(this.#base_parameter)
                .query(base_query)
                .query(parameter_string);
        }
        else {
            result = await agent
                .get(service_url)
                .query(this.#base_parameter)
                .query(base_query);
        }


        if (Object.prototype.hasOwnProperty.call(result.body, "exception")) {
            throw new MoodleError({
                message: "Bad request",
                api: api_function,
                url: result.req.path,
                code: result.body.errorcode,
                info: result.body.message,
            });
        }

        return result.body;
    }

    async postAPI(api_function, param = {}) {
        // console.log("Post Data");
        const service_url = `${ this.url }/webservice/rest/server.php`;
        // base query
        const base_query = {
            wsfunction: api_function,
        };

        const post_data = handleMoodleParameters(param);

        if (!post_data) {
            throw new MoodleError({
                message: "cannot post empty data",
                api: api_function,
                url: service_url
            });
        }

        const result = await agent
            .post(service_url)
            .type("form")
            .query(this.#base_parameter)
            .query(base_query)
            .send(post_data);

        if (result.body && Object.prototype.hasOwnProperty.call(result.body, "exception")) {
            throw new MoodleError({
                message: "Bad request",
                api: api_function,
                url: result.req.path,
                data: post_data,
                code: result.body.errorcode,
                info: result.body.message,
            });
        }

        return result.body;
    }

    async download_file(service_url, to_filename) {
        const base_query = {
            token: this.#user.private_key
        };

        const result = await agent
            .get(service_url)
            .query(base_query)
            .responseType("blob");

        // store binary response to file
        await fs.writeFile(to_filename, result.response);
    }
}
