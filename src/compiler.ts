import { Node, Program, Function, Expression, Statement, Identifier, Property, MemberExpression } from 'estree';
import { OpCode } from './constrains';
import { Parser } from "./parser";
import { VirtualMachine } from './virtual-machine';

export class UniqueId {
  private nextId = 1;
  clear() {
    this.nextId = 1;
  }
  get() {
    return (this.nextId++).toString(16);
  }
}

type AsmInst
  = { type: 'label', name: string }
  | { type: 'reference', label: string }
  | { type: 'opcode', opcode: OpCode, comment?: string }
  | { type: 'data', data: number[], rawData: string | number }
  | { type: 'comment', comment: string };

export class Compiler {
  private uniqueId: UniqueId = new UniqueId();
  private parser: Parser = new Parser(this.uniqueId);
  private instructions: AsmInst[] = [];
  private controlBlockStack: { continue?: string, break?: string }[] = [];

  // 初始化编译器
  private clear() {
    this.instructions = []
    this.uniqueId.clear();
    this.controlBlockStack = [];
  }

  // 创建 label
  createLabelName(name: string): string {
    return `.${name}_${this.uniqueId.get()}`;
  }

  // 基本输出
  private writeLabel(name: string) {
    this.instructions.push({ type: 'label', name });
  }

  private writeReference(name: string) {
    this.writeOp(OpCode.ADDR);
    this.instructions.push({ type: 'reference', label: name });
  }

  private writeOp(code: OpCode, comment?: string) {
    this.instructions.push({ type: 'opcode', opcode: code, comment });
  }

  private writeNumber(nu: number) {
    const inst: AsmInst = { type: 'data', rawData: nu, data: [] };
    const dv = new DataView(new ArrayBuffer(8));
    dv.setFloat64(0, nu);
    for (let i = 0; i < 8; i++) {
      inst.data.push(dv.getUint8(i));
    }
    this.writeOp(OpCode.NUM);
    this.instructions.push(inst);
  }

  private writeString(str: string) {
    const inst: AsmInst = { type: 'data', rawData: str, data: [] };
    const dv = new DataView(new ArrayBuffer(2));
    for (const c of str) {
      dv.setUint16(0, c.charCodeAt(0));
      inst.data.push(dv.getUint8(0));
      inst.data.push(dv.getUint8(1));
    }
    inst.data.push(0);
    inst.data.push(0);
    this.writeOp(OpCode.STR);
    this.instructions.push(inst);
  }

  private writeComment(comment: string) {
    this.instructions.push({ type: 'comment', comment });
  }

