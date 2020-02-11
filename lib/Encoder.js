// https://encoding.spec.whatwg.org/

function strToCodePoints(str) {
    return String(str).split('').map((c) => c.charCodeAt(0));
}

module.exports = {
  encodeWindows1252: (str) => {
      return new Uint8Array(strToCodePoints(str));
  },

  encodeUtf16le: (str) => {
      const output = new Uint8Array(str.length * 2);
      new Uint16Array(output.buffer).set(strToCodePoints(str));

      return output;
  }
}
