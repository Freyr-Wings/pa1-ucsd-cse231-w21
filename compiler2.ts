import { wasm } from "webpack";
import { ClassDef, ClassType, Expr, FuncDef, FuncType, Literal, Program, Stmt, Value, VarDef } from "./ast";
import { Env, EnvManager } from "./env";
import { MemoryManager } from "./memory";
import { parse } from "./parser";
import { tcProgram } from "./typechecker";

let globalMemory: MemoryManager;
let curEnv: Env;
const MIN_SIZE = 4;
const WASM_FUNC_TYPE = "$MYCOMPILERFUNC";
const WASM_FUNC_TYPE_DEF = `(type ${WASM_FUNC_TYPE} (func (result i32)))`
const generalPointer: Map<string, number> = new Map([
  ["SP", 1],
  ["DL", 2],
  ["HP", 3],
]);

function getPointer(reg: string): Array<string> {
  let pointer = generalPointer.get(reg);
  return [
    `(i32.const ${pointer * MIN_SIZE})`,
    `(i32.load)`,
  ];
}

function getPointerWithOffset(reg: string, offset: number): Array<string> {
  let pointer = generalPointer.get(reg);
  return [
    `(i32.const ${pointer * MIN_SIZE})`,
    `(i32.load)`,
    `(i32.const ${offset * MIN_SIZE})`,
    `(i32.add)`,
  ];
}

function setPointerWithOffset(reg: string, offset: number, value: number): Array<string> {
  let pointer = generalPointer.get(reg);
  return [
    `(i32.const ${pointer * MIN_SIZE})`,
    `(i32.load)`,
    `(i32.const ${offset * MIN_SIZE})`,
    `(i32.add)`,
    `(i32.const ${value})`,
    `(i32.store)`
  ];
}

function setMemory(memory: number, value: number): Array<string> {
  return [
    `(i32.const ${memory * MIN_SIZE})`,
    `(i32.const ${value})`,
    `(i32.store)`
  ];
}

function setPointerWithOffsetAndExpr(reg: string, offset: number, expr: Array<string>): Array<string> {
  let wasms: Array<string> = new Array();
  wasms = wasms.concat(
    getPointerWithOffset(reg, offset),
    expr,
    [`(i32.store)`]
  )
  return wasms;
}

function updateRegisterWithOffset(reg: string, offset: number): Array<string> {
  let pointer = generalPointer.get(reg);
  return [
    `(i32.const ${pointer * MIN_SIZE})`,
    `(i32.const ${pointer * MIN_SIZE})`,
    `(i32.load)`,
    `(i32.const ${offset * MIN_SIZE})`,
    `(i32.add)`,
    `(i32.store)`,
  ];
}

function updateRegisterWithExpr(reg: string, expr: Array<string>): Array<string> {
  let pointer = generalPointer.get(reg);
  let wasms: Array<string> = new Array();
  wasms = wasms.concat(
    [`(i32.const ${pointer * MIN_SIZE})`],
    expr,
    [`(i32.store)`]
  )
  return wasms;
}

function findVarPosition(name: string): Array<string> {
  let iterEnv = curEnv;
  let wasms: Array<string> = new Array();
  wasms = wasms.concat(
    getPointerWithOffset("DL", -1),
  )
  while (!iterEnv.nameToVar.has(name)) {
    iterEnv = iterEnv.parent;
    wasms = wasms.concat([`i32.load`]);
  }

  wasms = wasms.concat(
    [`i32.const ${(-1 - iterEnv.nameToVar.get(name).offset) * MIN_SIZE}`],
    [`i32.add`]
  );
  return wasms;
}

function getMethodFromPtr(ct: ClassType, methodName: string): Array<string> {
  console.log("compile!!", methodName);
  console.log("compile!!", ct);
  return [
    // `(i32.const ${globalMemory.dispatchTablesHead})`,
    `(i32.const ${(ct.getDispatchTablePtrOffset()) * MIN_SIZE})`,
    `(i32.add)`,
    `(i32.load)`,  // dispatch table ptr
    `(i32.load)`,
    `(i32.const ${(ct.methodPtrsHead + ct.methodPtrs.get(methodName)) * MIN_SIZE})`,
    `(i32.add)`,
    `(i32.load)`,
  ]
}

