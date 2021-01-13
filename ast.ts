
export type Stmt =
  | { tag: "define", name: VarName, value: Expr }
  | { tag: "expr", expr: Expr }

export type Expr =
    { tag: "num", value: number }
  | { tag: "id", name: VarName }
  | { tag: "binaryop", expr1: Expr, expr2: Expr, op: Op}
  | { tag: "builtin1", name: Builtin1, arg: Expr }
  | { tag: "builtin2", name: Builtin2, arg1: Expr, arg2: Expr}

export type VarName = string
export type Op = string
export type Builtin1 = string
export type Builtin2 = string

