import { IntentionError } from "../errors.mjs";
import { IntentBase } from "./IntentBase.mjs";

/** **************************************************
 * The Assignment Class provides the core infrastructure for grading assignments.
 *
 * The Intention of the assignment is to be fully graded. However, if
 * the actual grading process is different for every assignment. Therefore,
 * this base class implements an abstract assignment process that more specialised
 * assessment classes can leverage. This intention takes care of 
 * 
 * 1. Identifying the assignment to assess 
 * 2. Fetch all submissions.
 * 3. Upload the scores (and potential feedbacks) back to Moodle.
 * 
 * This intention requires a `course` context that contains a valid 
 * course id.
 * 
 * Specialised assessment classes should either implement `assessSubmission` 
 * or `handleSubmissions`. 
 * 
 * `assessSubmission` is used for assessing a single submission. It can access
 * the submission object through the `this.activeSubmission`-property. Often 
 * the active submission object with its complex structure is of little use 
 * for the assessment. Therefore it is recommended to use the accessor functions
 * such as `getText()`, `getRawText()`, `getFiles()`, or `getSubmittedContent()`. 
 * The latter will provide the unfiltered list of submission elements under the 
 * submission's `plugins` property.
 * 
 * `handleSubmissions` is used for batch processing all submissions that
 * need handling. This function receives a list of submissions for assessment.
 * The function should be aware that the submission list could be empty. Overriding
 * `handleSubmissions` is useful when working with external assessment scripts. 
 * The handler receives a filtered list of submissions according the to the 
 * parameters of the intention (see "Special options"). Therefore, it is not
 * necessary to filter the submission list unless there are more 
 * specialised constraints, of course.
 *
 * Note: if `handleSubmissions` is overridden, then
 * the assessSubmission function is only needed of the new handler is calling it.
 * 
 * Special options: 
 * 
 * - `assess_all`: runs the assessment for all available submissions. Defaults to `false`.
 * - `skip_feedback`: do not upload the feedback (good for testing). Defaults to `false`.
 * - `moodle_state`: set a specific step in Moodle's grading workflow. Defaults to `released`.
 */
export class Assignment extends IntentBase {
    getRequiredParams() {
        return super.getRequiredParams().concat([
            "activity",
        ]);
    }

    constructor(data) {
        super(data);

        // Init optional parameters and ensure boolean values
        // Default is false, so this is OK
        this.paramAssessAll    = !!data.assess_all;
        this.paramSkipFeedback = !!data.skip_feedback;
    }

    // to be implemented by more specialised classes.
    // run one assessment at the time
    async assessSubmission() {}

    // Functions for reporting the assessment results

    score(num_score) {
        this.initAssessment();
        this.activeSubmission.assessment.score = num_score;
    }

    feedback(feedback_text) {
        this.initAssessment();
        this.activeSubmission.assessment.feedback = feedback_text;
    }

    // Functions to access a submission

    // returns the type of the actual submission
    submissionType() {
        // TODO: Identify which what has been actually submitted.
        // Can be text, files, something else, or any combination.
        // check for other plugins (but we have no idea what to expect)s
        return "none";
    }

    // return text as provided by the student
    // returns NULL if the submission has no text
    getText() {
        // don't perform extra loops
        if (this.activeSubmission.onlinetext &&
            this.activeSubmission.textformat >= 0) {

            return this.activeSubmission.onlinetext;
        }

        const inputs = this.activeSubmission.plugins
            .filter((pl) => pl.type === "onlinetext");

        if (inputs.length === 1) {
            const {text, format} = inputs[0].editorfields[0];

            this.activeSubmission.textformat = format;
            this.activeSubmission.onlinetext = text;
            return text;
        }

        return null;
    }

    // present submitted text without HTML
    // returns NULL if the submission has no text
    getRawText() {
        if (this.activeSubmission.rawtext && this.activeSubmission.rawtext.length) {
            return this.activeSubmission.rawtext;
        }

        const text = this.getText();

        if (this.activeSubmission.textformat === 1) {
            this.activeSubmission.rawtext = parse()
                .querySelectorAll("h1,h2,h3,h4,h5,p,li")
                .map((e) => e.textContent.trim())
                .join("\n\n");

            return this.activeSubmission.rawtext;
        }

        return text;
    }


    // Internal Workflow Functions

    async getSubmissions() {
        const subs = await this.api
            .mod_assign
            .submissions
            .get({
                "status": "submitted",
                "assignmentids[0]": cmid
            });

        const submissions = subs.assignments
            .map((assignment) => assignment.submissions)
            .flat();
    }

    async getAssignment() {
        const courseid = this.context.course.id;
        const activityname = this.activityname;

        const ccontent = await this.api.mod_assign.assignments.get({
            "courseids[0]": courseid
        });

        const result = ccontent.courses
            .map((section)=> section.assignments)
            .flat()
            .filter((activity) => activity.name === activityname);

        if (!result.length) {
            throw new IntentionError({
                message: "Assignment not found!",
                intention: `${this.type}: ${this.name} (${this.id})`
            });
        }

        if (result.length > 1) {
            throw new IntentionError({
                message: "Too many assignments found!",
                intention: `${this.type}: ${this.name} (${this.id})`
            });
        }

        const assignment = result.pop();

        // Moodle's very limited documentation is not precise about which value to use.
        // The docs suggest the cmid field, while the actual api wants the normal id.
        const cmid = assignment.id;

        this.checkNoSubmission(assignment);

        this.assignment    = assignment;
        this.assignmentid  = cmid;
    }

    checkNoSubmission(assignment) {
        const aconfigs = assignment.configs
            .filter((cfg) => cfg.value === "1" &&
                            cfg.subtype === "assignsubmission" &&
                            cfg.name === "enabled")
            .map((cfg) => cfg.plugin);

        if (!aconfigs.length) {
            throw new IntentionError({
                message: "Assignment accepts no submissions!",
                intention: `${this.type}: ${this.name} (${this.id})`
            });
        }
    }

    filterSubmissions(submissionList) {
        return submissionList
            .filter((subm) => self.paramAssessAll ||
                        subm.gradingstatus === "notgraded");
    }

    async handleSubmissions(submissionList) {
        const self = this;

        return submissionList
            .map((subm) => {
                self.activeSubmission = subm;
                return self.assessSubmission();
            });
    }

    async reportOneAssessment(assement) {
        const api = this.api;
        const aid = this.assignmentid;

        return assessment
            .filter((subm) => subm.assessment && subm.assessment.score !== null)
            .map((subm) => ({
                assessmentid: aid,
                userid: subm.userid,
                attemptnumber: subm.attemptnumber,

                // The following could be overridden by paramters to explicit values
                addattempt: 0,
                applytoall: 1,
                workflowstate: "released",

                // we claim to use markdown, might be configurable.
                "plugindata[assignfeedbackcomments_editor][format]": 4,

                // The actual score
                grade: subm.assessment.score,
                "plugindata[assignfeedbackcomments_editor][text]": subm.assessment.feedback || "",
            }))
            .map((score) => api.mod_assign.grade.save(score));
    }

    // Basic Function to be called by IntentBase.
    async run() {
        await this.getAssignment();
        const submissions = await this.getSubmissions();
        const assessments = await Promise.all(
            this.handleSubmissions(
                this.filterSubmissions(submissions)
            )
        );

        if (!this.paramSkipFeedback) {
            await Promise.all(this.reportAssessment(assessments));
        }
    }

    // Helper Functions

    initAssessment() {
        if (!this.activeSubmission.assessment) {
            this.activeSubmission.assessment = {};
        }
    }
}
