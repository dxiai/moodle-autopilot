import {IntentionError} from "../errors.mjs";
import { IntentBase } from "./IntentBase.mjs";

export class GroupingIntent extends IntentBase {

    async run() {
        const courseid = this.context.course.id;

    }
}
