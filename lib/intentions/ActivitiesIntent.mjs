import {IntentionError} from "../errors.mjs";
import { IntentBase } from "./IntentBase.mjs";

export class ActivitiesIntent extends IntentBase {

    async run() {
        const courseid = this.context.course.id;

        console.log("> run activities");

        activities = await this.api.core_course.get.contents({courseid});

        console.log(activities);
    }
}