const binaryOpToWASM: Map<string, Array<string>> = new Map([
  ["+", ["(i32.add)"]],
  ["-", ["(i32.sub)"]],
  ["*", ["(i32.mul)"]],
  ["//", ["(i32.div_s)"]],
  ["%", ["(i32.rem_s)"]],
  ["==", ["(i32.eq)"]],
  ["!=", ["(i32.ne)"]],
  ["<=", ["(i32.le_s)"]],
  [">=", ["(i32.ge_s)"]],
  ["<", ["(i32.lt_s)"]],
  [">", ["(i32.gt_s)"]],
  ["is", ["(i32.eq)"]],
  ["and", ["(i32.and)"]],
  ["or", ["(i32.or)"]],
])

function codeGenCallerInit(): Array<string> {
  let wasms: Array<string> = new Array();

  wasms = wasms.concat(
    setPointerWithOffsetAndExpr("SP", -1, getPointer("DL")),
    setPointerWithOffsetAndExpr("SP", -2, getPointerWithOffset("DL", -1)),
    updateRegisterWithExpr("DL", getPointerWithOffset("SP", -1)),
    updateRegisterWithOffset("SP", -2),
  )
  return wasms;
}

function codeGenCallerDestroy(): Array<string> {
  let wasms: Array<string> = new Array();

  let loadDL: Array<string> = new Array();
  loadDL = loadDL.concat(
    getPointer("DL"),
    [`(i32.load)`]
  )

  wasms = wasms.concat(
    updateRegisterWithExpr("SP", getPointerWithOffset("DL", 1)),
    updateRegisterWithExpr("DL", loadDL),
  )
  return wasms;
}

function codeGenLiteral(l: Literal): Array<string> {
  return [`(i32.const ${literalToVal(l)})`];
}

function literalToVal(l: Literal): number {
  switch (l.tag) {
    case "True":
      return 1;
    case "number":
      return l.value;
    default:
      return 0;
  }
}

function codeGenAlloc(ct: ClassType): Array<string> {
  let wasms: Array<string> = new Array();
  wasms = wasms.concat(
    [`;; Allocating class ${ct.getName()}`],
    setPointerWithOffset("HP", 0, -1),  // tag
    setPointerWithOffset("HP", 1, ct.size),  // size
    setPointerWithOffset("HP", 2, ct.methodPtrsHead * MIN_SIZE),  // dtable
  )

  ct.attributes.forEach(attr => {
    wasms = wasms.concat(
      setPointerWithOffset("HP", ct.headerSize + attr.offset, literalToVal(attr.value))
    );
  });

  wasms = wasms.concat(
    getPointer("HP"),
    updateRegisterWithOffset("HP", ct.size),
  )

  return wasms;
}


