# The Intention Format

Each Intention represents a workflow. 

> **Definition:** A workflow is a sequence of steps that lead to an intended outcome. 

All intentions are described as [YAML-files](https://yaml.org/). 

Each intention consists of two parts. 

1. An environment, in which it is performed. 
2. The actual workflow

Additionally the section `metadata` may contain information about an intention. These information are presently not used by the autopilot. 

## Environment

The environment currently represents the LMS connection in the form of an URL. Note that the environment is agnostic of the access token. The token has to be provided separately for security purposes. 

In the future, it might be possible to have multiple (named) connections to different services. 

The environment may also contain information for bootstrapping the temporary working directories for the auto pilot. 

The environment will allow bootstrapping other parts of the local working environment of the workflow. Most notably this will include cloning grading repositories from a git server such as github, gitlab or bitbucket. 

## Workflow 

The workflow describes the steps that are required to achieve an intended state. These steps are modelled as a **sequence** and are executed in the presented order. 

### Workflow Steps

Each step consists at minimum of a `use`-claim, which defines the find of action to take. Use refers to an action plugin that is dynamically loaded into the workflow. 

Most steps have results. The results of a workflow step are *exposed* to the workflow context, but only become available to the workflow if the step has an `id` that other steps can use to connect to the exposed results. 

Workflows can connect to the results of other steps by requesting a `context`. The context is either a list of other ids - or more commonly a map that links a step id to an internal context. In this way the `context` can be seen as a parameter list for a step, which enables reuse of the data. If context is presented with only one step id or a list of ids, then these names will be used also for internal contexts. This is only useful for very simple workflows where the external and the internal id are matching. This approach is not useful if the same workflow plugin is used in different steps that receive input from different sources. 

Another way of passing data into a workflow step is to use special parameters using the `with`-key. This key allows to pass constant parameters to the step. 

Finally a step can be named. This is used for display purposes. If no name is provided, then autopilot will use the plugin name as a name. 

## Statfullnes of the workflows

**WORK IN PROGRESS**

*Currently intentions are stateless and do not behave as described below!*

Intentions are statefull. This means that they store a previous state and will not repeat steps that were previously completed. This is particularly useful for managing large cohorts or running tasks, frequently. Autopilot will keep elements of the environment (like git repos and imported data) and skips the steps if nothing has changed.  

## LMS Abstraction

**WORK IN PROGRESS**

At the level educational designs, we may want to switch between LMSes. E.g. an instructor may want to move a course from moodle to openedX or vice versa. 

The autopilot should consider this scenario. 