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

    async run() {
        // const cmid = this.context.submissions.assignment;
        const grades = this.context.grader.grades;

        const api = this.api;
        const results = await Promise.all(
            grades
                // .filter(ass => ass.gradingstatus === "notgraded")
                .map((ass) =>{
                    console.log(`   save grades for user ${ass.userid}`);
                    ass.workflowstate = "released";
                    delete ass.id;
                    delete ass.status;
                    delete ass.gradingstatus;
                    delete ass.rawtext;
                    return api.mod_assign.grade.save(ass);
                })
        );

        if (results.filter(res => res !== null).length) {
            console.warn("   some requests returned non null responses");
            results.filter(res => res !== null).map(res => console.log(res));
        }
    }
}
