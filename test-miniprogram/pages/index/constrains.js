"use strict";
/*
  二进制文件:
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpCode = void 0;
// 操作码 8 位
var OpCode;
(function (OpCode) {
    // 空指令，占位用
    OpCode[OpCode["NOP"] = 0] = "NOP";
    // push 基本数据
    OpCode[OpCode["UNDEF"] = 1] = "UNDEF";
    OpCode[OpCode["NULL"] = 2] = "NULL";
    OpCode[OpCode["OBJ"] = 3] = "OBJ";
    OpCode[OpCode["ARR"] = 4] = "ARR";
    OpCode[OpCode["TRUE"] = 5] = "TRUE";
    OpCode[OpCode["FALSE"] = 6] = "FALSE";
    OpCode[OpCode["NUM"] = 7] = "NUM";
    OpCode[OpCode["ADDR"] = 8] = "ADDR";
    OpCode[OpCode["STR"] = 9] = "STR";
    // 基本栈操作
    OpCode[OpCode["POP"] = 10] = "POP";
    // SWP = 0x0B,
    // CLEAN = 0x0C,
    OpCode[OpCode["TOP"] = 13] = "TOP";
    OpCode[OpCode["TOP2"] = 14] = "TOP2";
    // 数据存储
    OpCode[OpCode["VAR"] = 16] = "VAR";
    OpCode[OpCode["LOAD"] = 17] = "LOAD";
    OpCode[OpCode["OUT"] = 18] = "OUT";
    // 分支跳转
    OpCode[OpCode["JUMP"] = 32] = "JUMP";
    OpCode[OpCode["JUMPIF"] = 33] = "JUMPIF";
    OpCode[OpCode["JUMPNOT"] = 34] = "JUMPNOT";
    // 函数
    OpCode[OpCode["FUNC"] = 48] = "FUNC";
    OpCode[OpCode["CALL"] = 49] = "CALL";
    OpCode[OpCode["NEW"] = 50] = "NEW";
    OpCode[OpCode["RET"] = 51] = "RET";
    // 对象操作
    OpCode[OpCode["GET"] = 64] = "GET";
    OpCode[OpCode["SET"] = 65] = "SET";
    // KEYS = 0x42,
    OpCode[OpCode["IN"] = 67] = "IN";
    OpCode[OpCode["DELETE"] = 68] = "DELETE";
    // 表运算
    OpCode[OpCode["EQ"] = 80] = "EQ";
    OpCode[OpCode["NEQ"] = 81] = "NEQ";
    OpCode[OpCode["SEQ"] = 82] = "SEQ";
    OpCode[OpCode["SNEQ"] = 83] = "SNEQ";
    OpCode[OpCode["LT"] = 84] = "LT";
    OpCode[OpCode["LTE"] = 85] = "LTE";
    OpCode[OpCode["GT"] = 86] = "GT";
    OpCode[OpCode["GTE"] = 87] = "GTE";
    // 数学运算
    OpCode[OpCode["ADD"] = 96] = "ADD";
    OpCode[OpCode["SUB"] = 97] = "SUB";
    OpCode[OpCode["MUL"] = 98] = "MUL";
    OpCode[OpCode["EXP"] = 99] = "EXP";
    OpCode[OpCode["DIV"] = 100] = "DIV";
    OpCode[OpCode["MOD"] = 101] = "MOD";
    // 位运算
    OpCode[OpCode["BNOT"] = 112] = "BNOT";
    OpCode[OpCode["BOR"] = 113] = "BOR";
    OpCode[OpCode["BXOR"] = 114] = "BXOR";
    OpCode[OpCode["BAND"] = 115] = "BAND";
    OpCode[OpCode["LSHIFT"] = 115] = "LSHIFT";
    OpCode[OpCode["RSHIFT"] = 117] = "RSHIFT";
    OpCode[OpCode["URSHIFT"] = 118] = "URSHIFT";
    // 逻辑运算
    OpCode[OpCode["OR"] = 128] = "OR";
    OpCode[OpCode["AND"] = 129] = "AND";
    OpCode[OpCode["NOT"] = 130] = "NOT";
    // 类型运算
    OpCode[OpCode["INSOF"] = 144] = "INSOF";
    OpCode[OpCode["TYPEOF"] = 145] = "TYPEOF";
})(OpCode = exports.OpCode || (exports.OpCode = {}));
//# sourceMappingURL=constrains.js.map