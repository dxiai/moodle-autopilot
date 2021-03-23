# Moodle Autopilot
Intentional Educational Design Flows

## Motivation

Online Courses with large cohorts are hard to orchestrate, moderate, and personalise in conventional learning management systems (LMS). From group sizes above 30, automation becomes increasingly hard to maintain and above 100 participants it is nearly impossible to provide reliable personal feedback using the system tools. Among the many weaknesses of general purpose tools such as as Moodle, Ilias, Olat, BlackBoard, or Canvas is their weak support for orchestrating learning processes. On top of this weakness many teachers and lecturers require speical solutions for their subject matter. While standard functions include support for IMS LTI, IMS CC, IMS LIS, and increasingly XAPI that allows integrating external tools, the integration of externa is often provided as one off integration and does not support deeper process integration. In practice educational process integration requires human intervention of teachers, lecturers, or tutors. Such manual interventions are often very cumersome and time consuming. 

> **moodle-autopilot** provides a way of automating the manual processes through expressing ***educational intentions*** as scripts. 

## General Princinple 

* Educational scripts are designed to respond to changes in the course. Each educational script represents the intended state of a course after an intervention.

* Each course can be linked to multiple scripts that implement different educational interventions and intentions in order to modularise the complexity of educational process orchestration. 

* The educational scripts should allow users to overcome the limitations of web-based LMS by automating repetitive manual tasks.

* Educators should be able to use libraries of educational interventions by simply parameterising existing scripts. 

* Educators should be able to offload the automation process to continuous integration/continuous deployments (CI/CD) systems, such as GitHub Actions, GitLab Pipelines, or Jenkins. 