  private compileStatement(stat: Statement) {
    switch (stat.type) {
      case 'EmptyStatement':
      case 'DebuggerStatement': {
        break;
      }
      case 'BlockStatement': {
        for (const _stat of stat.body) {
          this.compileStatement(_stat);
        }
        break;
      }
      case 'BreakStatement': {
        for (let i = this.controlBlockStack.length - 1; i >= 0; i--) {
          const { break: breakLabel } = this.controlBlockStack[i];
          if (breakLabel) {
            this.writeReference(breakLabel);
            break;
          }
        }
        this.writeOp(OpCode.JUMP);
        break;
      }
      case 'ContinueStatement': {
        for (let i = this.controlBlockStack.length - 1; i >= 0; i--) {
          const { continue: breakLabel } = this.controlBlockStack[i];
          if (breakLabel) {
            this.writeReference(breakLabel);
            break;
          }
        }
        this.writeOp(OpCode.JUMP);
        break;
      }
      case 'IfStatement': {
        const endLabel = this.createLabelName('cond_end');
        const altLabel = this.createLabelName('cond_alt');

        const { test, consequent, alternate } = stat;

        this.compileExpression(test);
        this.writeReference(alternate ? altLabel : endLabel);
        this.writeOp(OpCode.JUMPNOT);
        this.compileStatement(consequent);

        if (alternate) {
          this.writeReference(endLabel);
          this.writeOp(OpCode.JUMP);
          this.writeLabel(altLabel);
          this.compileStatement(alternate);
        }

        this.writeLabel(endLabel);
        break;
      }

      case 'SwitchStatement': {
        const caseLabel = this.createLabelName('switch_case');
        const defaultLabel = this.createLabelName('switch_default');
        const endLabel = this.createLabelName('switch_end')

        this.controlBlockStack.push({ break: endLabel });

        const { discriminant, cases } = stat;
        this.compileExpression(discriminant);
        for (let i = 0; i < cases.length; i++) {
          const c = cases[i];
          if (c.test) {
            this.writeOp(OpCode.TOP);
            this.compileExpression(c.test);
            this.writeOp(OpCode.SEQ);
            this.writeReference(`${caseLabel}_${i}`);
            this.writeOp(OpCode.JUMPIF);
          } else {
            this.writeReference(defaultLabel);
            this.writeOp(OpCode.JUMP);
          }
        }
        for (let i = 0; i < cases.length; i++) {
          const c = cases[i];
          if (c.test) {
            this.writeLabel(`${caseLabel}_${i}`);
          } else {
            this.writeLabel(defaultLabel);
          }
          for (const _stat of c.consequent) {
            this.compileStatement(_stat)
          }
        }
        this.writeOp(OpCode.POP);
        this.writeLabel(endLabel);

        this.controlBlockStack.pop;
        break;
      }

      case 'WhileStatement': {
        const startLabel = this.createLabelName('while_start');
        const endLabel = this.createLabelName('while_end');
        this.controlBlockStack.push({ continue: startLabel, break: endLabel });
        this.writeLabel(startLabel);
        this.compileExpression(stat.test);
        this.writeReference(endLabel);
        this.writeOp(OpCode.JUMPNOT);
        this.compileStatement(stat.body);
        this.writeLabel(endLabel);
        this.controlBlockStack.pop();
        break;
      }

      case 'DoWhileStatement': {
        const startLabel = this.createLabelName('do_while_start');
        const testLabel = this.createLabelName('do_while_test');
        const endLabel = this.createLabelName('do_while_end');

        this.controlBlockStack.push({ continue: testLabel, break: endLabel });
        this.writeLabel(startLabel);
        this.compileStatement(stat.body);
        this.writeLabel(testLabel);
        this.compileExpression(stat.test);
        this.writeReference(startLabel);
        this.writeOp(OpCode.JUMPIF);
        this.writeLabel(endLabel);
        this.controlBlockStack.pop();
        break;
      }

      case 'ForStatement': {
        const startLabel = this.createLabelName('for_start')
        const updateLabel = this.createLabelName('for_update');
        const endLabel = this.createLabelName('for_end');
        this.controlBlockStack.push({ continue: updateLabel, break: endLabel });

        if (stat.init) {
          const init: Statement = /Expression$/.test(stat.init.type)
            ? { type: 'ExpressionStatement', expression: stat.init as Expression }
            : (stat.init as Statement)
          this.compileStatement(init);
        }

        this.writeLabel(startLabel);
        this.compileStatement(stat.body);
        this.writeLabel(updateLabel);

        if (stat.update) {
          this.compileStatement({
            type: 'ExpressionStatement',
            expression: stat.update
          });
        }

        if (stat.test) {
          this.compileExpression(stat.test)
          this.writeReference(startLabel);
          this.writeOp(OpCode.JUMPIF);
        } else {
          this.writeReference(startLabel);
          this.writeOp(OpCode.JUMP);
        }

        this.writeLabel(endLabel);
        this.controlBlockStack.pop();
        break;
      }

      // case 'ForInStatement': {
      //   break;
      // }

      case 'VariableDeclaration': {
        this.compileStatement({
          type: 'ExpressionStatement',
          expression: {
            type: 'SequenceExpression',
            expressions: stat.declarations.filter(v => v.init).map(v => ({
              type: 'AssignmentExpression',
              operator: '=',
              left: { type: 'Identifier', name: (v.id as Identifier).name },
              right: v.init as Expression
            }))
          },
        });
        break;
      }
      case 'FunctionDeclaration': {
        this.writeOp(OpCode.NULL);
        this.writeNumber(stat.params.length);
        this.writeReference(stat.label);
        this.writeOp(OpCode.FUNC);
        this.writeString((stat.id as Identifier).name);
        this.writeOp(OpCode.OUT);
        this.writeOp(OpCode.POP)
        break;
      }
      case 'ReturnStatement': {
        if (stat.argument) {
          this.compileExpression(stat.argument);
        } else {
          this.writeOp(OpCode.UNDEF);
        }
        this.writeOp(OpCode.RET);
        break;
      }
      case 'ExpressionStatement': {
        this.compileExpression(stat.expression);
        this.writeOp(OpCode.POP);
        break;
      }
      // case 'ThrowStatement': 
      // case 'TryStatement': 
      // case 'LabeledStatement': 
      default:
        throw new Error(`Unsupported statement type: ${stat.type}`);
    }
  }

  private compileMemberAndProperty(expr: MemberExpression) {
    this.compileExpression(expr.object as Expression);
    if (expr.computed) {
      this.compileExpression(expr.property as Expression);
    } else {
      this.writeString((expr.property as Identifier).name);
    }
  }

