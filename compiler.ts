import { wasm } from "webpack";
import { Expr, FuncBody, FuncDef, PreDef, Program, Stmt, TypedVar, VarDef, Type, Literal, VarName } from "./ast";
import { parse } from "./parser";
import { funcMap, classTypeMap, envMap, tcProgram, Variable, Env, tcExpr } from "./typechecker"

// https://learnxinyminutes.com/docs/wasm/

type CompileResult = {
  wasmSource: string,
};

let curEnv: Env;
let initialized = false;
let importedFunc: Set<string> = new Set(["print"]);
let funcSouce = "";

export function compile(source: string) : CompileResult {
  const ast = parse(source);
  console.log(ast);
  tcProgram(ast);
  curEnv = envMap.get("");
  console.log(curEnv);
  console.log(funcMap);
  console.log(classTypeMap);
  console.log(envMap);

  const MEMORY_SIZE = 10;  // * 64 KB

  const wasms = codeGenProgram(ast);
  let returnType = "";
  let returnExpr = "";
  let scratchVar = "(local $$last i32)";

  if (ast.stmts.length > 0) {
    if(ast.stmts[ast.stmts.length - 1].tag === "expr") {
      returnType = "(result i32)";
      returnExpr = "(local.get $$last)";
    }
  }

  let initWASM = "";
  if (!initialized) {
    initWASM = 
      updateGeneralPointerWithOffset("SP", -(MEMORY_SIZE * 64 * 1024 / 4 - 2)).join("\n") + "\n" +
      updateGeneralPointerWithOffset("DL", -(MEMORY_SIZE * 64 * 1024 / 4 - 1)).join("\n");
    initialized = true;
  }
    
  funcSouce += "\n" + wasms[1].join("\n");
  const wasmSource = `(module
    (import "js" "mem" (memory 10))  ;; memory with one page(64KB)
    (func $builtin_print (import "imports" "print") (param i32)(param i32) (result i32))
    ${funcSouce}
    (func (export "exported_func") ${returnType}
      ${scratchVar}
      ${initWASM}
      
      ${wasms[0].join("\n")}
      ${wasms[2].join("\n")}
      ${returnExpr}
    )
  )`;

  console.log(wasmSource);
  return {
    wasmSource,
  };
}


export const generalPointer: Map<string, number> = new Map([
  ["SP", 4],
  ["DL", 8],
]);

export const FUNC_RESERVED_WORD = 2;

export const binaryOpToWASM: Map<string,Array<string>> = new Map([
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
  ["and", ["(i32.add)"]],
  ["or", ["(i32.or)"]],
])

function updateGeneralPointerWithOffset(pName: string, numWords: number): Array<string> {
  return [
    `(i32.const ${generalPointer.get(pName)})`,
    `(i32.const ${generalPointer.get(pName)})`,
    `(i32.load)`,
    `(i32.const ${- numWords * 4})`,
    `(i32.add)`,
    `(i32.store)`,
  ];
}

function updateGeneralPointer(pName: string, value: Array<string>): Array<string> {
  let wasms: Array<string> = new Array();
  wasms = wasms.concat(
    [`(i32.const ${generalPointer.get(pName)})`],
    value,
    [`(i32.store)`],
  )
  return wasms;
}

function getPointerWithOffset(pointer: number, offset: number): Array<string> {
  return [
    `(i32.const ${pointer})`,
    `(i32.load)`,
    `(i32.const ${offset * 4})`,
    `(i32.add)`,
  ];
}

function funcCall(funcName: string): Array<string> {
  let wasms: Array<string> = new Array();
  wasms = wasms.concat(
    updateGeneralPointerWithOffset("SP", FUNC_RESERVED_WORD),
    [`call $${funcName}`]
  );
  return null;
}

