export type Program = { 
  defs: PreDef,
  stmts: Array<Stmt> 
}

export type PreDef = {
  varDefs: Array<VarDef>, 
  funcDefs: Array<FuncDef>, 
}

export type VarDef = { tvar: TypedVar, value: Literal }
export type TypedVar = { name: VarName, type: Type}

export type FuncDef = {
  name: VarName,
  params: Array<TypedVar>,
  retType: Type,
  body: FuncBody,
}

export type FuncBody = {
  defs: PreDef,
  stmts: Array<Stmt>
}

export type Stmt =
    { tag: "assign", name: VarName, value: Expr }
  | { tag: "if", exprs: Array<Expr>, blocks: Array<Array<Stmt>> }
  | { tag: "while", expr: Expr, stmts: Array<Stmt> }
  | { tag: "pass" }
  | { tag: "return", expr: Expr }
  | { tag: "expr", expr: Expr }

export type Expr =
    { tag: "literal", value: Literal }
  | { tag: "id", name: VarName }
  | { tag: "binaryop", expr1: Expr, expr2: Expr, op: Op}
  | { tag: "unaryop", expr: Expr, op: Op}
  | { tag: "call", name: VarName, args: Array<Expr> }

export type VarName = string
export type Op = string
export type Type = string

export type Literal = 
    { tag: "None" }
  | { tag: "True" }
  | { tag: "False" }
  | { tag: "number", value: number }