function codeGenExpr(expr: Expr): Array<string> {
  let wasms: Array<string> = new Array();

  switch (expr.tag) {
    case "literal": {
      return codeGenLiteral(expr.value);
    }
    case "id": {
      // load the value of this id (ptr for obj / func, val for int / bool)
      wasms = wasms.concat(
        getPointerWithOffset("DL", -1)
      );  // pointer to current SL 
      let iterEnv = curEnv;
      let counter = 0;
      while (!iterEnv.nameToVar.has(expr.name)) {
        counter += 1;
        iterEnv = iterEnv.parent;
        wasms = wasms.concat([`(i32.load)`])
      }
      // at SL now
      let idInfo = iterEnv.nameToVar.get(expr.name);
      wasms = wasms.concat([
        `(i32.const ${(-1 - idInfo.offset) * MIN_SIZE})`,
        `(i32.add)`,
        `(i32.load)`,
      ])
      break;
    }
    case "unaryop": {
      let exprWASM = codeGenExpr(expr.expr);
      if (expr.op === "-") {
        wasms = wasms.concat(
          ["(i32.const 0)"],
          exprWASM,
          ["(i32.sub)"]
        )
      } else if (expr.op === "not") {
        wasms = wasms.concat(
          ["(i32.const 1)"],
          exprWASM,
          ["(i32.xor)"]
        )
      }
      break;
    }
    case "binaryop": {
      const expr1Stmts = codeGenExpr(expr.expr1);
      const expr2Stmts = codeGenExpr(expr.expr2);
      wasms = wasms.concat(
        expr1Stmts,
        expr2Stmts,
        binaryOpToWASM.get(expr.op),
      )
      break;
    }
    case "member": {
      let ownerWASM = codeGenExpr(expr.owner);
      let ownerType = expr.owner.type;
      if (ownerType.attributes.has(expr.property)) {
        wasms = wasms.concat(
          ownerWASM,  // load owner ptr
          [
            `(i32.const ${(
            ownerType.headerSize + 
            ownerType.attributes.get(expr.property).offset) * MIN_SIZE})`,
            `(i32.add)`,
            `(i32.load)`
          ],
        );
      } else if (ownerType.methods.has(expr.property)) {
        wasms = wasms.concat(
          setPointerWithOffsetAndExpr("SP", -1, ownerWASM),
          updateRegisterWithOffset("SP", -1),
          getPointer("SP"),  // load owner ptr
          getMethodFromPtr(ownerType, expr.property),
        );
      }
      break;
    }
    case "call": {
      // member
      // init
      // print
      if (expr.caller.tag !== "member" && expr.caller.tag !== "id") {
        break;
      }

      if (expr.caller.tag === "id") {
        console.log("compile2:", expr);
        if (!expr.caller.funcType) {
          // print
          wasms = wasms.concat(codeGenExpr(expr.args[0]));
          if (expr.args[0].type.getName() === "int") {
            wasms = wasms.concat([`call $print#int`]);
          } else if (expr.args[0].type.getName() === "bool") {
            wasms = wasms.concat([`call $print#bool`]);
          } else {
            wasms = wasms.concat([`call $print#object`]);
          }
          return wasms;
        }
      }

      // init
      let classType = expr.type;
      let funcType = expr.caller.funcType;

      if (expr.caller.tag === "id") {
        if (!classType.methods.has("__init__")) {
          // ptr on stack, no acti
          return codeGenAlloc(classType);
        }
      }

      let fillPtrAndGetMethod: Array<string> = new Array();
      let pushArgsExpr: Array<string> = new Array();

      let funcGlobalName = `${classType.globalName}#__init__`;
      if (expr.caller.tag === "member") {
        funcGlobalName = funcType.globalName;
      }

      let iterEnv = Env.envMap.get(funcGlobalName);
      

      iterEnv.nameToVar.forEach((variable, name) => {
        if (variable.offset <= expr.args.length && variable.offset > 0) {
          pushArgsExpr = pushArgsExpr.concat(
            setPointerWithOffsetAndExpr("DL", -2-variable.offset, codeGenExpr(expr.args[variable.offset - 1])),
          )
        }
      });

      pushArgsExpr = pushArgsExpr.concat(
        updateRegisterWithOffset("SP", -expr.args.length)
      );

      if (expr.caller.tag === "id") {
        fillPtrAndGetMethod = fillPtrAndGetMethod.concat(
          codeGenAlloc(classType),
          setPointerWithOffsetAndExpr("SP", -1, getPointerWithOffset("HP", -classType.size)),  // put 'self' on acti
          updateRegisterWithOffset("SP", -1),
          getPointerWithOffset("HP", -classType.size),  // need an extra ptr as result
          getMethodFromPtr(classType, "__init__"),
          
          // [`(call_indirect (type ${WASM_FUNC_TYPE}))`],
          // getPointerWithOffset("HP", -classType.size),  // always return obj ptr
        )
        wasms = wasms.concat(
          codeGenMethodCall(fillPtrAndGetMethod, pushArgsExpr),
          ['drop'],  // drop none return 
        )
      } else if (expr.caller.tag === "member") {
        fillPtrAndGetMethod = fillPtrAndGetMethod.concat(
          setPointerWithOffsetAndExpr("SP", -1, codeGenExpr(expr.caller.owner)),  // set as the first arg
          updateRegisterWithOffset("SP", -1),
          getPointer("SP"),
          // [`(call $print#int)`],
          [`(i32.load)`],
          getMethodFromPtr(expr.caller.owner.type, expr.caller.property)
        );
        wasms = wasms.concat(
          codeGenMethodCall(fillPtrAndGetMethod, pushArgsExpr),
        );
      }
      break;
    }
  }
  return wasms;
}

function codeGenMethodCall(fillPtrAndGetMethod: Array<string>, pushArgsExpr: Array<string>): Array<string> {
  let wasms: Array<string> = new Array();
  wasms = wasms.concat(
    [`;; caller init`],
    codeGenCallerInit(),
    [`;; fillPtrAndGetMethod`],
    fillPtrAndGetMethod,
    [`;; pushArgsExpr`],
    pushArgsExpr,
    [`(call_indirect (type ${WASM_FUNC_TYPE}))`],
    [`;; caller destroy`],
    codeGenCallerDestroy(),
  )
  return wasms;
}

function codeGenGetPos(e: Expr): Array<string> {
  let wasms: Array<string> = new Array();
  switch (e.tag) {
    case "member": {
      break;
    }
    case "id": {
      break;
    }
      
  }
  return wasms;
}


