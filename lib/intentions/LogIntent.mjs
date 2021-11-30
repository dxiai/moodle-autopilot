import {IntentionError} from "../errors.mjs";
import { IntentBase } from "./IntentBase.mjs";

export class LogIntent extends IntentBase {
    async run() {
        const list = this.context;
        console.log(list)
    }
}
