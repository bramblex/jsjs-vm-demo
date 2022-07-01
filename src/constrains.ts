/*
  二进制文件:
*/

// 操作码 8 位
export enum OpCode {
  // 空指令，占位用
  NOP = 0x00,

  // push 基本数据
  UNDEF = 0x01,
  NULL = 0x02,
  OBJ = 0x03,
  ARR = 0x04,
  TRUE = 0x05,
  FALSE = 0x06,

  NUM = 0x07, // 后面跟 64 位 double 数字字面量
  ADDR = 0x08,
  STR = 0x09, // 后面跟 16 位为一个字符长度 0x0000 表示结尾的字符串字面量

  // 基本栈操作
  POP = 0x0A,
  // SWP = 0x0B,
  // CLEAN = 0x0C,
  TOP = 0x0D,
  TOP2 = 0x0E,

  // 数据存储
  VAR = 0x10,
  LOAD = 0x11,
  OUT = 0x12,

  // 分支跳转
  JUMP = 0x20,
  JUMPIF = 0x21,
  JUMPNOT = 0x22,

  // 函数
  FUNC = 0x30,
  CALL = 0x31,
  NEW = 0x32,
  RET = 0x33,

  // 对象操作
  GET = 0x40,
  SET = 0x41,
  // KEYS = 0x42,
  IN = 0x43, // in
  DELETE = 0x44, // delete

  // 表运算
  EQ = 0x50, // ==
  NEQ = 0x51, // !=
  SEQ = 0x52, // ===
  SNEQ = 0x53, // !==
  LT = 0x54, // <
  LTE = 0x55, // <=
  GT = 0x56, // >
  GTE = 0x57,  // >=

  // 数学运算
  ADD = 0x60, // +
  SUB = 0x61, // -
  MUL = 0x62, // *
  EXP = 0x63, // **
  DIV = 0x64, // /
  MOD = 0x65, // %

  // 位运算
  BNOT = 0x70, // ~
  BOR = 0x71, // |
  BXOR = 0x72, // ^
  BAND = 0x73,// &
  LSHIFT = 0x73, // <<
  RSHIFT = 0x75, // >>
  URSHIFT = 0x76,// >>>

  // 逻辑运算
  OR = 0x80, // ||
  AND = 0x81, // &&
  NOT = 0x82, // !

  // 类型运算
  INSOF = 0x90, // instanceof
  TYPEOF = 0x91, // typeof
}