function codeGenStmt(s: Stmt): Array<string> {
  let wasms: Array<string> = new Array();
  switch (s.tag) {
    case "assign": {
      wasms = wasms.concat(
        codeGenExpr(s.name).slice(0, -1),
        codeGenExpr(s.value),
        [`(i32.store)`],
      );
      break;
    }
    case "expr": {
      wasms = wasms.concat(
        codeGenExpr(s.expr),
      );
      // if (curEnv.name === "") {
        wasms = wasms.concat(
          [`(local.set $$last)`]
        )
      // }
      break;
    }
    case "if": {
      if (s.exprs.length === 0) {
        if (s.blocks.length === 1) {
          s.blocks[0].forEach(stmt => {
            wasms = wasms.concat(codeGenStmt(stmt));
          })
        }
        return wasms;
      }
      wasms = wasms.concat(
        codeGenExpr(s.exprs[0]),
        [`(if`],
        [`(then`]
      );

      s.blocks[0].forEach(stmt => {
        wasms = wasms.concat(codeGenStmt(stmt));
      })

      if (s.exprs.length !== s.blocks.length) {
        s.exprs.shift();
        s.blocks.shift();
        
        wasms = wasms.concat(
          [`)\n(else`],
          codeGenStmt(s),
        );
      }

      wasms = wasms.concat([`)\n)`]);
      break;
    }
    case "pass": {
      break;
    }
    case "return": {
      if (s.expr.tag === "literal" && s.expr.value.tag === "None") {
        break;
      }
      wasms = wasms.concat(codeGenExpr(s.expr));
      break;
    }
    case "while": {
      wasms = wasms.concat(
        [`(block \n(loop`],
        codeGenExpr(s.expr),
        [`(i32.const 1)`, `(i32.xor)`, `(br_if 1)`],
      )
      s.stmts.forEach(stmt => {
        wasms = wasms.concat(codeGenStmt(stmt));
      });
      wasms = wasms.concat(
        [`(br 0)\n)\n)`]
      )
      break;
    }
  }
  return wasms;
}

function codeGenVarDef(vd: VarDef): Array<string> {
  let wasms: Array<string> = new Array();
  let varVal = curEnv.nameToVar.get(vd.tvar.name);
  
  wasms = wasms.concat(
    setPointerWithOffset("DL", -2-varVal.offset, literalToVal(vd.value)),
    updateRegisterWithOffset("SP", -1),
  )

  return wasms;
}

function codeGenMethodDef(fd: FuncDef, ft: FuncType): Array<string> {
  let wasms: Array<string> = new Array();

  curEnv = curEnv.nameToChildEnv.get(ft.getName());
  wasms = wasms.concat(
    [
      `(func ${ft.globalName} (result i32)`,
      `(local $$last i32)`
    ],
  )

  for (const varDef of fd.body.defs.varDefs) {
    wasms = wasms.concat(codeGenVarDef(varDef));
  }

  // wasms = wasms.concat(
  //   updateRegisterWithOffset("SP", -fd.body.defs.varDefs.length),
  // );

  for (const stmt of fd.body.stmts) {
    wasms = wasms.concat(codeGenStmt(stmt));
  }

  if (ft.returnType.getName() === "<None>") {
    wasms = wasms.concat([`(i32.const 0)`]);
  }

  wasms = wasms.concat(
    [`)`]
  );

  curEnv = curEnv.parent;
  return wasms;
}

function codeGenClassDef(cd: ClassDef): [Array<string>, Array<string>] {
  let wasms: Array<string> = new Array();

  let globalName = `${curEnv.name}$${cd.name}`;
  let classType = curEnv.nameToClass.get(cd.name);

  // allocate dispatch table
  classType.methodPtrs.forEach((offset, name) => {
    let funcGlobalName = `${globalName}#${name}`;
    wasms = wasms.concat(
      setMemory(
        classType.methodPtrsHead + classType.methodPtrs.get(name),
        globalMemory.functionNameToId.get(funcGlobalName)
      )
    )
  });

  let methodWASM: Array<string> = new Array();
  for (const method of cd.defs.funcDefs) {
    methodWASM = methodWASM.concat(codeGenMethodDef(method, classType.methods.get(method.name)));
  }
  return [wasms, methodWASM];
}

function codeGenProgram(p: Program): Array<Array<string>> {
  let varWASM: Array<string> = new Array();
  for (const varDef of p.defs.varDefs) {
    varWASM = varWASM.concat(codeGenVarDef(varDef));
  }

  let classWASM: Array<string> = new Array();
  let methodWASM: Array<string> = new Array();
  for (const classDef of p.defs.classDefs) {
    let [cwasm, mwasm] = codeGenClassDef(classDef);
    classWASM = classWASM.concat(cwasm);
    methodWASM = methodWASM.concat(mwasm);
  }

  let stmtsWASM: Array<string> = new Array();
  
  for (const stmt of p.stmts) {
    stmtsWASM = stmtsWASM.concat(
      codeGenStmt(stmt)
    )
  }

  return [varWASM, classWASM, methodWASM, stmtsWASM];
}

