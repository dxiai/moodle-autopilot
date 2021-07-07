import {IntentionError} from "../errors.mjs";
import { IntentBase } from "./IntentBase.mjs";

export class Assignment_FeedbackIntent extends IntentBase {
    constructor(data) {
        super(data);
        this.param = data.with;

        if (!(this.param && this.param.name)) {
            throw new IntentionError({
                message: "missing assignment name",
                intention: `${this.type}: ${this.name} (${this.id})`
            });
        }

        this.activityname = this.param.name;
    }
}