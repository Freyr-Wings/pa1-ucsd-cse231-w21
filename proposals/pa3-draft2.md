# Q1 10 Representative Example Programs

## 1.  Specified Constructor

```python
class animal(object):
    number: int = 1
    def __init__(self:animal, number:int):
        self.number = number
kit:cat = None
kit = cat(2)
print(kit.number)
```

The program is supposed to output 2 to represent it supports definition of specified constructor.

## 2.  Keyword "super"

```python
class animal(object):
    number: int = 1
        
class cat(animal):
    def __init__(self:cat, number: int):
    	super(animal, self)
        print("created a cat")
        
kit:cat = None
kit = cat()

```

The program is supposed to output "created a cat" to represent it supports keyword "super".

## 3.  Attributes of Base Class

```python
class animal(object):
    number: int = 1
        
class cat(animal):
    pass
        
kit:cat = None
kit = cat()
print(kit.number)
```

The program is supposed to output 1 to represent it supports definition of attributes of base class.

## 4.  Attributes of Derived Class

```python
class animal(object):
    number: int = 1
        
class cat(animal):
    eatFish: bool = True
        
kit:cat = None
kit = cat()
print(kit.eatFish)
```

The program is supposed to output True to represent it supports definition of attributes of derived class.

## 5.  Methods of Base Class

```python
class animal(object):
    def run(self:animal):
        print(1)
        
class cat(animal):
    pass
        
kit:cat = None
kit = cat()
kit.run()
```

The program is supposed to output 1 to represent it supports definition of methods of base class.

## 6.  Methods of Derived Class

```python
class animal(object):
    pass
        
class cat(animal):
    def run(self:cat):
        print(1)
        
kit:cat = None
kit = cat()
kit.run()
```

The program is supposed to output 1 to represent it supports definition of methods of derived class.

## 7.  ClassType Inference

```python
class animal(object):
    number:int = 1
        
class cat(animal):
    def run(self):
        print(self.number)
        
kit:cat = None
kit = cat()
kit.run()
```

The program is supposed to output 1 to represent it supports classtype inference of keyword self inside definition of methods.

## 8.  Re-defined Methods

```python
class animal(object):
    def run(self:animal):
        print(1)
        
class cat(animal):
    def run(self:cat):
        print(2)
        
kit:cat = None
kit = cat()
kit.run()
```

The program is supposed to output 2 to represent it supports re-definition of methods in derived class.

## 9.  Polymorphism

```python
class animal(object):
    def run(self:animal):
        pass
        
class cat(animal):
    def run(self:cat):
        print(2)
class dog(animal):
    def run(self:dog):
        print(1)
def f(pet:animal):
    pet.run()

bob:dog = None
kit:cat = None
bob = dog()
kit = cat()
f(kit)
f(bob)
```

The program is supposed to output 2\n1 to represent it supports polymorphism.

## 10.  Multi Inheritance

```python
class animal(object):
    number: int = 1

class b(object):
    e: int = 2

class cat(animal, b):
    pass
        
kit:cat = None
kit = cat()
print(kit.number+kit.e)
```

The program is supposed to output 3 to represent it supports multi-inheritance.

# Q2 A description of how you will add tests for your feature

Firstly, we add some basic tests to certify our program correctly supports attributes and methods in both base and derived classes. We can compare the output and memory space with expected answer to check if our program works properly. Secondly, we add some tests to demonstrate our program is able to handle some advanced functions such as specified constructors, polymorphism. We still check the memory space to guarantee correctness. Finally, if time permits. we implement some extended functions like multi inheritance and use extra examples to test them.

# Q9 A milestone plan for March 4 

By March 4, we hope we have accomplished the basic parts necessary to function inheritance and our program is supposed to work properly on example 3,4,5,6.