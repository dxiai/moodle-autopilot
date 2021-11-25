import {IntentionError} from "../errors.mjs";
import { IntentBase } from "./IntentBase.mjs";

export class Grouping_FromExcelIntent extends IntentBase {

    async run() {
        const courseid = this.context.course.id;
    }
}
