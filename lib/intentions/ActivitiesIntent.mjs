import {IntentionError} from "../errors.mjs";
import { IntentBase } from "./IntentBase.mjs";

export class ActivitiesIntent extends IntentBase {

    getEndpoints() {
        return super.getEndpoints().push(
            "core_course_get_contents"
        );
    }

    setApi(api) {
        super.setApi(api);
    }

    async run() {
        const self = this;
        const courseid = this.context.course.id;

        console.log("> run activities");

        const activities = await this.api.core_course.get.contents({courseid});

        // console.log(activities);
        const result = [];

        if (this.param && 
            this.param["topic"]) {
            activities = activities.filter(element => element.name === self.param.topic);
        }

        activities.forEach(element => {
            let mods = element.modules;

            if (this.param && 
                self.param["type"]) {
                mods = mods.filter(e => e.modname === self.param.type);
            }

            if (this.param && 
                self.param["name"]) {
                mods = mods.filter(e => e.name === self.param.name);
            }

            self.output = mods;
        });
    }
}
