/*
  二进制文件:
*/

// 操作码 8 位
export enum OpCode {
  // 0x00 ~ 0x7F  立即数，直接向栈里面压入 UINT8 数据
  NOP = 0x80, // 空指令，占位用

  // push 基本数据类型
  UNDEF,
  NULL,
  OBJ,
  ARR,
  TRUE,
  FALSE,

  // 字面量
  UINT8,
  UINT16,
  UINT32,
  INT8,
  INT16,
  INT32,
  FLOAT16,
  FLOAT32,
  STR, // 跟 utf8 字符串 \0 结尾

  // 弹出栈操作
  POP,
  TOP,
  TOP2, // 主要是各种对象操作用起来方便

  // 变量和字面量存储和读取 (存储在栈低在栈低)
  INIT,
  LOAD,
  OUT,

  // 闭包内读取变量存储和读取
  CINIT,
  CLOAD,
  COUT,

  // 分支跳转
  JUMP,
  JUMPIF,
  JUMPNOT,

  // 错误处理
  TRY,
  ENDTRY,
  THROW,

  // 函数
  FUNC,
  CALL,
  NEW,
  RET,

  // 对象操作
  GET,
  SET,
  KEYS,
  IN, // in
  DELETE, // delete

  // 表运算
  EQ, // ==
  NEQ, // !=
  SEQ, // ===
  SNEQ, // !==
  LT, // <
  LTE, // <=
  GT, // >
  GTE,  // >=

  // 数学运算
  ADD, // +
  SUB, // -
  MUL, // *
  EXP, // **
  DIV, // /
  MOD, // %

  // 位运算
  BNOT, // ~
  BOR, // |
  BXOR, // ^
  BAND,// &
  LSHIFT, // <<
  RSHIFT, // >>
  URSHIFT,// >>>

  // 逻辑运算
  OR, // ||
  AND, // &&
  NOT, // !

  // 类型运算
  INSOF, // instanceof
  TYPEOF, // typeof
}