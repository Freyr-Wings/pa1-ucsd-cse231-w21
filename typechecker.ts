import { Expr, FuncBody, FuncDef, PreDef, Program, Stmt, TypedVar, VarDef, Type, Literal, VarName } from "./ast";

export type FuncType = {
  name: string,
  paramsType: Array<ClassType>,
  returnType: ClassType,
};

export type Variable = {
  type: ClassType,
  value: Literal,
  offset: number,
}

export type Env = {
  name: string,
  parent: Env,
  nameToVar: Map<string, Variable>,
  paramsName: Array<string>
}

export const globalEnv: Env = {
  name: "",
  parent: null,
  nameToVar: new Map(),
  paramsName: new Array(),
}
export let curEnv: Env = globalEnv;
export const envMap: Map<string, Env> = new Map();
export const funcMap: Map<string, FuncType> = new Map();

export function findVarInEnv(name: string): Variable {
  let iterEnv = curEnv;
  while (iterEnv) {
    if (iterEnv.nameToVar.has(name)) {
      return iterEnv.nameToVar.get(name);
    }
    iterEnv = iterEnv.parent;
  }
  return null;
}

export type ClassType = {
  name: string,
  methods: Map<string, FuncType>,
  parent: ClassType,
  size: number,
  tag: number,
};

export function isDescendant(ancestor: ClassType, descendant: ClassType): boolean {
  let c = descendant;
  while (c) {
    if (c.name == ancestor.name) {
      return true;
    }
    c = c.parent;
  }
  return false;
}

export type TypedExpr = {
  expr: Expr,
  type: ClassType,
}

const binaryOpToMethod: Map<string,string> = new Map([
  ["+", "__add__"],
  ["-", "__sub__"],
  ["*", "__mul__"],
  ["//", "__divn__"],
  ["%", "__mod__"],
  ["==", "__eq__"],
  ["!=", "__neq__"],
  ["<=", "__le__"],
  [">=", "__ge__"],
  ["<", "__lt__"],
  [">", "__gt__"],
  ["is", "__is__"],
  ["and", "__and__"],
  ["or", "__or__"],
])

const unaryOpToMethod: Map<string,string> = new Map([
  ["-", "__neg__"],
  ["not", "__not__"],
])

export const classTypeMap = new Map<string, ClassType>();

export function typeMatching(t: Array<ClassType>, target: Array<ClassType>): boolean {
  if (t.length != target.length) {
    return false;
  }
  for (let i = 0; i < t.length; i++) {
    if (!isDescendant(target[i], t[i])) {
      return false;
    }
  }
  return true;
}

function initBuiltin() {
  envMap.set(curEnv.name, curEnv);

  let objType: ClassType = {
    name: "object",
    methods: new Map(),
    parent: null,
    size: 2,
    tag: -1,
  }

  let boolType: ClassType = {
    name: "bool",
    methods: new Map(),
    parent: objType,
    size: 2,
    tag: 1,
  }

  const boolOp: Array<FuncType> = [
    { name: "__eq__", paramsType: [boolType], returnType: boolType },
    { name: "__neq__", paramsType: [boolType], returnType: boolType },
    { name: "__and__", paramsType: [boolType], returnType: boolType },
    { name: "__or__", paramsType: [boolType], returnType: boolType },
    { name: "__not__", paramsType: [], returnType: boolType },
  ]

  boolOp.forEach(element => {
    boolType.methods.set(element.name, element);
  });


  let intType: ClassType = {
    name: "int",
    methods: new Map(),
    parent: objType,
    size: 2,
    tag: 2,
  }

  const intOp: Array<FuncType> = [
    { name: "__neg__", paramsType: [], returnType: intType },

    { name: "__add__", paramsType: [intType], returnType: intType },
    { name: "__sub__", paramsType: [intType], returnType: intType },
    { name: "__mul__", paramsType: [intType], returnType: intType },
    { name: "__divn__", paramsType: [intType], returnType: intType },
    { name: "__mod__", paramsType: [intType], returnType: intType },

    { name: "__eq__", paramsType: [intType], returnType: boolType },
    { name: "__neq__", paramsType: [intType], returnType: boolType },
    { name: "__le__", paramsType: [intType], returnType: boolType },
    { name: "__ge__", paramsType: [intType], returnType: boolType },
    { name: "__lt__", paramsType: [intType], returnType: boolType },
    { name: "__gt__", paramsType: [intType], returnType: boolType },
  ]

  intOp.forEach(element => {
    intType.methods.set(element.name, element);
  });

  let noneType: ClassType = {
    name: "<None>",
    methods: new Map(),
    parent: objType,
    size: 1,
    tag: 0,
  }

  const builtinFunc: Array<FuncType> = [
    { name: "print", paramsType: [objType], returnType: noneType },
  ]

  builtinFunc.forEach(element => {
    funcMap.set("." + element.name, element);
  });

  classTypeMap.set(objType.name, objType);
  classTypeMap.set(boolType.name, boolType);
  classTypeMap.set(intType.name, intType);
  classTypeMap.set(noneType.name, noneType);
}

