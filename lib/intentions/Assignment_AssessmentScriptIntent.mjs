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
 * Intent Class for handling Assessment scripts
 *
 * This intent is helpful for prototyping assessment intents.
 *
 * It is not useful for complex assessments, for which one
 * should consider a proper assessment class.
 *
 * This class accepts user provided scripts. It will encapsulate
 * these scripts to cause minimal harm. Each script will run within
 * its internal sandbox and has only access to one active submission
 * at a time.
 *
 * This class takes great care that the scripts have no access to
 * manipulating the intention workflow directly.
 */
export class Assignment_AssessmentScriptIntent extends Assignment {

    /**
     * Provide the list of required (non-optional) parameters for the intention.
     *
     * @returns Array of required with-parameters
     */
    getRequiredParams() {
        return super.getRequiredParams().concat([
            "script",
        ]);
    }

    /**
     * Generate a clean runtime sandbox of the provided script.
     *
     * This function ensures that no unintended side effects while creating the
     * script function that might occur from closures.
     *
     * Lexical/syntax parsing of the script will happen here.
     *
     * If a script is not
     *
     * @returns function script function
     */
    generateScriptFunction() {
        if (!this.script) {
            this.script = new Function("submission", this.param.script);
        }
        return this.script;
    }

    /**
     * assessSubmission()
     *
     * Implements the assessment of a single submission by running the provided script.
     */
    async assessSubmission() {
        const op = this.generateScriptFunction();

        if (!this.helpers) {
            this.helpers = new Submission(this);
        }

        try {
            // The first parameter of call() is the this object of the called function.
            // as we do not want to expose any internals to potentially dangerous code,
            // we set `this` to the empty object.
            op.call({}, this.helpers);
        }
        catch(e) {
            // The script failed for whatever reason.
            throw new IntentionError({
                message: `Script Error: ${e.message}`
            });
        }
    }
}
