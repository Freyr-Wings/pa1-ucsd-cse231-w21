export type GlobalEnv = {
    globals: Map<string, number>;
    offset: number;
}

export const emptyEnv = { globals: new Map(), offset: 0 };


function envLookup(env : GlobalEnv, name : string) : number {
    if (!env.globals.has(name)) { 
        console.log("Could not find " + name + " in ", env); 
        throw new Error("Could not find name " + name); 
    }
    return (env.globals.get(name) * 4); // 4-byte values
}

class Value {

}

class BasicValue extends Value {

}

class ComplexValue extends Value {
    
}

class Env {


    constructor() {
        
    }
}

const globalEnv = new Env();
