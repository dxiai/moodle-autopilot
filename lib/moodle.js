// This file contains the abstraction for the moodle API

const agent = require("superagent");

class Moodle {
    token = ""

    init(options) {}
    async call(functionName, params) {}
    async callFrankenstyle(module, subject, verb, params) {}
}
