1. Give three examples of Python programs that use binary operators and/or builtins from this PA, but have different behavior than your compiler. For each, write:
a sentence about why that is
a sentence about what you might do to extend the compiler to support it
(1) print(1,2,3,4), `print` can accept parameters with variable length because it supports iterative inputs. To support this, we can pass a pointer to a list of parameters to this function.
(2) pow(1, 1.1), `pow` can accept integer and float as parameters and return float value because it supports type casting. We can also write builtin type casting functions to support this.
(3) max(Node1, Node2), `max` can accept any type input as long as it implements `__gt__` function because of its polymorphism. We can generalize this function to support any class that have implemented certain function like `__gt__` and call this function inside the `max` function. 

Approximately how many hours did it take you to complete the assignment? What parts took the longest?
6 hours. The parts of the TreeCursor generated from lezer.

What advice would you give yourself if you were to start the assignment from the beginning?
Go over the example codes in the lecture, and understand how the starter code works here.

What resources did you find most helpful in completing the assignment?
Some lecture scripts like "parse-python.js".

Who (if anyone) in the class did you work with on the assignment?
I did the work individually.
