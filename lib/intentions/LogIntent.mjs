import {IntentionError} from "../errors.mjs";
import { IntentBase } from "./IntentBase.mjs";

/**
 * LogIntent adds logging functions to a workflow. 
 * 
 * The intent simply dumps the context of the intent, which is helpful for 
 * debugging the output of another intent. 
 * 
 * This intent is mostly used for developing intents that depend on the output
 * of previous intents in the workflow.
 */
export class LogIntent extends IntentBase {
    async run() {
        console.log(JSON.stringify(this.context, null, 4));
    }
}