// static type checker

export function tcExpr(e: Expr): TypedExpr {
  switch (e.tag) {
    case "literal": {
      let t = tcLiteral(e.value);
      return {
        expr: e,
        type: t,
      };
    }
    case "id": {
      let t = findVarInEnv(e.name);
      if (!t) {
        throw new Error("Variable not found: " + e.name);
      }
      return {
        expr: e,
        type: t.type,
      };
    }
    case "binaryop": {
      let t1 = tcExpr(e.expr1);
      let t2 = tcExpr(e.expr2);

      if (!binaryOpToMethod.has(e.op)) {
        throw new Error("Unknown binary operation '" + e.op + "'");
      }
      let method = binaryOpToMethod.get(e.op);
      if (!t1.type.methods.has(method)) {
        throw new Error("Unknown binary operation '" + e.op + "' for type " + t1.type.name);
      }
      if (!typeMatching(t1.type.methods.get(method).paramsType, [t2.type])) {
        let lstr = t1.type.name;
        for (const t of t1.type.methods.get(method).paramsType) {
          lstr += "," + t.name
        }
        throw new Error("Expect type [" + lstr + "]" 
        + ", get ["+ t1.type.name + "," + t2.type.name + "]");
      }
      return {
        expr: e,
        type: t1.type.methods.get(method).returnType
      };
    }
    case "unaryop": {
      let t = tcExpr(e.expr);
      if (!unaryOpToMethod.has(e.op)) {
        throw new Error("Unknown unary operation '" + e.op + "'");
      }
      let method = unaryOpToMethod.get(e.op);
      if (!t.type.methods.has(method)) {
        throw new Error("Unknown unary operation '" + e.op + "' for type " + t.type.name);
      }

      return {
        expr: e,
        type: t.type.methods.get(method).returnType
      };
    }
    
    case "call": {
      let funcName = e.name;

      let iterEnv = curEnv;
      let globalFuncName = "<unknown>";
      while (iterEnv) {
        globalFuncName = iterEnv.name + "." + funcName;
        if (funcMap.has(globalFuncName)) {
          break;
        }
        iterEnv = iterEnv.parent;
      }
      if (!iterEnv) {
        throw new Error("Unknown function " + funcName);
      }

      let ft = funcMap.get(globalFuncName);

      let exprTypes: Array<ClassType> = [];
      e.args.forEach(arg => {
        exprTypes.push(tcExpr(arg).type);
      })

      if (!typeMatching(exprTypes, ft.paramsType)) {
        throw new Error("Function params not match: " + funcName);
      }

      return {
        expr: e,
        type: ft.returnType
      };
    }
  }
}

export function tcStmt(s: Stmt) {
  switch (s.tag) {
    case "assign": {
      let te = tcExpr(s.value);
      return;
    }
    case "expr": {
      tcExpr(s.expr);
      return;
    }
    case "if": {
      s.exprs.forEach(element => {
        let t = tcExpr(element);
        if (t.type.name !== "bool") {
          throw new Error("Expect bool type, get type " + t.type.name);
        }
      });
      s.blocks.forEach(stmts => {
        stmts.forEach(stmt => {
          tcStmt(stmt);
        })
      })
      return;
    }
    case "pass": {
      return;
    }
    case "return": {
      let te = tcExpr(s.expr);
      let expectedType = funcMap.get(curEnv.name).returnType;
      if (expectedType.name != te.type.name) {
        throw new Error("Expect type " + expectedType.name + ", get type " + te.type.name);
      }
      
      return;
    }
    case "while": {
      let t = tcExpr(s.expr);
      if (t.type.name !== "bool") {
        throw new Error("Expect bool type, get type " + t.type.name);
      }

      return;
    }
  }
}

