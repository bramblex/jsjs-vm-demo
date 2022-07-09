// index.js
// 获取应用实例
const { Scope, GlobalScope, VirtualMachine } = require('./virtual-machine');
const app = getApp()

Page({
  data: {
    motto: 'Hello World',
  },
  onReady() {
    const page = this;
    wx.downloadFile({
      url: 'http://localhost:9080/target.png',
      success({ tempFilePath }) {
        var ctx = wx.createCanvasContext('myCanvas');

        const width = 319;
        const height = 205;

        ctx.drawImage(tempFilePath, 0, 0, width, height);
        ctx.draw(false, () => {
          wx.canvasGetImageData({
            canvasId: 'myCanvas',
            x: 0,
            y: 0,
            width,
            height,
            success: (res) => {
              const targetBuffer = res.data;
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
              const globalScope = new GlobalScope({
                console,
                Math,
                page,
                wx,
              });
              const vm = new VirtualMachine(globalScope, targetCodes);
              vm.run()
            },
            fail: (res) => {
              debugger;
            }
          }, page);
        });


      }
    })
  }
});
