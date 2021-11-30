import {IntentionError} from "../errors.mjs";
import { IntentBase } from "./IntentBase.mjs";

export class LogIntent extends IntentBase {
    async run() {
        console.log(JSON.stringify(this.context, null, 4));
    }
}
