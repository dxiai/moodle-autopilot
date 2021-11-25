// The core file for the moodle autopilot
import { MoodleError } from "../lib/moodle.mjs";
import { IntentionError } from "../lib/errors.mjs";
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

main(process.argv.slice(2))
    .catch((err) => {
        console.log("Script failure information:\n\n");

        if (err instanceof MoodleError) {
            console.log(err.message);
            console.log(err.api);
            console.log(err.url);
            if (err.data) {
                console.log(err.data);
            }
            console.log(err.code);
            console.log(err.info);
        }
        else if (err instanceof IntentionError && err.intention) {
            console.log(err.message);
            console.log(err.intention);
        }
        else {
            console.log("\n\n");
            console.log(err);
        }
    });
