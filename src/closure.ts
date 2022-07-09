
export class Closure {
  private parent?: Closure;
  private offset: number = 0;
  private content: any[];

  constructor(size: number, parent?: Closure) {
    this.parent = parent;
    if (parent) {
      this.offset = parent.offset + parent.content.length;
    }
    this.content = Array.from({ length: size }).fill(undefined);
  }

  load(address: number): any {
    const index = address - this.offset;
    if (address > 0) {
      return this.content[index];
    } else if (this.parent) {
      return this.parent.load(address);
    }
    throw new Error(`address ${address} is out of range`);
  }

  out(address: number, value: any) {
    const index = address - this.offset;
    if (address > 0) {
      this.content[index] = value;
    } else if (this.parent) {
      this.parent.out(address, value);
    }
    throw new Error(`address ${address} is out of range`);
  }
}