  private compileExpression(expr: Expression) {
    switch (expr.type) {
      case 'Identifier': {
        switch (expr.name) {
          case 'undefined': this.writeOp(OpCode.UNDEF); break;
          case 'null': this.writeOp(OpCode.NULL); break;
          default:
            this.writeString(expr.name);
            this.writeOp(OpCode.LOAD);
        }
        break;
      }
      case 'Literal': {
        if (expr.value === null) {
          this.writeOp(OpCode.NULL); break;
        } else if (typeof expr.value === 'number') {
          this.writeNumber(expr.value);
        } else if (typeof expr.value === 'string') {
          this.writeString(expr.value);
        } else if (typeof expr.value === 'boolean') {
          this.writeOp(expr.value ? OpCode.TRUE : OpCode.FALSE);
        } else {
          throw new Error(`Unsupported literal type: ${expr.value}`);
        }
        break;
      }
      case 'ThisExpression': {
        this.writeString('this');
        this.writeOp(OpCode.LOAD);
        break;
      }
      case 'ArrayExpression': {
        this.writeOp(OpCode.ARR);
        for (let i = 0; i < expr.elements.length; i++) {
          const element = expr.elements[i];
          this.writeOp(OpCode.TOP);
          this.writeNumber(i);
          if (element) {
            this.compileExpression(element as Expression);
          } else {
            this.writeOp(OpCode.NULL);
          }
          this.writeOp(OpCode.SET);
          this.writeOp(OpCode.POP);
        }
        break;
      }
      case 'ObjectExpression': {
        this.writeOp(OpCode.OBJ);
        for (const prop of expr.properties as Property[]) {
          this.writeOp(OpCode.TOP);
          if (prop.computed) {
            this.compileExpression(prop.key as Expression);
          } else {
            this.writeString((prop.key as Identifier).name);
          }
          this.compileExpression(prop.value as Expression);
          this.writeOp(OpCode.SET);
          this.writeOp(OpCode.POP);
        }
        break;
      }
      case 'UnaryExpression': {
        switch (expr.operator) {
          case '+':
            this.writeNumber(0);
            this.compileExpression(expr.argument);
            this.writeOp(OpCode.ADD); break;
          case '-':
            this.writeNumber(0);
            this.compileExpression(expr.argument);
            this.writeOp(OpCode.SUB);
            break;
          case '!':
            this.compileExpression(expr.argument);
            this.writeOp(OpCode.NOT);
            break;
          case '~':
            this.compileExpression(expr.argument);
            this.writeOp(OpCode.BNOT);
            break;
          case 'typeof':
            this.compileExpression(expr.argument);
            this.writeOp(OpCode.TYPEOF);
            break;
          case 'void':
            this.compileExpression(expr.argument);
            this.writeOp(OpCode.POP);
            this.writeOp(OpCode.UNDEF);
            break;
          case 'delete': {
            const { argument } = expr;
            if (argument.type === 'MemberExpression') {
              this.compileMemberAndProperty(argument);
              this.writeOp(OpCode.DELETE);
            } else {
              this.writeOp(OpCode.TRUE);
            }
            break;
          }
        }
        break;
      }
      case 'BinaryExpression': {
        this.compileExpression(expr.left);
        this.compileExpression(expr.right);
        switch (expr.operator) {
          case '==': this.writeOp(OpCode.EQ); break;
          case '!=': this.writeOp(OpCode.NEQ); break;
          case '===': this.writeOp(OpCode.SEQ); break;
          case '!==': this.writeOp(OpCode.SNEQ); break;
          case '<': this.writeOp(OpCode.LT); break;
          case '<=': this.writeOp(OpCode.LTE); break;
          case '>': this.writeOp(OpCode.GT); break;
          case '>=': this.writeOp(OpCode.GTE); break;
          case '<<': this.writeOp(OpCode.LSHIFT); break;
          case '>>': this.writeOp(OpCode.RSHIFT); break;
          case '>>>': this.writeOp(OpCode.URSHIFT); break;
          case '+': this.writeOp(OpCode.ADD); break;
          case '-': this.writeOp(OpCode.SUB); break;
          case '*': this.writeOp(OpCode.MUL); break;
          case '**': this.writeOp(OpCode.EXP); break;
          case '/': this.writeOp(OpCode.DIV); break;
          case '%': this.writeOp(OpCode.MOD); break;
          case '|': this.writeOp(OpCode.BOR); break;
          case '^': this.writeOp(OpCode.BXOR); break;
          case '&': this.writeOp(OpCode.BAND); break;
          case 'in': this.writeOp(OpCode.IN); break;
          case 'instanceof': this.writeOp(OpCode.INSOF); break;
        }
        break;
      }
      case 'UpdateExpression': {
        const { argument } = expr;
        let op: OpCode = expr.operator == '++' ? OpCode.ADD : OpCode.SUB;

        if (argument.type === 'Identifier') {
          this.compileExpression(argument);
          this.writeNumber(1);
          this.writeOp(op);
          this.writeString(argument.name);
          this.writeOp(OpCode.OUT);
        } else if (argument.type === 'MemberExpression') {
          this.compileMemberAndProperty(argument);
          this.writeOp(OpCode.TOP2);
          this.writeOp(OpCode.GET);
          this.writeNumber(1);
          this.writeOp(op);
          this.writeOp(OpCode.SET);
        }

        if (!expr.prefix) {
          this.writeNumber(0);
          this.writeOp(op === OpCode.ADD ? OpCode.SUB : OpCode.ADD);
        }
        break;
      }
      case 'AssignmentExpression': {
        const { left, right, operator } = expr;
        const op = {
          '=': OpCode.NOP,
          '+=': OpCode.ADD,
          '-=': OpCode.SUB,
          '*=': OpCode.MUL,
          '**=': OpCode.EXP,
          '/=': OpCode.DIV,
          '%=': OpCode.MOD,
          '<<=': OpCode.LSHIFT,
          '>>=': OpCode.RSHIFT,
          '>>>=': OpCode.URSHIFT,
          '|=': OpCode.BOR,
          '^=': OpCode.BXOR,
          '&=': OpCode.BAND,
        }[operator];

        if (left.type === 'Identifier') {
          this.compileExpression(right);
          if (operator === '=') {
            this.writeString(left.name);
            this.writeOp(OpCode.OUT);
          } else {
            this.compileExpression(left);
            this.writeOp(op);
            this.writeOp(OpCode.OUT);
          }
        } else if (left.type === 'MemberExpression') {
          this.compileMemberAndProperty(left);
          if (operator === '=') {
            this.compileExpression(right);
            this.writeOp(OpCode.SET);
          } else {
            this.writeOp(OpCode.TOP2);
            this.writeOp(OpCode.GET);
            this.compileExpression(right);
            this.writeOp(op);
            this.writeOp(OpCode.SET);
          }
        }
        break;
      }
      case 'LogicalExpression': {
        const label = this.createLabelName('logic_end');
        const { left, right, operator } = expr;
        this.compileExpression(left);
        this.writeOp(OpCode.TOP);
        this.writeReference(label);
        if (operator === '&&') {
          this.writeOp(OpCode.JUMPIF);
          this.compileExpression(right);
          this.writeOp(OpCode.AND);
        } else if (operator === '||') {
          this.writeOp(OpCode.JUMPNOT);
          this.compileExpression(right);
          this.writeOp(OpCode.OR);
        }
        this.writeLabel(label);
        break;
      }
      case 'MemberExpression': {
        this.compileMemberAndProperty(expr);
        this.writeOp(OpCode.GET);
        break;
      }
      case 'ConditionalExpression': {
        const endLabel = this.createLabelName('cond_end');
        const altLabel = this.createLabelName('cond_alt');
        const { test, consequent, alternate } = expr;
        this.compileExpression(test);
        this.writeLabel(altLabel);
        this.writeOp(OpCode.JUMPNOT);
        this.compileExpression(consequent);
        this.writeReference(endLabel);
        this.writeOp(OpCode.JUMP);
        this.writeLabel(altLabel);
        this.compileExpression(alternate);
        this.writeLabel(endLabel);
        break;
      }
      case 'CallExpression': {
        const { callee, arguments: args } = expr;
        if (callee.type === 'MemberExpression') {
          const { object, property, computed } = callee;
          this.compileExpression(object as Expression);
          this.writeOp(OpCode.TOP);
          if (computed) {
            this.compileExpression(property as Expression);
            this.writeOp(OpCode.GET);
          } else {
            this.writeString((property as Identifier).name);
            this.writeOp(OpCode.GET);
          }
        } else {
          this.writeOp(OpCode.NULL);
          this.compileExpression(callee as Expression);
        }
        this.compileExpression({
          type: 'ArrayExpression',
          elements: args as Expression[],
        });
        this.writeOp(OpCode.CALL);
        break;
      }
      case 'NewExpression': {
        const { callee, arguments: args } = expr;
        this.compileExpression(callee as Expression);
        this.compileExpression({
          type: 'ArrayExpression',
          elements: args as Expression[],
        });
        this.writeOp(OpCode.NEW);
        break;
      }
      case 'SequenceExpression': {
        for (let i = 0; i < expr.expressions.length; i++) {
          const expression = expr.expressions[i];
          this.compileExpression(expression);
          if (i < arguments.length - 1) {
            this.writeOp(OpCode.POP);
          }
        }
        break;
      }
      case 'FunctionExpression': {
        if (expr.id) {
          this.writeString(expr.id.name);
        } else {
          this.writeOp(OpCode.NULL);
        }
        this.writeNumber(expr.params.length);
        this.writeReference(expr.label);
        this.writeOp(OpCode.FUNC);
        break;
      }
      // case 'YieldExpression': 
      // case 'AwaitExpression': 
      default: {
        throw new Error(`Unsupported expression type: ${expr.type}`);
      }
    }
  }

