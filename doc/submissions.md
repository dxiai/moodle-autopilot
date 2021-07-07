## Assignment Submissions in Moodle



Students are supposed to submit their assignments.

In order to get the submissions, we need to get the parent submission, which in turn is part of a course.

Therefore, the first intent is to be in the correct course when working the assignments.

## Get Assignment Submissions

As we do not know anything else than the title, we MUST lookup the assignment within a course. This can be done via 

- `core_course.contents.get()`, OR
- `mod_assign.assignments.get()`

The easier way is to use the latter because it will only present the assignments in a course. We can then filter by `assignment.name`. There should be only one result, unless we want to run the same grading for multiple activities.

For us the important components of an assignment are: 

- `id`: used for all subsequent actions
- `cmid`:  might be useful for retrieving comments.
- `configs`: provides information about which types of submissions are possible. At the submission level we are only interested in configurations of subtype `assignsubmission`. We find all kinds of configurations for the different submission types. The enabled plugins for `assignsubmission` determine, which contents are presented as submissions. 

> *Note:* The comments plugin is always configured. However, the submission comments are only available through the core_comment API (see section **Comment API**)

It is possible to allow no submissions for an assignment. This is useful for providing feedback on experience oriented activities. If the selected assignment accepts no submissions this step will explicitly fail as the intention is invalid.

With assignment `id` the actual submissions can be fetched using the `mod_assign.submissions.get()` API. Moodle differentiates between 

- a submission `status`, and 
- a `gradingstatus`. 

The API allows only to filter to the submission status, which must be set to `submitted`. Other stati are not officially submitted. 

Submissions can be defined as `draft` if the assignment requires explicit submissions or confirmation of all group members. Draft submissions may only be included into the grading process, if the assignment deadline has passed. I.e. if the current time is later than max(`duedate` | `cutofdate`).

The `gradingstatus` shows id a submission has been already graded. If the `gradingstatus` is graded, it must be ignored if regrading becomes necessary. This should be decided by a grading step later in the workflow.

For each submissions we get all the relevant metadata and the actual submission. The actual submission is stored under plugins. 

Some assignment allow different submission formats, simultaneously. In this case we need to retrieve all submissions. Such scenarios may require multi-step grading workflows.

The default submission types are 
- `onlinetext`, and 
- `file`

Moodle only reports that submitted file information (and mimetype). This might be normalised into a more suitable format. 

