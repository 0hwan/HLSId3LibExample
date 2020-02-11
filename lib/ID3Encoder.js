
const iconv = require('iconv-lite');
const frameSize = require('./FrameSize');
const signatures = require('./Signatures');
const encoder = require('./Encoder');

function encodeSize(totalSize) {
  byte_3 = totalSize & 0x7F;
  byte_2 = (totalSize >> 7) & 0x7F;
  byte_1 = (totalSize >> 14) & 0x7F;
  byte_0 = (totalSize >> 21) & 0x7F;
  return ([byte_0, byte_1, byte_2, byte_3]);
}

function setIntegerFrame(name, value) {
  const integer = parseInt(value, 10);


}

function setStringFrame(name, value) {
  if(!name || !value) {
    return null;
  }

  const encoded = iconv.encode(value, 'utf-8');

  const buffer = Buffer.alloc(10);
  buffer.write(name, 0);                           //  ID of the specified frame
  buffer.writeUInt32BE(encoded.length + 2, 4);     //  Size of frame (string length + encoding byte)

  const encBuffer = Buffer.alloc(1);               //  Encoding (now using UTF-16 encoded w/ BOM)
  encBuffer.fill(3);                              // 00: ISO-8859-1, 01: UCS-2 encoded Unicode with BOM, 01:UTF-16BE encoded Unicode without BOM, 03:UTF-8 encoded Unicode
  const ended = Buffer.alloc(1);

  const contentBuffer = Buffer.alloc(encoded.length, encoded, 'binary');   //  Text -> Binary encoding for UTF-16 w/ BOM

  return Buffer.concat([buffer, encBuffer, contentBuffer, ended]);
}

function setPictureFrame(pictureType, data, description, useUnicodeEncoding) {
  const mimeType = signatures.getMimeType(new Uint8Array(data));
  const descriptionString = description.toString();

  if (!mimeType) {
      throw new Error('Unknown picture MIME type');
  }
  if (!description) {
      useUnicodeEncoding = false;
  }
  const retval = {
      name: 'APIC',
      value: data,
      pictureType,
      mimeType,
      useUnicodeEncoding,
      description: descriptionString,
      size: frameSize.getPictureFrameSize(data.byteLength, mimeType.length, descriptionString.length, useUnicodeEncoding),
  };

  return retval;
}

function setUserStringFrame(description, value) {
  const descriptionString = description.toString();
  const valueString = value.toString();

  const retval = {
      name: 'TXXX',
      description: descriptionString,
      value: valueString,
      size: frameSize.getUserStringFrameSize(descriptionString.length, valueString.length),
  };

  return retval;
}

function setCommentFrame(description, text) {
  const descriptionString = description.toString();
  const textString = text.toString();

  const retval = {
      name: 'COMM',
      value: textString,
      description: descriptionString,
      size: frameSize.getCommentFrameSize(descriptionString.length, textString.length),
  };
  return retval;
}

function setUrlLinkFrame(name, url) {
  const urlString = url.toString();

  const retval = {
      name,
      value: urlString,
      size: getUrlLinkFrameSize(urlString.length),
  };

  return retval;
}

function setLyricsFrame(description, lyrics) {
  const descriptionString = description.toString();
  const lyricsString = lyrics.toString();

  const retval = {
      name: 'USLT',
      value: lyricsString,
      description: descriptionString,
      size: frameSize.getLyricsFrameSize(descriptionString.length, lyricsString.length),
  };
  return retval;
}

function createTagHeader() {
  // let header = new Buffer(10)
  let header = Buffer.alloc(10);
  header.write("ID3", 0)              //File identifier
  header.writeUInt16BE(0x0400, 3)     //Version 2.3.0  --  03 00
  header.writeUInt16BE(0x0000, 5)     //Flags 00

  //Last 4 bytes are used for header size, but have to be inserted later, because at this point, its size is not clear.
  return header;
}