  private compileBlock(block: Program | Function) {
    this.writeLabel(block.label);

    switch (block.type) {
      case 'Program': {

        for (const name of block.declarations) {
          this.writeString(name);
          this.writeOp(OpCode.VAR);
        }
        for (const stat of block.body) {
          this.compileStatement(stat as Statement);
        }
        this.writeOp(OpCode.RET);
        break;
      }
      case 'FunctionExpression':
      case 'FunctionDeclaration': {
        for (let i = 0; i < block.params.length; i++) {
          const id = block.params[i] as Identifier;
          // 声明参数
          this.writeString(id.name);
          this.writeOp(OpCode.VAR);
          // 初始化参数
          this.writeOp(OpCode.TOP);
          this.writeNumber(i);
          this.writeOp(OpCode.GET);
          this.writeString(id.name);
          this.writeOp(OpCode.OUT);
          this.writeOp(OpCode.POP);
        }
        this.writeOp(OpCode.POP);
        for (const name of block.declarations) {
          this.writeString(name);
          this.writeOp(OpCode.VAR);
        }
        this.compileStatement(block.body);
        this.writeOp(OpCode.UNDEF);
        this.writeOp(OpCode.RET);
        break;
      }
    }
  }

  compile(source: string) {
    this.clear();
    const blocks = this.parser.parse(source);

    this.compile

    for (const block of blocks) {
      this.compileBlock(block);
    }
  }

