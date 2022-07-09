"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualMachine = exports.GlobalScope = exports.Scope = void 0;
const constrains_1 = require("./constrains");
class Scope {
    parent;
    content = new Map();
    constructor(parent) {
        this.parent = parent;
    }
    var(name) {
        this.content.set(name, undefined);
    }
    load(name) {
        if (this.content.has(name)) {
            return this.content.get(name);
        }
        else if (this.parent) {
            return this.parent.load(name);
        }
        throw new Error(`Variable ${name} not found`);
    }
    out(name, value) {
        if (this.content.has(name)) {
            this.content.set(name, value);
            return value;
        }
        else if (this.parent) {
            return this.parent.out(name, value);
        }
        throw new Error(`Variable ${name} not found`);
    }
}
exports.Scope = Scope;
class GlobalScope extends Scope {
    global;
    constructor(global) {
        super();
        this.global = global;
    }
    load(name) {
        try {
            return super.load(name);
        }
        catch (e) { }
        if (this.global.hasOwnProperty(name)) {
            return this.global[name];
        }
        throw new Error(`Variable ${name} not found`);
    }
    out(name, value) {
        try {
            return super.out(name, value);
        }
        catch (e) { }
        this.global[name] = value;
    }
}
exports.GlobalScope = GlobalScope;
class VirtualMachine {
    scope;
    codes;
    stack;
    pc;
    constructor(scope, codes, pc = 0, stack = []) {
        this.scope = scope;
        this.codes = codes;
        this.pc = pc;
        this.stack = stack;
    }
    loadAddress() {
        const dv = new DataView(new ArrayBuffer(8));
        for (let i = 0; i < 4; i++) {
            dv.setUint8(i, this.codes[this.pc + i]);
        }
        this.pc += 4;
        this.stack.push(dv.getUint32(0));
    }
    loadNumber() {
        const dv = new DataView(new ArrayBuffer(8));
        for (let i = 0; i < 8; i++) {
            dv.setUint8(i, this.codes[this.pc + i]);
        }
        this.pc += 8;
        this.stack.push(dv.getFloat64(0));
    }
    loadString() {
        const dv = new DataView(new ArrayBuffer(2));
        let str = '';
        for (let i = 0; true; i += 2) {
            dv.setUint16(0, this.codes[this.pc + i] << 8 | this.codes[this.pc + i + 1]);
            const charCode = dv.getUint16(0);
            if (charCode) {
                str += String.fromCharCode(charCode);
            }
            else {
                this.pc = this.pc + i + 2;
                this.stack.push(str);
                return;
            }
        }
    }
    run() {
        while (true) {
            const code = this.codes[this.pc++];
            switch (code) {
                case constrains_1.OpCode.NOP: break;
                case constrains_1.OpCode.UNDEF:
                    this.stack.push(undefined);
                    break;
                case constrains_1.OpCode.NULL:
                    this.stack.push(null);
                    break;
                case constrains_1.OpCode.OBJ:
                    this.stack.push({});
                    break;
                case constrains_1.OpCode.ARR:
                    this.stack.push([]);
                    break;
                case constrains_1.OpCode.TRUE:
                    this.stack.push(true);
                    break;
                case constrains_1.OpCode.FALSE:
                    this.stack.push(false);
                    break;
                case constrains_1.OpCode.NUM:
                    this.loadNumber();
                    break;
                case constrains_1.OpCode.ADDR:
                    this.loadAddress();
                    break;
                case constrains_1.OpCode.STR:
                    this.loadString();
                    break;
                case constrains_1.OpCode.POP:
                    this.stack.pop();
                    break;
                case constrains_1.OpCode.TOP:
                    this.stack.push(this.stack[this.stack.length - 1]);
                    break;
                case constrains_1.OpCode.TOP2:
                    this.stack.push(this.stack[this.stack.length - 2], this.stack[this.stack.length - 1]);
                    break;
                case constrains_1.OpCode.VAR:
                    this.scope.var(this.stack.pop());
                    break;
                case constrains_1.OpCode.LOAD:
                    this.stack.push(this.scope.load(this.stack.pop()));
                    break;
                case constrains_1.OpCode.OUT:
                    this.stack.push(this.scope.out(this.stack.pop(), this.stack.pop()));
                    break;
                case constrains_1.OpCode.JUMP:
                    this.pc = this.stack.pop();
                    break;
                case constrains_1.OpCode.JUMPIF: {
                    const addr = this.stack.pop();
                    const test = this.stack.pop();
                    if (test) {
                        this.pc = addr;
                    }
                    ;
                    break;
                }
                case constrains_1.OpCode.JUMPNOT: {
                    const addr = this.stack.pop();
                    const test = this.stack.pop();
                    if (!test) {
                        this.pc = addr;
                    }
                    ;
                    break;
                }
                // 函数
                case constrains_1.OpCode.FUNC: {
                    const addr = this.stack.pop();
                    const len = this.stack.pop();
                    const name = this.stack.pop();
                    const _this = this;
                    const func = function (...args) {
                        const scope = new Scope(_this.scope);
                        scope.var('this');
                        scope.out('this', this);
                        if (name) {
                            scope.var(name);
                            scope.out(name, func);
                        }
                        const vm = new VirtualMachine(scope, _this.codes, addr, [args]);
                        return vm.run();
                    };
                    Object.defineProperty(func, 'name', { value: name });
                    Object.defineProperty(func, 'length', { value: len });
                    this.stack.push(func);
                    break;
                }
                case constrains_1.OpCode.CALL: {
                    const args = this.stack.pop();
                    const func = this.stack.pop();
                    const _this = this.stack.pop();
                    this.stack.push(func.apply(_this, args));
                    break;
                }
                case constrains_1.OpCode.NEW: {
                    const args = this.stack.pop();
                    const func = this.stack.pop();
                    this.stack.push(new (func.bind.apply(func, [null, ...args])));
                    break;
                }
                case constrains_1.OpCode.RET: return this.stack.pop();
                case constrains_1.OpCode.GET: {
                    const key = this.stack.pop();
                    const object = this.stack.pop();
                    this.stack.push(object[key]);
                    break;
                }
                case constrains_1.OpCode.SET: {
                    const value = this.stack.pop();
                    const key = this.stack.pop();
                    const object = this.stack.pop();
                    this.stack.push(object[key] = value);
                    break;
                }
                case constrains_1.OpCode.IN: {
                    const key = this.stack.pop();
                    const object = this.stack.pop();
                    this.stack.push(key in object);
                    break;
                }
                case constrains_1.OpCode.DELETE: {
                    const key = this.stack.pop();
                    const object = this.stack.pop();
                    this.stack.push(delete object[key]);
                }
                // 表运算
                case constrains_1.OpCode.EQ: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left == right);
                    break;
                }
                case constrains_1.OpCode.NEQ: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left != right);
                    break;
                }
                case constrains_1.OpCode.SEQ: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left === right);
                    break;
                }
                case constrains_1.OpCode.SNEQ: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left !== right);
                    break;
                }
                case constrains_1.OpCode.LT: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left < right);
                    break;
                }
                case constrains_1.OpCode.LTE: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left <= right);
                    break;
                }
                case constrains_1.OpCode.GT: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left > right);
                    break;
                }
                case constrains_1.OpCode.GTE: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left >= right);
                    break;
                }
                // 数学运算
                case constrains_1.OpCode.ADD: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left + right);
                    break;
                }
                case constrains_1.OpCode.SUB: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left - right);
                    break;
                }
                case constrains_1.OpCode.MUL: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left * right);
                    break;
                }
                case constrains_1.OpCode.EXP: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left ** right);
                    break;
                }
                case constrains_1.OpCode.DIV: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left / right);
                    break;
                }
                case constrains_1.OpCode.MOD: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left % right);
                    break;
                }
                // 位运算
                case constrains_1.OpCode.BNOT: {
                    const arg = this.stack.pop();
                    this.stack.push(~arg);
                    break;
                }
                case constrains_1.OpCode.BOR: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left | right);
                    break;
                }
                case constrains_1.OpCode.BXOR: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left ^ right);
                    break;
                }
                case constrains_1.OpCode.BAND: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left & right);
                    break;
                }
                case constrains_1.OpCode.LSHIFT: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left << right);
                    break;
                }
                case constrains_1.OpCode.RSHIFT: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left >> right);
                    break;
                }
                case constrains_1.OpCode.URSHIFT: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left >>> right);
                    break;
                }
                // 逻辑运算
                case constrains_1.OpCode.OR: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left || right);
                    break;
                }
                case constrains_1.OpCode.AND: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left && right);
                    break;
                }
                case constrains_1.OpCode.NOT: {
                    const arg = this.stack.pop();
                    this.stack.push(!arg);
                    break;
                }
                // 类型运算
                case constrains_1.OpCode.INSOF: {
                    const right = this.stack.pop();
                    const left = this.stack.pop();
                    this.stack.push(left instanceof right);
                    break;
                }
                case constrains_1.OpCode.TYPEOF: {
                    const arg = this.stack.pop();
                    this.stack.push(typeof arg);
                    break;
                }
                default:
                    throw new Error(`Unexpected code ${code.toString(16).padStart(2, '0')}`);
            }
        }
    }
}
exports.VirtualMachine = VirtualMachine;
//# sourceMappingURL=virtual-machine.js.map