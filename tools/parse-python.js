const { TreeCursor } = require('lezer');
const python = require('lezer-python');

const input = "def f(x:int)->int:\n  print(x)\n  return x\nx=233";
// const input = "z:object=None";

const tree = python.parser.parse(input);

const cursor = tree.cursor();
const space = "  ";

function preorder(cursor, indent) {
  console.log(
    space.repeat(indent) + "|-" +
    "[" + cursor.node.type.name + "]"
  );

  console.log(
    space.repeat(indent+1) + 
    input.substring(cursor.node.from, cursor.node.to).replace(/\n/g, "\n" + space.repeat(indent+1))
  );

  // log its children
  if (cursor.firstChild()) {
    do {
      preorder(cursor, indent+1);
    } while (cursor.nextSibling());
    cursor.parent();
  }
}

preorder(cursor, 0);


// do {
//   console.log(cursor.node.type.name);
//   console.log(input.substring(cursor.node.from, cursor.node.to));
// } while(cursor.next());

// node ./parse-python.js