module.exports = {
  makeTag: (tags) => {
    const frames = [];

    frames.push(createTagHeader());
    frames.push(setStringFrame('TIT2', '한글'));
    frames.push(setStringFrame('TIT2', 'test'));

    let totalSize = 0;
    frames.forEach((frame) => {
      totalSize += frame.length;
    });

    //  Don't count ID3 header itself
    totalSize -= 10;
    //  ID3 header size uses only 7 bits of a byte, bit shift is needed
    let size = encodeSize(totalSize);

    //  Write bytes to ID3 frame header, which is the first frame
    frames[0].writeUInt8(size[0], 6);
    frames[0].writeUInt8(size[1], 7);
    frames[0].writeUInt8(size[2], 8);
    frames[0].writeUInt8(size[3], 9);

    // console.log('-=-=-=-=-=-=-=');
    // console.log(Buffer.concat(frames));
    // console.log('-=-=-=-=-=-=-=');

    return Buffer.concat(frames);

/*
    const tagNames = Object.keys(tags);

    tagNames.forEach(function(tag, index) {
      let frame;
      console.log(tag);

      if (frame instanceof Buffer) {
        frames.push(frame);
      }
    });
*/

  },
  setFrame: async(frameName, frameValue) => {
    let retObj = {};

    switch (frameName) {
      case 'TPE1': // song artists
      case 'TCOM': // song composers
      case 'TCON': { // song genres
          if (!Array.isArray(frameValue)) {
              throw new Error(`${frameName} frame value should be an array of strings`);
          }
          const delemiter = frameName === 'TCON' ? ';' : '/';
          const value = frameValue.join(delemiter);

          retObj = setStringFrame(frameName, value);
          break;
      }
      case 'TIT2': // song title
      case 'TALB': // album title
      case 'TPE2': // album artist // spec doesn't say anything about separator, so it is a string, not array
      case 'TPE3': // conductor/performer refinement
      case 'TPE4': // interpreted, remixed, or otherwise modified by
      case 'TRCK': // song number in album: 5 or 5/10
      case 'TPOS': // album disc number: 1 or 1/3
      case 'TMED': // media type
      case 'TPUB': // label name
      case 'TCOP': // copyright
      case 'TSRC': { // isrc
          retObj = setStringFrame(frameName, frameValue);
          break;
      }
      case 'TBPM': // beats per minute
      case 'TLEN': // song duration
      case 'TDAT': // album release date expressed as DDMM
      case 'TYER': { // album release year
          retObj = setIntegerFrame(frameName, frameValue);
          break;
      }
      case 'USLT': { // unsychronised lyrics
          if (typeof frameValue !== 'object' || !('description' in frameValue) || !('lyrics' in frameValue)) {
              throw new Error('USLT frame value should be an object with keys description and lyrics');
          }
          retObj = setLyricsFrame(frameValue.description, frameValue.lyrics);
          break;
      }
      case 'APIC': { // song cover
          if (typeof frameValue !== 'object' || !('type' in frameValue) || !('data' in frameValue) || !('description' in frameValue)) {
              throw new Error('APIC frame value should be an object with keys type, data and description');
          }
          if (frameValue.type < 0 || frameValue.type > 20) {
              throw new Error('Incorrect APIC frame picture type');
          }
          retObj = setPictureFrame(frameValue.type, frameValue.data, frameValue.description, !!frameValue.useUnicodeEncoding);
          break;
      }
      case 'TXXX': { // user defined text information
          if (typeof frameValue !== 'object' || !('description' in frameValue) || !('value' in frameValue)) {
              throw new Error('TXXX frame value should be an object with keys description and value');
          }
          retObj = setUserStringFrame(frameValue.description, frameValue.value);
          break;
      }
      case 'TKEY': { // musical key in which the sound starts
          if (!/^([A-G][#b]?m?|o)$/.test(frameValue)) {
              //specs: The ground keys are represented with "A","B","C","D","E",
              //"F" and "G" and halfkeys represented with "b" and "#". Minor is
              //represented as "m", e.g. "Dbm". Off key is represented with an
              //"o" only.
              throw new Error(`${frameName} frame value should be like Dbm, C#, B or o`);
          }
          retObj = setStringFrame(frameName, frameValue);
          break;
      }
      case 'WCOM': // Commercial information
      case 'WCOP': // Copyright/Legal information
      case 'WOAF': // Official audio file webpage
      case 'WOAR': // Official artist/performer webpage
      case 'WOAS': // Official audio source webpage
      case 'WORS': // Official internet radio station homepage
      case 'WPAY': // Payment
      case 'WPUB': { // Publishers official webpage
          retObj = setUrlLinkFrame(frameName, frameValue);
          break;
      }
      case 'COMM': { // Comments
          if (typeof frameValue !== 'object' || !('description' in frameValue) || !('text' in frameValue)) {
              throw new Error('COMM frame value should be an object with keys description and text');
          }
          retObj = setCommentFrame(frameValue.description, frameValue.text);
          break;
      }
      default: {
          throw new Error(`Unsupported frame ${frameName}`);
      }
    }

    return retObj;
  }
}
