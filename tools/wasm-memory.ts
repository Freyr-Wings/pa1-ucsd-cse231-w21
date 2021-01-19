import wabt from 'wabt';

async function mem() {
    const memory = new WebAssembly.Memory({ initial: 1, maximum: 1 });
    const importObject = {
        js: { mem: memory },
    };

    const wabtInterface = await wabt();
    // const wasmSource = `(module
    //     (import "js" "mem" (memory 1))  ;; memory with one page(64KB)
    //     (func (export "exported_func") (result i32)
    //         i32.const 0
    //         i32.const 305419896
    //         i32.store  ;; store 0x12345678 at address 0
            
    //         i32.const 1
    //         i32.load  ;; load value 0x123456
    //     ))`;
    
    const wasmSource = `(module
        (import "js" "mem" (memory 1))  ;; memory with one page(64KB)
        (func (export "exported_func") (result i32)
            i32.const 65532
            i32.load  ;; i32 needs 4 bytes, > 65532 will cause error
        ))`;

    const myModule = wabtInterface.parseWat("test.wat", wasmSource);
    var asBinary = myModule.toBinary({});
    var wasmModule = await WebAssembly.instantiate(asBinary.buffer, importObject);
    const result = (wasmModule.instance.exports.exported_func as any)();
    return result;
}

mem().then((r) => {
    console.log(r);
})

// https://developer.mozilla.org/en-US/docs/WebAssembly/Understanding_the_text_format
// ./node_modules/.bin/tsc ./tools/wasm-memory.ts --esModuleInterop -outDir ./tools/
// node ./tools/wasm-memory.js