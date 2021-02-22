# PROJ

Here is an example of my memory:

```
0x00000  0
0x00004  stack pointer
0x00008  dynamic link pointer
0x00012  temp register 1
0x00016  temp register 2
...
0x00028  0 (idx of parent.func1)
0x0002c  1 (idx of parent.func2)
0x00030  0 (idx of child.func1(no overload))
0x00034  2 (idx of child.func2(overload))
...
0x9ffdc  local var 2 <- stack pointer
0x9ffe0  local var 1
0x9ffe4  static link
0x9ffe8  old dynamic link <- dynamic link pointer
0x9ffec  param2
0x9fff0  param1
0x9fff4  global var 2
0x9fff8  global var 1
0x9fffc  0
0xa0000  0
```

