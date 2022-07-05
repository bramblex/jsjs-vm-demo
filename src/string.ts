
type char = number;

export function strToBuffer(str: string): char[] {
  const buffer: number[] = [];

  let i = 0;
  while (i < str.length) {

    // utf16 解码
    const wc = str.charCodeAt(i);
    let code = 0;

    if (wc < 0xD800 || wc > 0xDFFF) {
      code = wc; // 数值等于字符的Unicode编码
      i += 1;
    } else {
      const h = wc - 0xD800; // Unicode 低位
      const l = str.charCodeAt(i + 1) - 0xDC00; // Unicode 高位
      code = 0x10000 + (h << 10) + l // 组合
      i += 2;
    }

    // utf8 编码
    if (code < 0x80) {
      buffer.push(code); // ascii 字符
    } else if (code < 0x0800) {
      buffer.push(0b11000000 + (code >> 6));
      buffer.push(0b10000000 + (code & 0x3F));
    } else if (code < 0x00FFFF) {
      buffer.push(0b11100000 + (code >> 12));
      buffer.push(0b10000000 + ((code >> 6) & 0x3F));
      buffer.push(0b10000000 + (code & 0x3F));
    } else if (code < 0x10FFFF) {
      buffer.push(0b11110000 + (code >> 18));
      buffer.push(0b10000000 + ((code >> 12) & 0x3F));
      buffer.push(0b10000000 + ((code >> 6) & 0x3F));
      buffer.push(0b10000000 + (code & 0x3F));
    } else {
      throw new Error(`Unsupported character: ${code}`);
    }
  }

  return buffer;
}

export function bufferToStr(buffer: char[]): string {
  let str = '';
  let i = 0;
  while (i < buffer.length) {
    const b1 = buffer[i];
    const b2 = buffer[i + 1];
    const b3 = buffer[i + 2];
    const b4 = buffer[i + 3];

    // utf8 解码
    let code: number = 0;
    if (b1 >> 7 === 0) {
      code = b1;
      i += 1;
    } else if (b1 >> 5 === 0b110) {
      code = ((b1 & 0b11111) << 6) + (b2 & 0x3F);
      i += 2;
    } else if (b1 >> 4 === 0b1110) {
      code = ((b1 & 0b1111) << 12) + ((b2 & 0x3F) << 6) + (b3 & 0x3F);
      i += 3;
    } else if (b1 >> 3 === 0b11110) {
      code = ((b1 & 0b111) << 18) + ((b2 & 0x3F) << 12) + ((b3 & 0x3F) << 6) + (b4 & 0x3F);
      i += 4;
    } else {
      throw new Error(`Unsupported character: ${b1} ${b2} ${b3} ${b4}`);
    }

    // utf16 编码
    if (code < 0x10000) {
      str += String.fromCharCode(code); // 数值等于字符的Unicode编码
    } else {
      const lead = 0xD800 + ((code - 0x10000) >> 10) // utf16 lead 
      const trail = 0xDC00 + (code & 0x3FF); // utf16 trail
      str += String.fromCharCode(lead) + String.fromCharCode(trail);
    }
  }
  return str;
}