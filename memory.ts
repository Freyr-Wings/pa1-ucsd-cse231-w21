
export class MemoryManager {
  registerSize: number;
  heapPtr: number;

  dispatchTablesHead: number;
  dispatchTablePtr: number;
  updatedDispatchTablePtr: number;

  functionsHead: number;
  functionIdToName: Array<string>;
  functionNameToId: Map<string, number>;

  memorySize = 10;
  memory = new WebAssembly.Memory({ initial: this.memorySize, maximum: this.memorySize });

  functionSize = 1000;  // at most 1000 function

  initialized = false;
  functionSource = "";

  constructor(registerSize: number) {
    this.registerSize = registerSize;
    this.dispatchTablesHead = registerSize;
    this.dispatchTablePtr = registerSize;
    this.updatedDispatchTablePtr = registerSize;

    this.functionsHead = 2000;
    this.functionIdToName = new Array();
    this.functionNameToId = new Map();
    
    this.heapPtr = 3000;

    
  }

  collectFunc(globalName: string) {
    this.functionNameToId.set(globalName, this.functionIdToName.length);
    this.functionIdToName.push(globalName);
  }

  updateDispatchTablePtr(space: number) {
    this.dispatchTablePtr += space;
  }
}

export const globalMemory: MemoryManager = new MemoryManager(4);
// (window as any)["wasmMemory"] = new Int32Array(globalMemory.memory.buffer);









