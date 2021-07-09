import { IntentionError } from "../errors.mjs";
import { IntentBase } from "./IntentBase.mjs";
import * as htmlparser from "node-html-parser";

const { parse } = htmlparser.default;

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

    /**
     * Provide the list of required (non-optional) parameters for the intention.
     *
     * @returns Array of required with-parameters
     */
    getRequiredParams() {
        return super.getRequiredParams().concat([
            "activity",
        ]);
    }

    constructor(data) {
        super(data);

        // Init optional parameters and ensure boolean values
        // Default is false, so this is OK
        this.paramAssessAll    = !!data.with.assess_all;
        this.paramSkipFeedback = !!data.with.skip_feedback;
    }

    // Assessment functions for specialised implementations.

    /**
     * Abstract function for assessing a single submission.
     *
     * Specialised classes SHOULD implement this function, if they
     * follow a one-assessment-at-the-time approach. The function has NO parameters.
     * The current submission data can get accessed through `this.activeSubmission` or
     * through one of the accessor functions.
     */
    async assessSubmission() {}

    /**
     * This function handles the actual grading process for **all** submissions.
     *
     * By default this function will assess a one submission at the time by
     * calling the `assessSubmission()` function.
     *
     * Specialised classes MAY overload this function for implementing a batch
     * assessment.
     *
     * @param submissionList
     * @returns Array Graded submissions
     */
    handleSubmissions(submissionList) {
        const self = this;

        return submissionList
            .map(async (subm) => {
                self.activeSubmission = subm;
                await self.assessSubmission();
                return self.activeSubmission;
            });
    }

    // Functions for reporting the assessment results

    /**
     * Sets the numerical score for the active Submission.
     *
     * @param num_score
     */
    setScore(num_score) {
        this.initAssessment();
        this.activeSubmission.assessment.score = num_score;
    }

    /**
     * Sets the freeform feedback for the active submission.
     *
     * @param feedback_text
     */
    setFeedback(feedback_text) {
        this.initAssessment();
        this.activeSubmission.assessment.feedback = feedback_text;
    }

    // Functions to access a submission

    /**
     * returns the type of the actual submission
     *
     * @returns String submission type
     */
    submissionType() {
        // TODO: Identify which what has been actually submitted.
        // Can be text, files, something else, or any combination.
        // check for other plugins (but we have no idea what to expect)s
        return "none";
    }

    /**
     * Returns text as provided by the student in the online form.
     *
     * Returns NULL if the submission has no text.
     *
     * @returns String submitted online text
     */
    getText() {
        // don't perform extra loops
        if (this.activeSubmission.onlinetext &&
            this.activeSubmission.textformat >= 0) {

            return this.activeSubmission.onlinetext;
        }

        const inputs = this.activeSubmission.plugins
            .filter((pl) => pl.type === "onlinetext")
            .pop();

        if (inputs) {
            const {text, format} = inputs.editorfields[0];

            this.activeSubmission.textformat = format;
            this.activeSubmission.onlinetext = text;
            return text;
        }

        return null;
    }

    /**
     * Returns the submitted online text for the submission. If the submission
     * is in HTML, then this will strip most of the formatting and returned in
     * a quasi markdown format.
     *
     * Returns NULL if the submission has no text.
     *
     * @returns String String stripped text content
     */
    getRawText() {
        if (this.activeSubmission.rawtext && this.activeSubmission.rawtext.length) {
            return this.activeSubmission.rawtext;
        }

        const text = this.getText();

        if (this.activeSubmission.textformat === 1) {
            this.activeSubmission.rawtext = parse(text)
                .querySelectorAll("h1,h2,h3,h4,h5,p,li")
                .map((e) => e.textContent.trim())
                .join("\n\n");

            return this.activeSubmission.rawtext;
        }

        this.activeSubmission.rawtext = text;

        return text;
    }

    /**
     * Provide access to all active submission types.
     *
     * @returns Array List of objects for each allowed submission type.
     */
    getSubmittedData() {
        return this.activeSubmission.plugins;
    }

    // Internal Workflow Functions

    /**
     * Fetches all submissions for the active assignment.
     *
     * This function is internal to the assisngment intention and
     * MUST NOT be overloaded!
     *
     * This function MAY return an empty list if no (new/ungraded) submissions are
     * available.
     *
     * @returns Array List of submissions
     */
    async getSubmissions() {
        const cmid = this.assignmentid;
        const self = this;

        const subs = await this.api
            .mod_assign.submissions.get({
                "status": "submitted",
                "assignmentids[0]": cmid
            });

        return subs.assignments
            .map((assignment) => assignment.submissions || [])
            .flat()
            // filter ungraded or all submissions
            .filter((subm) =>
                self.paramAssessAll ||
                subm.gradingstatus === "notgraded"
            );
    }

    /**
     * Loads the requested assignment from Moodle.
     *
     * This function is internal to the assignment intention and
     * MUST NOT be overloaded!
     *
     * This function stops the workflow if the requested assignment does not
     * exist in the provided course context.
     */
    async getAssignment() {
        const courseid = this.context.course.id;
        const activityname = this.param.activity;

        const ccontent = await this.api.mod_assign.assignments.get({
            "courseids[0]": courseid
        });

        // console.log(ccontent.courses[0].assignments);

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

    /**
     * Uploads Grades to Moodle one by one.
     *
     * This internal helper function reports the grades back to Moodle.
     *
     * @param assement Array
     * @returns Array List of upload Promises
     */
    reportAssessments(assessments) {
        const api = this.api;
        const aid = this.assignmentid;

        return assessments
            .filter((subm) => subm.assessment && subm.assessment.score !== null)
            .map((subm) => ({
                assignmentid: aid,
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

    /**
     * Implementation of the assignment intention workflow.
     *
     * Specialised Assignment Assessment MUST NOT override this function. Instead,
     * they should implement the `handleSubmissions` function or
     * `assessSubmission` function.
     *
     * Touching this function will break the download of submissions and upload of the
     * grades.
     */
    async run() {
        await this.getAssignment();
        const submissions = await this.getSubmissions();

        if (!submissions.length) {
            console.log("   No Submissions to handle. Skipping...");
            return;
        }

        const assessments = await Promise.all(
            this.handleSubmissions(submissions)
        );

        if (!this.paramSkipFeedback) {
            await Promise.all(this.reportAssessments(assessments));
        }
    }

    /**
     * Checks if the assignment actually accepts submissions.
     *
     * This function is **internal** to the assignment intention and
     * MUST NOT be overloaded.
     *
     * The function will stop the entire workflow, if the requested assignment
     * does not accept any submissions.
     *
     * @param assignment
     */
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

    /**
     * Initialises the active submission to have the assessment structures in place.
     *
     * This function is **internal** to the assignment intention and
     * MUST NOT be overloaded.
     */
    initAssessment() {
        if (!this.activeSubmission) {
            this.activeSubmission = {};
        }

        if (!this.activeSubmission.assessment) {
            this.activeSubmission.assessment = {};
        }
    }
}