export function tcTypedVar(tv: TypedVar) {
}

export function tcLiteral(l: Literal): ClassType {
  switch(l.tag) {
    case "True":
    case "False": {
      return classTypeMap.get("bool");
    }
    case "None": {
      return classTypeMap.get("<None>");
    }
    case "number": {
      return classTypeMap.get("int");
    }
  }
}

export function tcVarDef(vd: VarDef) {
  if (curEnv.nameToVar.has(vd.tvar.name)) {
    throw new Error("Redeclared variable " + vd.tvar.name);
  }

  if (!classTypeMap.has(vd.tvar.type)) {
    throw new Error("Unknown type " + vd.tvar.type);
  }

  let tVar = classTypeMap.get(vd.tvar.type);
  let tVal = tcLiteral(vd.value);
  if (!isDescendant(tVar, tVal)) {
    throw new Error("Type not match for " + tVar.name + " and " + tVal.name);
  }
  
  curEnv.nameToVar.set(vd.tvar.name, {
    type: classTypeMap.get(vd.tvar.type),
    value: vd.value,
    offset: -1,
  })
}

export function tcAllPathReturn(block: Array<Stmt>): boolean {
  for (const stmt of block) {
    if (stmt.tag === "return") {
      return true;
    }
  }

  for (const stmt of block) {
    if (stmt.tag === "if" && stmt.blocks.length > stmt.exprs.length) {
      let returned = true;
      stmt.blocks.forEach(innerBlock => {
        if (!tcAllPathReturn(innerBlock)) {
          returned = false;
        }
      })
      if (returned) {
        return true;
      }
    }
  }

  return false;
}

export function tcFuncBody(fb: FuncBody) {
  fb.defs.funcDefs.forEach(funcDef => {
    loadFuncDef(funcDef);
  });
  tcDefs(fb.defs);
  fb.stmts.forEach(stmt => {
    tcStmt(stmt);
  });
}

export function loadFuncDef(fd: FuncDef) {
  let globalFuncName = curEnv.name + "." + fd.name;
  let newEnv: Env = {
    name: globalFuncName,
    parent: curEnv,
    nameToVar: new Map(),
    paramsName: new Array(),
  };
  let paramsType: Array<ClassType> = [];
  fd.params.forEach(param => {
    if (!classTypeMap.has(param.type)) {
      throw new Error("Unknown param type " + param.type);
    }
    let t = classTypeMap.get(param.type);
    newEnv.nameToVar.set(param.name, {
      type: t,
      value: {tag: "None"},
      offset: -1,
    })
    newEnv.paramsName.push(param.name);
    paramsType.push(t);
  })

  if (!classTypeMap.has(fd.retType)) {
    throw new Error("Unknown return type " + fd.retType);
  }
  envMap.set(globalFuncName, newEnv);

  funcMap.set(globalFuncName, {
    name: globalFuncName,
    paramsType: paramsType,
    returnType: classTypeMap.get(fd.retType),
  })
}

export function tcFuncDef(fd: FuncDef) {
  let globalFuncName = curEnv.name + "." + fd.name;
  curEnv = envMap.get(globalFuncName);
  tcFuncBody(fd.body);
  if (fd.retType !== "<None>") {
    if (!tcAllPathReturn(fd.body.stmts)) {
      throw new Error("All path in this method should have a return statement");
    }
  }
  curEnv = curEnv.parent;
}

export function tcDefs(pd: PreDef) {
  pd.varDefs.forEach(varDef => {
    tcVarDef(varDef);
  });
  pd.funcDefs.forEach(funcDef => {
    tcFuncDef(funcDef);
  })
}

export function tcProgram(p: Program) {
  if (!envMap.has("")) {
    initBuiltin();
  }
  for (const funcDef of p.defs.funcDefs) {
    loadFuncDef(funcDef);
  }
  tcDefs(p.defs);
  for (const stmt of p.stmts) {
    tcStmt(stmt);
  }
}

