function codeGenExpr(expr: Expr) : Array<string> {
  let wasms: Array<string> = new Array();

  switch(expr.tag) {
    case "literal": {
      return codeGenLiteral(expr.value);
    }
    case "id": {
      wasms = wasms.concat(getPointerWithOffset(generalPointer.get("DL"), -1));  // pointer to current SL 
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
        `(i32.const ${- (idInfo.offset - 1) * 4})`,
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
    case "call": {
      if (importedFunc.has(expr.name)) {
        let ft = funcMap.get("." + expr.name);
        let twasms: Array<string> = new Array();

        twasms = twasms.concat(
          codeGenTag(tcExpr(expr.args[0]).type.tag),
          // codeGenTag(ft.paramsType[0].tag),
          codeGenExpr(expr.args[0]),
        )
      
        twasms = twasms.concat(
          [`(call $builtin_${expr.name})`]
        )
        if (curEnv.name !== "") {
          twasms = twasms.concat(
            [`(drop)`]
          )
        }
        return twasms;
      }

      wasms = wasms.concat(
        updateGeneralPointerWithOffset("SP", (expr.args.length+1)*2),
      );
      
      let iterEnv = curEnv;
      let counter = 0;
      let funcGlobalName = "";
      while (iterEnv) {
        funcGlobalName = iterEnv.name + "." + expr.name;
        if (funcMap.has(funcGlobalName)) {
          break;
        }
        counter += 1;
        iterEnv = iterEnv.parent;
      }
      iterEnv = envMap.get(funcGlobalName);

      expr.args.forEach((arg, i) => {
        let varVal = iterEnv.nameToVar.get(iterEnv.paramsName[i]);
        wasms = wasms.concat(
          setPointerWithOffset(generalPointer.get("SP"), (i+1)*2, codeGenTag(varVal.type.tag)),
          setPointerWithOffset(generalPointer.get("SP"), (i+1)*2+1, codeGenExpr(arg))
        );
        varVal.offset = -4-2*i;
      });

      wasms = wasms.concat(
        updateGeneralPointerWithOffset("SP", FUNC_RESERVED_WORD),
      )

      // set SL
      let loadSL: Array<string> = new Array();
      loadSL = loadSL.concat(
        getPointerWithOffset(generalPointer.get("SP"), 0),
        getPointerWithOffset(generalPointer.get("DL"), -1),
      );
      for (let i = 0; i < counter; i++) {
        loadSL = loadSL.concat([`(i32.load)`]);
      }
      loadSL = loadSL.concat(
        [`(i32.store)`],
        // getPointerWithOffset(generalPointer.get("DL"), -1),
        // [`(i32.load)`]
      );

      wasms = wasms.concat(
        loadSL,
        setPointerWithOffset(generalPointer.get("SP"), 1, getPointerWithOffset(generalPointer.get("DL"), 0)),
        updateGeneralPointer("DL", getPointerWithOffset(generalPointer.get("SP"), 1)),
      )

      wasms = wasms.concat(
        [`call $${funcGlobalName}`],
        removeActiRec(),
        updateGeneralPointerWithOffset("SP", -(expr.args.length+1)*2),
      )

      // if (funcMap.get(funcGlobalName).returnType.name === "<None>") {
      //   wasms = wasms.concat([`i32.const 0`]);
      // }

      break;
    } 
  }
  return wasms;
}

function findVarPosition(name: string): Array<string> {
  let iterEnv = curEnv;
  let wasms: Array<string> = new Array();
  wasms = wasms.concat(
    getPointerWithOffset(generalPointer.get("DL"), -1),
  )
  while (!iterEnv.nameToVar.has(name)) {
    iterEnv = iterEnv.parent;
    wasms = wasms.concat([`i32.load`]);
  }
  wasms = wasms.concat(
    [`i32.const ${-(iterEnv.nameToVar.get(name).offset-1)*4}`],
    [`i32.add`]
  );
  return wasms;
}

function codeGenStmt(s: Stmt): Array<string> {
  let wasms: Array<string> = new Array();
  switch (s.tag) {
    case "assign": {
      wasms = wasms.concat(
        findVarPosition(s.name),
        codeGenExpr(s.value),
        [`(i32.store)`],
      );
      break;
    }
    case "expr": {
      wasms = wasms.concat(
        codeGenExpr(s.expr),
      );
      if (curEnv.name === "") {
        wasms = wasms.concat(
          [`(local.set $$last)`]
        )
      }
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

function codeGenTypedVar(tv: TypedVar): Array<string> {
  return null;
}

function codeGenLiteral(l: Literal): Array<string> {
  let wasms: Array<string> = new Array();
  if (l.tag === "True") {
    wasms = wasms.concat([
      `(i32.const 1)`,
    ])
  } else if (l.tag === "False") {
    wasms = wasms.concat([
      `(i32.const 0)`,
    ])
  } else if (l.tag === "None") {
    wasms = wasms.concat([
      `(i32.const 0)`,
    ])
  } else if (l.tag === "number") {
    wasms = wasms.concat([
      `(i32.const ${l.value})`,
    ])
  }
  return wasms;
}

function codeGenTag(tag: number): Array<string> {
  return [`(i32.const ${tag})`];
}

function setPointerWithPointer(position1: number, position2: number): Array<string> {
  return null;
}

function setPointerWithOffset(position: number, offset: number, value: Array<string>): Array<string> {
  let wasms: Array<string> = new Array();
  wasms = wasms.concat(
    [
      `(i32.const ${position})`,
      `(i32.load)`,
      `(i32.const ${offset * 4})`,
      `(i32.add)`,
    ],
    value,
    [`(i32.store)`]
  );
  return wasms;
}

function setPointerWithOffsetVariable(position: number, value: Variable): Array<string> {
  let wasms: Array<string> = new Array();
  wasms = wasms.concat(
    setPointerWithOffset(position, 0, codeGenTag(value.type.tag)),
    setPointerWithOffset(position, 1, codeGenLiteral(value.value))
  )
  return wasms;
}

function codeGenVarDef(vds: VarDef[]): Array<string> {
  let wasms: Array<string> = new Array();
  let idx = 0;
  if (curEnv.name === "") {
    idx = curEnv.nameToVar.size - vds.length;
  }
  vds.forEach((vd) => {
    let varVal = curEnv.nameToVar.get(vd.tvar.name);
    varVal.offset = 2 + idx*2;
    idx += 1;
    wasms = wasms.concat(
      updateGeneralPointerWithOffset("SP", varVal.type.size),
      setPointerWithOffsetVariable(generalPointer.get("SP"), varVal)
    );
  })

  return wasms;
}

function getVar(): Array<string> {
  let wasms: Array<string> = new Array();
  return wasms;
}

function codeFuncBody(fb: FuncBody): Array<string> {
  let wasms: Array<string> = new Array();
  return wasms;
}

function addActiRec(loadSL: Array<string>): Array<string> {
  let wasms: Array<string> = new Array();
  // sp += 2
  // m[sp] = sl (static link / access link)  // need find sl
  // m[sp+1] = m[dl] (dynamic link / control link)
  // sl, dl, return value, arg1, ..., argn]
  // low -> high
  wasms = wasms.concat(
    updateGeneralPointerWithOffset("SP", FUNC_RESERVED_WORD),
    setPointerWithOffset(generalPointer.get("SP"), 1, getPointerWithOffset(generalPointer.get("DL"), 0)),
    updateGeneralPointer("DL", getPointerWithOffset(generalPointer.get("SP"), 1)),
    setPointerWithOffset(generalPointer.get("SP"), 0, loadSL),
  )
  return wasms;
}

function removeActiRec(): Array<string> {
  let wasms: Array<string> = new Array();
  wasms = wasms.concat(
    updateGeneralPointer("DL", getPointerWithOffset(generalPointer.get("DL"), 0)),
    updateGeneralPointerWithOffset("SP", -FUNC_RESERVED_WORD),
  )
  return wasms;
}

function codeGenFuncDef(fds: FuncDef[]): Array<string> {
  let wasms: Array<string> = new Array();
  fds.forEach(fd => {
    let funcName = curEnv.name + "." + fd.name;
    curEnv = envMap.get(funcName);
    wasms = wasms.concat(
      [`(func $${funcName} (result i32)`],
      codeGenVarDef(fd.body.defs.varDefs),
    )
    fd.body.stmts.forEach(stmt => {
      wasms = wasms.concat(codeGenStmt(stmt));
    })
    wasms = wasms.concat(
      [`)`]
    );

    wasms = wasms.concat(codeGenFuncDef(fd.body.defs.funcDefs));
    curEnv = curEnv.parent;
  })

  return wasms;
}

function codeGenDefs(pd: PreDef): Array<Array<string>> {
  let wasms: Array<string> = new Array();
  return null;
}

// -1: pointer, 0: None, 1: int, 2: bool
function codeGenProgram(p: Program): Array<Array<string>> {
  
  let varWASM = codeGenVarDef(p.defs.varDefs);
  let funcWASM = codeGenFuncDef(p.defs.funcDefs);
  let stmtsWASM: Array<string> = new Array();
  
  p.stmts.forEach(stmt => {
    stmtsWASM = stmtsWASM.concat(
      codeGenStmt(stmt)
    )
  })

  return [varWASM, funcWASM, stmtsWASM];
}

