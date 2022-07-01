import * as fs from 'fs';
import * as path from 'path';
import * as Jimp from 'jimp';
import { chunk } from 'lodash';

import { Compiler } from './compiler';
import { GlobalScope, VirtualMachine } from './virtual-machine';

async function __main__() {

  const compiler = new Compiler();

  const testCode = fs.readFileSync(path.join(__dirname, '../test-code.js'), 'utf8');
  compiler.compile(testCode);

  const codes = compiler.toNumberArray();
  compiler.show();

  // const globalScope = new GlobalScope(global);
  // const vm = new VirtualMachine(globalScope, codes);
  // vm.run()

  const image = await Jimp.read('./origin.jpg');
  const buffer = image.bitmap.data;

  const highBit = 0xFF;
  const lowBit = 0xF0;

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i].toString(2).padStart(8, '0').split('').map(x => x === '1' ? highBit : lowBit);
    const offset = i * 8 * 4;

    for (let i = 0; i < code.length; i++) {
      const bit = code[i];
      const bitIndex = offset + (i * 4) + 3;
      buffer[bitIndex] = bit;
    }
  }

  await image.quality(100).writeAsync('./target.png');

  const targetImage = await Jimp.read('./target.png');
  const targetBuffer = targetImage.bitmap.data;
  const targetCodes = [];

  for (let i = 0; i < targetBuffer.length; i += 32) {
    const offset = i;

    let byte = 0;
    for (let j = 0; j < 8; j++) {
      const bitIndex = offset + (j * 4) + 3;
      const bit = targetBuffer[bitIndex] > 0xf8 ? 1 : 0;
      byte = byte << 1;
      byte = byte | bit;
    }
    targetCodes.push(byte);
  }
  console.log(targetCodes);

  for (let i = 0; i < codes.length; i++) {
    if (codes[i] !== targetCodes[i]) {
      debugger;
    }
  }

  // for (let i = 0; i < 1e3; i = i + 4) {
  //   console.log([0, 1, 2, 3].map(n => targetBuffer[i + n].toString(16).padStart(2, '0')));
  //   debugger;
  // }

  // const width = Math.ceil(Math.sqrt(codes.length / 3));
  // new Jimp(width, width, 0x000000ff, (err, img) => {
  //   const buffer = img.bitmap.data;
  //   const bitmap = chunk(codes, 3);

  //   for (let i = 0; i < bitmap.length; i++) {
  //     let offset = i * 4;
  //     const [r, g, b] = bitmap[i];
  //     buffer[offset] = r || 0
  //     buffer[offset + 1] = g || 0
  //     buffer[offset + 2] = b || 0
  //   }

  //   img.quality(100).quality(100).write('codes.png');
  // })

  // const buffer = compiler.toArrayBuffer();
  // fs.writeFileSync(path.join(__dirname, '../codes.bin'), new DataView(buffer));
}

__main__()
