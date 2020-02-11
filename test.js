const ID3Writer = require('browser-id3-writer');
const fs = require('fs');
const iconv = require('iconv-lite');
const base64 = require('base64-arraybuffer');
const NodeID3 = require('node-id3')

const myId3 = require('./lib/ID3Encoder');

var buffer = new ArrayBuffer(0);

const writer = new ID3Writer(buffer);
/*
writer.setFrame('TIT2', 'test');
      // .setFrame('TPE1', ['Eminem', '50 Cent'])
      // .setFrame('TALB', 'Friday Night Lights')
      // .setFrame('TYER', 2004);
writer.addTag();

let tags = {
  TIT2: 'test'}
  console.log('-=-===-=-=-=-=-=-=-=-=');
NodeID3.create(tags, './id3.tag')
console.log('-=-===-=-=-=-=-=-=-=-=');
let ID3FrameBuffer = NodeID3.create(tags)
console.log(ID3FrameBuffer);

const taggedSongBuffer = writer.arrayBuffer;
console.log(taggedSongBuffer);
const encodedStr1 = base64.encode(ID3FrameBuffer);
console.log(encodedStr1);
const encodedStr2 = base64.encode(taggedSongBuffer);
console.log(encodedStr2);
console.log(base64.decode(encodedStr2));
*/

const tags = {
  TIT2: '한글',
  TIT2: 'test'
}

console.log(tags);
const tmp = myId3.makeTag(tags);
console.log(tmp);
console.log(base64.encode(tmp));
// console.log(myId3.makeTag(tags));
/*
const ID3FrameBuffer = NodeID3.create(tags)
writer.setFrame('TIT2', '한글');
writer.addTag();
console.log(ID3FrameBuffer);
myId3.makeTag(tags);

console.log(writer.arrayBuffer);

const data = '한글';
const output = iconv.encode(data, 'utf-8');
console.log(output);
*/

// const taggedSongBuffer = Buffer.from(writer.arrayBuffer);
