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

    getRequiredParams() {
        return [];
    }

    setApi(api) {
        this.api = api;
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

    async run() {}

    async step(context, id = 0) {
        id += 1;

        this.run_info(id);
        this.resolveContext(context);

        await this.run();

        if (this.id) {
            context[this.id] = this.output;
        }

        this.run_complete();
    }
}
