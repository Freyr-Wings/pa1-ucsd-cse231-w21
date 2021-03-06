"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var wabt_1 = __importDefault(require("wabt"));
function mem() {
    return __awaiter(this, void 0, void 0, function () {
        var memory, importObject, wabtInterface, wasmSource, myModule, asBinary, wasmModule, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    memory = new WebAssembly.Memory({ initial: 1, maximum: 1 });
                    importObject = {
                        js: { mem: memory }
                    };
                    return [4 /*yield*/, wabt_1["default"]()];
                case 1:
                    wabtInterface = _a.sent();
                    wasmSource = "(module\n    (import \"js\" \"mem\" (memory 1))  ;; memory with one page(64KB)\n    (table 2 anyfunc)\n    (func $f0\n      i32.const 233\n      i32.const 23\n      i32.store\n    )\n    (func $f1\n      i32.const 233\n      i32.const 13\n      i32.store\n    )\n    (elem (i32.const 0) $f0 $f1)\n    (type $return_nothing (func))\n    (type $return_i32 (func (result i32)))\n    (func (export \"exported_func\") (result i32)\n      (block $B0\n        i32.const 1\n        i32.const 13\n        i32.store\n        br $B0\n      )\n      i32.const 1\n      i32.load\n    )\n  )";
                    myModule = wabtInterface.parseWat("test.wat", wasmSource);
                    asBinary = myModule.toBinary({});
                    return [4 /*yield*/, WebAssembly.instantiate(asBinary.buffer, importObject)];
                case 2:
                    wasmModule = _a.sent();
                    result = wasmModule.instance.exports.exported_func();
                    return [2 /*return*/, result];
            }
        });
    });
}
mem().then(function (r) {
    console.log(r);
});
// https://developer.mozilla.org/en-US/docs/WebAssembly/Understanding_the_text_format
// ./node_modules/.bin/tsc ./tools/wasm-memory.ts --esModuleInterop -outDir ./tools/
// node ./tools/wasm-memory.js