type CompileResult = {
  wasmSource: string,
  resultValue: Value,
};

function print(type: number, value: number) {
  console.log("Logging from WASM: ", type, ", ", value);
  const elt = document.createElement("pre");
  document.getElementById("output").appendChild(elt);
  let text = "";
  if (type === 1) {
    if (value === 0) {
      text = "False";
    } else {
      text = "True";
    }
  } else if (type === 2) {
    text = value.toString();
  } else {
    if (value === 0) {
      text = "None";
    } else {
      text = value.toString();
    }
    
  }
  elt.innerText = text;
  return value
}

// TODO:
// 1. Set SP for globalenv as itself
export function compile(source: string, importObject: any, gm: MemoryManager, em: EnvManager): CompileResult {
  globalMemory = gm;
  curEnv = em.getGlobalEnv();

  const ast = parse(source);
  console.log(ast);
  tcProgram(ast, gm, em);
  console.log(curEnv);

  importObject.js = {mem: globalMemory.memory}

  let memorySizeByte = importObject.js.mem.buffer.byteLength;
  // importObject.imports = {

  //   print_obj: (ptr: number) => {
  //     print(-1, ptr);
  //     return 0;
  //   },

  //   print_int: (ptr: number) => {
  //     print(2, ptr);
  //     return 0;
  //   },

  //   print_bool: (ptr: number) => {
  //     print(1, ptr);
  //     return 0;
  //   },
  // }

  importObject.imports = {

    print_obj: (ptr: number) => {
      importObject.output += ptr ? "clsname" : "None";
      importObject.output += "\n";
      return 0;
    },

    print_int: (ptr: number) => {
      importObject.output += ptr.toString();
      importObject.output += "\n";
      return 0;
    },

    print_bool: (ptr: number) => {
      importObject.output += ptr ? "True" : "False";;
      importObject.output += "\n";
      return 0;
    },
  }

  const wasms = codeGenProgram(ast);
  let returnType = "";
  let returnExpr = "";
  let scratchVar = "(local $$last i32)";
  let resultValue: Value;

  if (ast.stmts.length > 0) {
    if(ast.stmts[ast.stmts.length - 1].tag === "expr") {
      returnType = "(result i32)";
      returnExpr = "(local.get $$last)";
      let lastExpr = ast.stmts[ast.stmts.length - 1];
      if (!lastExpr.type) {
        resultValue = {tag: "none"};
      } else if (lastExpr.type.getName() === "int") {
        resultValue = {tag: "num", value: 0};
      } else if (lastExpr.type.getName() === "bool") {
        resultValue = {tag: "bool", value: false};
      } else {
        resultValue = {tag: "object", address: 0, name: lastExpr.type.getName()};
      }
    }
  }

  let initWASM: Array<string> = new Array();
  if (!globalMemory.initialized) {
    initWASM = initWASM.concat(
      updateRegisterWithOffset("HP", globalMemory.heapPtr),
      updateRegisterWithOffset("SP", memorySizeByte / 4 - 2),
      updateRegisterWithOffset("DL", memorySizeByte / 4 - 1),
      setPointerWithOffsetAndExpr("SP", 0, getPointer("SP")),
    );
    globalMemory.initialized = true;
  }

  globalMemory.functionSource += "\n" + wasms[2].join("\n");

  const wasmSource = `(module
    (import "js" "mem" (memory ${globalMemory.memorySize}))  ;; memory with one page(64KB)
    (func $print#int (import "imports" "print_int") (param i32) (result i32))
    (func $print#bool (import "imports" "print_bool") (param i32) (result i32))
    (func $print#object (import "imports" "print_obj") (param i32) (result i32))
    
    ;; function table
    (table ${globalMemory.functionSize} anyfunc)
    ${WASM_FUNC_TYPE_DEF}
    ${globalMemory.functionSource}
    (elem (i32.const 0) ${globalMemory.functionIdToName.join(" ")})

    (func (export "exported_func") ${returnType}
      ${scratchVar}
      ${initWASM.join("\n")}
      ;; class def
      ${wasms[1].join("\n")}
      ;; var def
      ${wasms[0].join("\n")}
      ;; stmts
      ${wasms[3].join("\n")}
      ${returnExpr}
    )
  )`;

  console.log(wasmSource);
  return {
    wasmSource,
    resultValue,
  };
}
