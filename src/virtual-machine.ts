import { OpCode } from "./constrains";

export class Scope {
  private parent?: Scope;
  private content: Map<string, unknown> = new Map();

  constructor(parent?: Scope) {
    this.parent = parent;
  }

  var(name: string) {
    this.content.set(name, undefined);
  }

  load(name: string): unknown {
    if (this.content.has(name)) {
      return this.content.get(name);
    } else if (this.parent) {
      return this.parent.load(name);
    }
    throw new Error(`Variable ${name} not found`);
  }

  out(name: string, value: unknown): unknown {
    if (this.content.has(name)) {
      this.content.set(name, value);
      return value;
    } else if (this.parent) {
      return this.parent.out(name, value);
    }
    throw new Error(`Variable ${name} not found`);
  }
}

export class GlobalScope extends Scope {
  private global: any;
  constructor(global: any) {
    super()
    this.global = global;
  }

  load(name: string) {
    try { return super.load(name) } catch (e) { }
    if (this.global.hasOwnProperty(name)) {
      return this.global[name];
    }
    throw new Error(`Variable ${name} not found`);
  }

  out(name: string, value: unknown) {
    try { return super.out(name, value) } catch (e) { }
    this.global[name] = value;
  }
}

export class VirtualMachine {

  private scope: any;
  private codes: number[];
  private stack: unknown[];
  private pc: number;

  constructor(scope: any, codes: number[], pc: number = 0, stack: unknown[] = []) {
    this.scope = scope;
    this.codes = codes;
    this.pc = pc;
    this.stack = stack;
  }

  private loadAddress() {
    const dv = new DataView(new ArrayBuffer(8));
    for (let i = 0; i < 4; i++) {
      dv.setUint8(i, this.codes[this.pc + i]);
    }
    this.pc += 4;
    this.stack.push(dv.getUint32(0));
  }

  private loadNumber() {
    const dv = new DataView(new ArrayBuffer(8));
    for (let i = 0; i < 8; i++) {
      dv.setUint8(i, this.codes[this.pc + i]);
    }
    this.pc += 8;
    this.stack.push(dv.getFloat64(0));
  }

