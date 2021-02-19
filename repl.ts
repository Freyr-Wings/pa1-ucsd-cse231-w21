import { Value, Type } from "./ast";
import wabt from 'wabt';
import * as compiler from './compiler';
import { tcProgram } from './typechecker';
import { parse } from './parser';
import { MemoryManager } from './memory';
import { EnvManager } from "./env";

// interface REPL {
//   run(source : string) : Promise<any>;
// }

export class BasicREPL {
  
  importObject: any;
  globalMemory: MemoryManager = new MemoryManager();
  envManager: EnvManager = new EnvManager();

  constructor(importObject: any) { 
    this.importObject = importObject;
    if(!importObject.js) {
      this.importObject.js = { memory: this.globalMemory.memory };
    }
  }

  async run(source: string): Promise<Value> {
    const wabtInterface = await wabt();

    // const importObject = {
    //   js: { mem: this.memory },
    //   imports: {},
    // };

    const compileResult = compiler.compile(source, this.importObject, this.globalMemory, this.envManager);
    const wasmSource = compileResult.wasmSource;

    const myModule = wabtInterface.parseWat("test.wat", wasmSource);
    var asBinary = myModule.toBinary({});
    var wasmModule = await WebAssembly.instantiate(asBinary.buffer, this.importObject);
    const result = await (wasmModule.instance.exports.exported_func as any)();
    
    const resultValue = compileResult.resultValue;
    if (resultValue.tag == "bool") {
      if (Number(result) == 1) {
        resultValue.value = true;
      } else {
        resultValue.value = true;
      }
    } else if (resultValue.tag == "num") {
      resultValue.value = Number(result);
    } else if (resultValue.tag == "object") {
      resultValue.address = Number(result);
      if (resultValue.address === 0) {
        return {tag: "none"};
      }
    }
    return resultValue;
  }

  async tc(source: string): Promise<Type> {
    const prog = parse(source);
    tcProgram(prog, this.globalMemory, this.envManager);

    console.log(prog.stmts.length);
    if (prog.stmts.length == 0) {
      return {tag: "none"}; 
    }

    const lastStmt = prog.stmts[prog.stmts.length-1];
    
    if (lastStmt.tag === "expr") {
      if (lastStmt.type) {
        let name = lastStmt.type.getName();
        if (name == "bool") {
          return {tag: "bool"};
        } else if (name == "int") {
          return {tag: "number"};
        } else if (name == "<None>") {
          return {tag: "none"};
        } else {
          return {tag: "class", name: name}
        } 
      }
    }

    return {tag: "none"};
  }
}