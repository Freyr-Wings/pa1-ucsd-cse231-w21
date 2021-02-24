{\rtf1\ansi\ansicpg936\cocoartf2513
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww10800\viewh8400\viewkind0
\pard\tx566\tx1133\tx1700\tx2267\tx2834\tx3401\tx3968\tx4535\tx5102\tx5669\tx6236\tx6803\pardirnatural\partightenfactor0

\f0\fs24 \cf0 \
# Q3\
A description of any new AST forms you plan to add\
\
  \
\
# A3\
No need to add new object types. But need to modify ClassDef type by adding a member that stores name of parent class.\
\
  \
\
# Q4\
A description of any new functions, datatypes, and/or files added to the codebase\
\
  \
\
# A4\
\
## In typechecker.ts\
\
add isSubClass() to support is operator\
\
  \
\
# Q5\
 A description of any changes to existing functions, datatypes, and/or files in the codebase\
\
  \
\
# A5\
\
## In parser.ts:\
\
\
### In traverseClassDef\
\
add code that stores parent class name in ClassDef object.\
\
  \
\
## In compiler.ts\
\
### In codeGenClassDef\
add code that calls super.\\_\\_init\\_\\_(), and add functions that is inherited from parent class.\
\
  \
\
# Q6\
 A description of the value representation and memory layout for any new runtime values you will add\
\
  \
\
# A6\
Those in PA2 is enough for class inheritance.}