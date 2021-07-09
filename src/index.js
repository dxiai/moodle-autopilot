// The core file for the moodle autopilot

import {IntentionScript} from "../lib/intention.mjs";
// const intention = require("./lib/intention.js");

// const MyToken = "9036f5b3e1c220a41e1690d3c8909c93";
// const filename = "./test-examples/assign_autograding.yaml";

async function main(argv) {
    const filename = argv.shift();
    const moodle_token = process.env.MOODLE_TOKEN;

    const script = new IntentionScript(filename);

    await script.load();
    await script.parseAllIntentions();
    await script.prepareConnection(moodle_token);
    await script.runIntentions();
}

main(process.argv.slice(2)).then(() => {});
