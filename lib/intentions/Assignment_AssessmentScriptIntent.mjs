import {IntentionError} from "../errors.mjs";
import { Assignment } from "./Assignment.mjs";

export class Assignment_AssessmentScriptIntent extends Assignment {
    getRequiredParams() {
        return super.getRequiredParams().concat([
            "script",
        ]);
    }

    constructor(data) {
        super(data);

        this.script = this.param.script;
    }

    async assessSubmission() {
        const self = this;
        const op = new Function("submission", "context", this.script);

        const helpers = {
            expose:(n, v) => self.expose(n,v),
            score: (n) => self.score(n),
            feedback: (fb) => self.feedback(fb),
            getText: () => self.getText(),
            getRawText: () => self.getRawText(),
            getData: () => self.activeSubmission,
        };

        op.call(ops, helpers, this.context);
    }
}
