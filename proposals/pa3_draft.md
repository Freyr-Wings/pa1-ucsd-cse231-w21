# Q3
A description of any new AST forms you plan to add
# A3
No need to add new object types. But need to modify ClassDef type by adding a member that stores name of parent class.
# Q4
A description of any new functions, datatypes, and/or files added to the codebase
# A4
## In typechecker.ts
Add isSubClass() to support is operator
# Q5
 A description of any changes to existing functions, datatypes, and/or files in the codebase
# A5
## In parser.ts::traverseClassDef()

Add code that stores parent class name in ClassDef object.

## In compiler.ts::codeGenClassDef()
add code that calls super.\_\_init\_\_(), and add functions that is inherited from parent class.
# Q6
 A description of the value representation and memory layout for any new runtime values you will add
# A6
Using dispatch table to support polymorphism.