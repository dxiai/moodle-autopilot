// This file loads and processes an intention from a YAML specification.

import * as yaml from "js-yaml";
import * as fs from "fs/promises";
import { Moodle }  from "./moodle.mjs";
import {IntentionError} from "./errors.mjs";
// import * as Intentions from "./intentions";

const Intentions = {};

export class IntentionScript {
    constructor(filename) {
        this.filename = filename;
    }

    async load() {
        try {
            const data = await fs.readFile(this.filename);

            this.script = yaml.default.load(data);
            // console.log(this.script);
        }
        catch (e) {
            console.error(e);
        }
    }

    async prepareConnection(token) {
        const system = this.script.environment;

        if (!system) {
            throw new IntentionError({
                message: "missing system declaration"
            });
        }
    
        this.api = new Moodle(system.url);
        await this.api.connect(token);
    }

    async parseAllIntentions() {
        const workflow = this.script.workflow;

        if (!workflow) {
            throw new IntentionError({
                message: "missing intentions"
            });
        }

        this.workflow = await Promise.all(workflow.map(
            async (intent, id) => {
                const type = intent.use;
                if (!type) {
                    throw new IntentionError({
                        message: "missing intentions",
                        intention: `intention id: ${id}`
                    }); 
                }

                // load intention class
                const typeClass = type.replaceAll(/::/g, "_").concat("Intent");
                const intention_class = await import(`./intentions/${typeClass}.mjs`);
                
                Intentions[typeClass] = intention_class[typeClass];

                if (!Intentions[typeClass]) {
                    throw new IntentionError({
                        message: `Intention ${ typeClass } not found!`,
                        intention: `intention id: ${id}`
                    }); 
                }

                return new Intentions[typeClass](intent);
            }   
        ));
    }

    async runIntentions() {
        const context = {};
        let id = 0;

        console.log("Run intentions");
        for (const intent of this.workflow) {
            intent.setApi(this.api);

            await intent.step(context, id++);
            // console.log(context);
        }
        console.log("All intentions completed successfully.")
    }
}