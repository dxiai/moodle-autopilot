import { IntentionError } from "../errors.mjs";
import { Assignment } from "./Assignment.mjs";

/**
 * Proxy class for safely exposing relevant information to the
 * assessment script in the runtime environment.
 */
class Submission {
    #self = null;

    constructor(self) {
        this.#self = self;
    }

    get text() {
        return this.#self.getText();
    }

    get raw_text() {
        return this.#self.getRawText();
    }

    set score(score) {
        this.#self.setScore(score);
    }

    set feedback(fb) {
        this.#self.setFeedback(fb);
    }

    expose(n, v) {
        this.#self.expose(n, v);
    }

    get data() {
        return this.#self.activeSubmission.plugins;
    }
}

/**
 * Intent Class for handling R-Assessments
 *
 */
export class Assignment_RAssessmentIntent extends Assignment {

    /**
     * Provide the list of required (non-optional) parameters for the intention.
     *
     * @returns Array of required with-parameters
     */
    getRequiredParams() {
        return super.getRequiredParams().concat([
            "rubric",
        ]);
    }

    /**
     * assessSubmission()
     *
     * Implements the assessment of a single submission by running the provided script.
     */
    async assessSubmission() {
    }
}
