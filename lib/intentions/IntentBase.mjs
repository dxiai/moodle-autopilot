import {IntentionError} from "../errors.mjs";

function choose(a,b) {
    if (a) {
        return a;
    }
    return b;
}

export class IntentBase {
    constructor(data) {
        this.param = data.with;
        this.type = data.use;

        if (data.id) {
            this.id = data.id;
        }

        this.name = choose(data.name, data.use);

        if (data.context) {
            if (typeof data.context === "string") {
                data.context = [data.context];
            }
            if (Array.isArray(data.context)) {
                const ctxs = {};

                data.context.forEach((ctx) => ctxs[ctx] = ctx);
                data.context = ctxs;
            }
            this.contextWanted = data.context;
        }

        this.checkRequiredParameter(data.with);
    }

    /**
     * Sets up the required parameters for an Intent. 
     * 
     * This method MUST be implemented if an Intent depends on with-parameters
     * for configuring the Intent's behaviour. 
     * 
     * This method MUST NOT be implemented if an Intent uses only optional 
     * with-parameters. For optional parameters the Intent SHOULD implement 
     * extra measures for avoiding code level errors to get thrown. 
     * @returns {Array}
     */
    getRequiredParams() {
        return [];
    }

    /**
     * Sets up the required endpooints for the Intent. 
     * 
     * This method MUST be implemented by an Intent, if API functions are 
     * called. Typically this method is implemented as: 
     *   return super.getEndpoint().push(myEndPoints);
     *
     * If an Intent calls Moodle API endpoints, then the Intent MUST check 
     * if the needed API endpoint is actually supported for the provided 
     * Token. This allows the Workflow to fail as early as the API becomes 
     * available. 
     * 
     * This will help workflow designers to communicate missing API endpoints
     * to overly restrictive system administrators.
     * 
     * By default this function returns a empty Array to indicate that no 
     * API endpoints are required.
     * @returns {Array} List of required endpoints
     */
    getEndpoints() {
        return [];
    }

    /**
     * Interface for the workflow runner and the Intent Class to expose 
     * Moodle's API to the intent. 
     * 
     * This method exposes the API object to the Intent and checks if 
     * all required API endpoints are available in the respective API. 
     * As Moodle APIs expose only the activated endpoints, a mandatory 
     * API will be available in the LMS, but MAY not be exposed for the 
     * provided API Token.
     * 
     * If an API endpoint is unavailable, this function raises an error,
     * immediately.
     * @param api 
     */
    setApi(api) {
        const self = this;
        const endpoints = this.getEndpoints();

        this.api = api;

        if (endpoints && Array.isArray(endpoints)) {
            endpoints.map(endpoint => {
                const match = endpoint.split("_");
                const mod = match.slice(0,2).join("_");
                const verb = match[2];
                const action = match.slice(3).join("_");

                if (!(api && api[mod] && api[mod][verb] && api[mod][verb][action])) {
                    throw new IntentionError({
                        message: `API not enabled: ${endpoint}`,
                        intention: `${self.type}: ${self.name} (${self.id})`
                    });    
                }
            });
        }
    }

    checkRequiredParameter(parameter) {
        const reqP = this.getRequiredParams();

        if (reqP.length && parameter) {
            const refP = Object
                .keys(parameter)
                .filter((p) => reqP.includes(p));

            if (reqP.length !== refP.length) {
                throw new IntentionError({
                    message: `Required Parameter missing\nWanted: ${reqP.join(", ")}\nGot: ${refP.join(", ")}`
                });
            }
        }
        else if (reqP.length) {
            throw new IntentionError({
                message: `Required Parameter missing\nWanted: ${reqP.join(", ")}\nGot: nothing`
            });
        }
    }

    resolveContext(contexts) {
        const myContexts = {};

        if (this.contextWanted) {
            Object
                .keys(this.contextWanted)
                .forEach((ctx) => {
                    const extCtx = this.contextWanted[ctx];

                    if (!Object.prototype.hasOwnProperty.call(contexts,extCtx)) {
                        throw new IntentionError({
                            message: `Required Context ${extCtx} is unavailable.`,
                            intention: `${this.type}: ${this.name} (${this.id})`
                        });
                    }

                    myContexts[ctx] = contexts[extCtx];
                });
        }
        this.context = myContexts;
    }

    run_info(id) {
        const info = [id, ": Run ", this.type];

        if (this.name) {
            info.push(": ", this.name);
        }

        if (this.id) {
            info.push(" (", this.id , ")");
        }

        console.log(`${info.join("")}`);
        this.output = {};
    }

    expose(name, data) {
        this.output[name] = data;
    }

    run_complete() {
        console.log("   Run completed successfully.");
    }

    async setup_run() {}
    async run() {}
    async cleanup_run() {}
    
    async step(context, id = 0) {
        id += 1;

        this.run_info(id);
        this.resolveContext(context);

        await this.setup_run();
        await this.run();
        await this.cleanup_run();

        if (this.id) {
            context[this.id] = this.output;
        }

        this.run_complete();
    }
}