  show() {
    const lines: string[] = [];
    for (const inst of this.instructions) {
      switch (inst.type) {
        case 'label': {
          lines.push(`${inst.name}:`);
          break;
        }
        case 'reference': {
          lines.push(`\t${inst.label}`);
          break;
        }
        case 'opcode': {
          lines.push(`\t${OpCode[inst.opcode]}(${inst.opcode.toString(16).padStart(2, '0')})${inst.comment ? ` # ${inst.comment}` : ''}`);
          break;
        }
        case 'data': {
          lines.push(`\t${JSON.stringify(inst.rawData)} (${inst.data.map(d => d.toString(16).padStart(2, '0')).join(' ')})`);
          break;
        }
        case 'comment': {
          lines.push(`\t# ${inst.comment}`);
        }
      }
    }
    console.log(lines.join('\n'));
  }

  toNumberArray(): number[] {
    const labelMap = new Map<string, {
      address: number,
      references: number[]
    }>();
    const codes: number[] = [];

    for (const inst of this.instructions) {
      switch (inst.type) {
        case 'label': {
          const label = labelMap.get(inst.name) || { address: 0, references: [] };
          label.address = codes.length;
          labelMap.set(inst.name, label);
          break;
        }
        case 'reference': {
          const label = labelMap.get(inst.label) || { address: 0, references: [] };
          label.references.push(codes.length);
          codes.push(0, 0, 0, 0);
          labelMap.set(inst.label, label);
          break;
        }
        case 'opcode': {
          codes.push(inst.opcode);
          break;
        }
        case 'data': {
          codes.push(...inst.data);
        }
      }
    }

    for (const [name, { address, references }] of labelMap) {
      const dv = new DataView(new ArrayBuffer(4));
      dv.setUint32(0, address);
      for (const offset of references) {
        for (let i = 0; i < 4; i++) {
          codes[offset + i] = dv.getUint8(i);
        }
      }
    }

    return codes;
  }

  toArrayBuffer() {
    const codes = this.toNumberArray();
    const buffer = new ArrayBuffer(codes.length);
    const dv = new DataView(buffer);
    for (let i = 0; i < codes.length; i++) {
      dv.setUint8(i, codes[i]);
    }
    return buffer;
  }
}