  private loadString() {
    const dv = new DataView(new ArrayBuffer(2));
    let str = '';
    for (let i = 0; true; i += 2) {
      dv.setUint16(0, this.codes[this.pc + i] << 8 | this.codes[this.pc + i + 1]);
      const charCode = dv.getUint16(0);
      if (charCode) {
        str += String.fromCharCode(charCode);
      } else {
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
        case OpCode.NOP: break;

        case OpCode.UNDEF: this.stack.push(undefined); break;
        case OpCode.NULL: this.stack.push(null); break;
        case OpCode.OBJ: this.stack.push({}); break;
        case OpCode.ARR: this.stack.push([]); break;
        case OpCode.TRUE: this.stack.push(true); break;
        case OpCode.FALSE: this.stack.push(false); break;

        case OpCode.NUM: this.loadNumber(); break;
        case OpCode.ADDR: this.loadAddress(); break;
        case OpCode.STR: this.loadString(); break;

        case OpCode.POP: this.stack.pop(); break;
        case OpCode.TOP: this.stack.push(this.stack[this.stack.length - 1]); break;
        case OpCode.TOP2: this.stack.push(
          this.stack[this.stack.length - 2],
          this.stack[this.stack.length - 1],
        ); break;

        case OpCode.VAR: this.scope.var(this.stack.pop()); break;
        case OpCode.LOAD: this.stack.push(this.scope.load(this.stack.pop())); break;
        case OpCode.OUT: this.stack.push(this.scope.out(this.stack.pop(), this.stack.pop())); break;

        case OpCode.JUMP: this.pc = this.stack.pop() as number; break;
        case OpCode.JUMPIF: {
          const addr = this.stack.pop();
          const test = this.stack.pop();
          if (test) { this.pc = addr as number };
          break;
        }
        case OpCode.JUMPNOT: {
          const addr = this.stack.pop();
          const test = this.stack.pop();
          if (!test) { this.pc = addr as number };
          break;
        }

        // 函数
        case OpCode.FUNC: {
          const addr = this.stack.pop();
          const len = this.stack.pop();
          const name = this.stack.pop();
          const _this = this;

          const func = function (this: any, ...args: unknown[]) {
            const scope = new Scope(_this.scope);
            scope.var('this');
            scope.out('this', this);
            if (name) {
              scope.var(name as string);
              scope.out(name as string, func);
            }
            const vm = new VirtualMachine(scope, _this.codes, addr as number, [args]);
            return vm.run();
          }

          Object.defineProperty(func, 'name', { value: name });
          Object.defineProperty(func, 'length', { value: len });

          this.stack.push(func);
          break;
        }
        case OpCode.CALL: {
          const args = this.stack.pop();
          const func = this.stack.pop() as Function;
          const _this = this.stack.pop();
          this.stack.push(func.apply(_this, args));
          break;
        }
        case OpCode.NEW: {
          const args = this.stack.pop() as unknown[];
          const func = this.stack.pop() as Function;
          this.stack.push(new (func.bind.apply(func, [null, ...args])));
          break;
        }
        case OpCode.RET: return this.stack.pop();

        case OpCode.GET: {
          const key = this.stack.pop() as string;
          const object = this.stack.pop() as any;
          this.stack.push(object[key])
          break;
        }
        case OpCode.SET: {
          const value = this.stack.pop();
          const key = this.stack.pop() as string;
          const object = this.stack.pop() as any;
          this.stack.push(object[key] = value)
          break;
        }
        case OpCode.IN: {
          const key = this.stack.pop() as string;
          const object = this.stack.pop() as any;
          this.stack.push(key in object);
          break;
        }
        case OpCode.DELETE: {
          const key = this.stack.pop() as string;
          const object = this.stack.pop() as any;
          this.stack.push(delete object[key]);
        }
        // 表运算
        case OpCode.EQ: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.stack.push(left == right);
          break;
        }
        case OpCode.NEQ: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.stack.push(left != right);
          break;
        }
        case OpCode.SEQ: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.stack.push(left === right);
          break;
        }
        case OpCode.SNEQ: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.stack.push(left !== right);
          break;
        }
        case OpCode.LT: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left < right);
          break;
        }
        case OpCode.LTE: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left <= right);
          break;
        }
        case OpCode.GT: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left > right);
          break;
        }
        case OpCode.GTE: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left >= right);
          break;
        }

        // 数学运算
        case OpCode.ADD: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left + right);
          break;
        }
        case OpCode.SUB: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left - right);
          break;
        }
        case OpCode.MUL: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left * right);
          break;
        }
        case OpCode.EXP: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left ** right);
          break;
        }
        case OpCode.DIV: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left / right);
          break;
        }
        case OpCode.MOD: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left % right);
          break;
        }

        // 位运算
        case OpCode.BNOT: {
          const arg = this.stack.pop() as any;
          this.stack.push(~arg);
          break;
        }
        case OpCode.BOR:{
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left | right);
          break;
        }
        case OpCode.BXOR:{
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left ^ right);
          break;
        }
        case OpCode.BAND:{
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left & right);
          break;
        }
        case OpCode.LSHIFT:{
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left << right);
          break;
        }
        case OpCode.RSHIFT:{
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left >> right);
          break;
        }
        case OpCode.URSHIFT:{
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left >>> right);
          break;
        }

        // 逻辑运算
        case OpCode.OR:{
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left || right);
          break;
        }
        case OpCode.AND:{
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left && right);
          break;
        }
        case OpCode.NOT:{
          const arg = this.stack.pop() as any;
          this.stack.push(!arg);
          break;
        }

        // 类型运算
        case OpCode.INSOF: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left instanceof right);
          break;
        }
        case OpCode.TYPEOF:{
          const arg = this.stack.pop() as any;
          this.stack.push(typeof arg);
          break;
        }

        default:
          throw new Error(`Unexpected code ${code.toString(16).padStart(2, '0')}`);
      }
    }
  }
}