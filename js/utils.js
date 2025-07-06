let getUrl = window.location;
const url_base = getUrl.protocol + "//" + getUrl.host + "/" + getUrl.pathname.split('/')[1];

// huge regex :doom:
// replace with navigator.userAgentData.mobile once it has wider support
const isMobile = function() {
    let check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
}(); // runs immediately, so mobileCheck is a boolean not a function

const zip2 = (a, b) => a.map((k, i) => [k, b[i]]);
const zip3 = (a, b, c) => a.map((k, i) => [k, b[i], c[i]]);

function clamp(num, low, high){
    return Math.min(Math.max(num, low), high);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Permutations in js reference (also cool algorithm):
// https://stackoverflow.com/a/41068709
function perm(a){
    if (a.length == 0) return [[]];
    var r = [[a[0]]],
        t = [],
        s = [];
    if (a.length == 1) return r;
    for (var i = 1, la = a.length; i < la; i++){
        for (var j = 0, lr = r.length; j < lr; j++){
            r[j].push(a[i]);
            t.push(r[j]);
            for(var k = 1, lrj = r[j].length; k < lrj; k++){
                for (var l = 0; l < lrj; l++) s[l] = r[j][(k+l)%lrj];
                t[t.length] = s;
                s = [];
            }
        }
        r = t;
        t = [];
    }
    return r;
}

function round_near(value) {
    let eps = 0.00000001;
    if (Math.abs(value - Math.round(value)) < eps) {
        return Math.round(value);
    }
    return value;
}

/**
 * Javascript's "%" is a remainder operator, which is inconvenient if
 * a and b in a % b are of different signs, as it behaves differently
 * from the modolus operator.
 *
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
 */
function mod(v, m) {
    return ((v % m) + m) % m;
}

function setText(id, text) {
    document.getElementById(id).textContent = text;
}

function setHTML(id, html) {
    document.getElementById(id).innerHTML = html;
}

function setValue(id, value) {
    let el = document.getElementById(id);
    if (el == null) {
        console.log("WARN tried to set text value of id {"+id+"} to ["+value+"] but did not exist!");
        return;
    }
    el.value = value;
    el.dispatchEvent(new Event("change"));
}

function getValue(id) {
    return document.getElementById(id).value;
}

function log(b, n) {
    return Math.log(n) / Math.log(b);
}

/**
 * Base 64 encoding tools.
 * Source: https://stackoverflow.com/a/27696695
 * Modified for fixed precision.
 *
 * Examples:
 * Base64.fromInt(-2147483648); // gives "200000"
 * Base64.toInt("200000"); // gives -2147483648
 */
class Base64 {
    static #digitsStr =
    //   0       8       16      24      32      40      48      56     63
    //   v       v       v       v       v       v       v       v      v
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+-";

    /** @type {string[]} */
    static #digits = Base64.#digitsStr.split('');

    /** @type {Record<string, number>} */
    static #digitsMap = Object.fromEntries(Base64.#digits.map((x, i) => [x, i]));

    /**
     * Encode a 32 bit number as a base64 string.
     * @param {number} int32
     *
     * @returns string
     */
    static fromIntV(int32) {
        let result = '';
        while (true) {
            result = Base64.#digits[int32 & 0x3f] + result;
            int32 >>>= 6;
            if (int32 === 0)
                break;
        }
        return result;
    }

    /**
     * Return an integer from a Base64 compatible string.
     * result must fit into Number.MAX_SAFE_INTEGER.
     *
     * @param {string} digitsStr
     */
    static toInt(digitsStr) {
        let result = 0;
        let digits = digitsStr.split('');
        for (let i = 0; i < digits.length; i++) {
            result = (result << 6) + Base64.#digitsMap[digits[i]];
        }
        return result;
    }

    /**
     * Like fromIntV, but to a fixed number of characters N.
     *
     * @param {number} int32 - the number to encode
     * @param {number} n - the precision
     */
    static fromIntN(int32, n) {
        let result = '';
        for (let i = 0; i < n; ++i) {
            result = Base64.#digits[int32 & 0x3f] + result;
            int32 >>= 6;
        }
        return result;
    }

    /**
     * Encode a Base64 string from raw bytes
     * @param {Uint8Array} arr - an array of bytes
     */
    static fromBytes(arr) {
        let b64String = "";
        let rem = 0;

        for (let i in arr) {
            const iMod = i % 3;
            const num = (arr[i] << (iMod * 2)) & 0x3F | rem;
            rem = arr[i] >> (6 - iMod * 2);
            b64String = Base64.#digits[num] + b64String;
            if (iMod === 2) {
                b64String = Base64.#digits[rem] + b64String;
                rem = 0;
            }
        }
        if (arr.length % 3 !== 0) b64String = Base64.#digits[rem] + b64String;

        return b64String;
    }

    /**
     * Decode a b64_string into raw bytes
     * @param {string} b64_string - a Base64 string to decode
     * @returns Uint8Array
     */
    static intoBytes(b64_string) {
        const arr = new Uint8Array(Math.floor(b64_string.length * (6/8)));

        // Loop in reverse because we need to decode from lowest to highest
        for (let i = 0, j = b64_string.length - 1; j > 0; --j, ++i) {
            const iMod = i % 3;
            arr[i] = Base64.toInt(b64_string[j]) >>> (iMod * 2);
            arr[i] |= (Base64.toInt(b64_string[j - 1]) << (6 - iMod * 2)) & 0xFF;
            if (iMod == 2) { --j; }
        }

        return arr;
    }

    /**
     * Return an integer, signed, from a Base64 compatible string.
     * @param {string} digitsStr
     */
    static toIntSigned(digitsStr) {
        let result = 0;
        let digits = digitsStr.split('');
        if (digits[0] && (Base64.#digitsMap[digits[0]] & 0x20)) {
            result = -1;
        }
        for (let i = 0; i < digits.length; i++) {
            result = (result << 6) + Base64.#digitsMap[digits[i]];
        }
        return result;
    }

    /**
     * Test whether a given string is made entirely out of Base64 characters.
     * @param {string} digitStr
     */
    static isB64(str) {
        return str.split('').every(c => Base64.#digitsMap[c] !== undefined);
    }

    /**
     * Check whether a given Unicode codepoint is part of the Wynnbuilder Base64 charset.
     * @param {number} cp - the codepoint to check
     */
    static isB64Codepoint(cp) {
        const isNumber = (cp > 47 && cp < 58); // [0-9] => [48, 57]
        const isAlphanumLowercase = (cp > 96 && cp < 123); // [a-z] => [97, 122]
        const isAlphanumUppercase = (cp > 64 && cp < 91); // [A-Z] => [65, 90]
        const isPlusMinus = (cp === 43) || (cp === 45); // [+-] => 43 || 45
        return isNumber || isAlphanumLowercase || isAlphanumUppercase || isPlusMinus;
    }
}

// THe length, in bits of the version (one in data/*) to be used in binary encoding.
// TODO:(@orgold) - move this.
const VERISON_BITLEN = 10

/** A class used to represent an arbitrary length bit vector. Very useful for encoding and decoding.
 *
 */
 class BitVector {

    /** Constructs an arbitrary-length bit vector.
     * @class
     * @param {String | Number} data - The data to append.
     * @param {Number} length - A set length for the data. Ignored if data is a string.
     *
     * The structure of the Uint32Array should be [[last, ..., first], ..., [last, ..., first], [empty space, last, ..., first]]
     */
    constructor(data, length) {
        let bitVec = [];

        if (typeof data === "string") {
            let int = 0;
            let bvIdx = 0;
            length = data.length * 6;

            for (let i = 0; i < data.length; i++) {
                let char = Base64.toInt(data[i]);
                let prePos = bvIdx % 32;
                int |= (char << bvIdx);
                bvIdx += 6;
                let postPos = bvIdx % 32;
                if (postPos < prePos) { //we have to have filled up the integer
                    bitVec.push(int);
                    int = (char >>> (6 - postPos));
                }

                if (i == data.length - 1 && postPos != 0) {
                    bitVec.push(int);
                }
            }
        } else if (typeof data === "number") {
            if (typeof length === "undefined")
            if (length < 0) {
                throw new RangeError("BitVector must have nonnegative length.");
            }

            //convert to int just in case
            data = Math.round(data);

            //range of numbers that won't fit in a uint32
            if (data > 2**32 - 1 || data < -(2 ** 32 - 1)) {
                throw new RangeError("Numerical data has to fit within a 32-bit integer range to instantiate a BitVector.");
            }
            bitVec.push(data);
        } else {
            throw new TypeError("BitVector must be instantiated with a Number or a B64 String");
        }

        this.length = length;              // The length, in bits, of the bitvector
        // Index to the first uninitialized entry of the underlying ArrayBuffer, interpreted as a Uint32Array.
        // For simplicity, the first entry is always treated as initialized even if the vector length is 0.
        this.tailIdx = bitVec.length === 0 ? 1 : bitVec.length;

        let byteLength = Math.floor(this.length / 4) + 1; // Length in bytes for ArrayBuffer creation.
        if (byteLength < 4) byteLength = 4;              // The ArrayBuffer is interepreted as Uint32Array, so we must reserve at least 4 bytes.
        this.arr = new ArrayBuffer(byteLength, {maxByteLength: 2 << 16});

        const bitsView = new Uint32Array(this.arr);
        for (const i in bitVec) {
            bitsView[i] = bitVec[i];
        }
    }

    /**
     * Return a Uint32Array representation of the underlying ArrayBuffer.
     * this does not copy the array.
     *
     * @returns Uint32Array
     */
    get bits() {
        return new Uint32Array(this.arr);
    }

    /** Return value of bit at index idx.
     *
     * @param {Number} idx - The index to read
     *
     * @returns The bit value at position idx
     */
    readBit(idx) {
        if (idx < 0 || idx >= this.length) {
            throw new RangeError("Cannot read bit outside the range of the BitVector. ("+idx+" > "+this.length+")");
        }
        return ((this.bits[Math.floor(idx / 32)] & (1 << idx)) == 0 ? 0 : 1);
    }

    /** Returns an integer value (if possible) made from the range of bits [start, end). Undefined behavior if the range to read is too big.
     *
     * @param {Number} start - The index to start slicing from. Inclusive.
     * @param {Number} end - The index to end slicing at. Exclusive.
     *
     * @returns An integer representation of the sliced bits.
     */
    slice(start, end) {
        //TO NOTE: JS shifting is ALWAYS in mod 32. a << b will do a << (b mod 32) implicitly.
        const bitVec = this.bits;

        if (end < start) {
            throw new RangeError("Cannot slice a range where the end is before the start.");
        } else if (end == start) {
            return 0;
        } else if (end - start > 32) {
            //requesting a slice of longer than 32 bits (safe integer "length")
            throw new RangeError("Cannot slice a range of longer than 32 bits (unsafe to store in an integer).");
        }

        let res = 0;
        if (Math.floor((end - 1) / 32) == Math.floor(start / 32)) {
            //the range is within 1 uint32 section - do some relatively fast bit twiddling
            res = (bitVec[Math.floor(start / 32)] & ~((((~0) << ((end - 1))) << 1) | ~((~0) << (start)))) >>> (start % 32);
        } else {
            //the number of bits in the uint32s
            let startPos = (start % 32);
            let intPos = Math.floor(start/32);
            res = (bitVec[intPos] & ((~0) << (start))) >>> (startPos);
            res |= (bitVec[intPos + 1] & ~((~0) << (end))) << (32 - startPos);
        }

        return res;

        // General code - slow
        // for (let i = start; i < end; i++) {
        //     res |= (get_bit(i) << (i - start));
        // }
    }

    // TODO:(@orgold): optimize this code
    sliceB64(start, end) {
        if (end < start) {
            throw new RangeError("Cannot slice a range where the end is before the start.");
        } else if (end > this.length) {
            throw new RangeError("Cannot slice past the end of the vector.");
        } else if (end == start) {
            return "0";
        }
        let b64String = "";
        for (let i = start; i < end; i += 6) {
            b64String += Base64.fromIntN(this.slice(i, i + 6), 1);
        }
        return b64String;
    }

    /** Assign bit at index idx to 1.
     *
     * @param {Number} idx - The index to set.
     */
    setBit(idx) {
        if (idx < 0 || idx >= this.length) {
            throw new RangeError("Cannot set bit outside the range of the BitVector.");
        }
        this.bits[Math.floor(idx / 32)] |= (1 << idx % 32);
    }

    /** Assign bit at index idx to 0.
     *
     * @param {Number} idx - The index to clear.
     */
    clearBit(idx) {
        if (idx < 0 || idx >= this.length) {
            throw new RangeError("Cannot clear bit outside the range of the BitVector.");
        }
        this.bits[Math.floor(idx / 32)] &= ~(1 << idx % 32);
    }

    /** Creates a string version of the bit vector in B64. Does not keep the order of elements a sensible human readable format.
     *
     * @returns A b64 string representation of the BitVector.
     */
    toB64() {
        if (this.length == 0) {
            return "";
        }
        let b64String = "";
        let i = 0;
        while (i < this.length) {
            b64String += Base64.fromIntN(this.slice(i, i + 6), 1);
            i += 6;
        }

        return b64String;
    }

    /** Returns a BitVector in bitstring format. Probably only useful for dev debugging.
     *
     * @returns A bit string representation of the BitVector. Goes from higher-indexed bits to lower-indexed bits. (n ... 0)
     */
    toString() {
        let retStr = "";
        for (let i = 0; i < this.length; i++) {
            retStr = (this.readBit(i) == 0 ? "0": "1") + retStr;
        }
        return retStr;
    }

     /** Returns a BitVector in bitstring format. Probably only useful for dev debugging.
     *
     * @returns A bit string representation of the BitVector. Goes from lower-indexed bits to higher-indexed bits. (0 ... n)
     */
    toStringR() {
        let retStr = "";
        for (let i = 0; i < this.length; i++) {
            retStr += (this.readBit(i) == 0 ? "0": "1");
        }
        return retStr;
    }

    updateTailInt(bitVec, v, vLen) {
        const prePos = this.length % 32; // insertion pos
        const postPos = prePos + vLen; // excess insertion pos

        bitVec[this.tailIdx - 1] |= v << prePos; // mask the tail with the bits of the new int that fit
        this.tailIdx += postPos >= 32; // if we've exhausted the tail, increment it

        // if we've overflowed and there's excess bits, add them to the new tail
        bitVec[this.tailIdx - 1] |= (v & ((postPos <= 32) - 1)) >>> (32 - prePos);
        this.length += vLen;
    }

    /**
     * Appends data from a Base64 string to the vector.
     * @param {string} data - A Base64 string.
     */
    appendB64(data) {
        if (typeof data !== "string") throw new Error("`BitVector.appendB64` can only be used to append Base 64 strings. Try `BitVector.append`.")
        const length = data.length * 6;

        while (Math.floor((this.length + length) / 4) + 1 >= this.arr.byteLength) {
            this.arr.resize(this.arr.byteLength * 2);
        }

        let bitVec = this.bits;
        for (const c of data) {
            const v = Base64.toInt(c);
            this.updateTailInt(bitVec, v, 6);
        }
    }

    /** Appends data to the BitVector.
     *
     * @param {Number | String} data - The data to append.
     * @param {Number} length - The length, in bits, of the new data.
     */
     append(data, length) {
        if (typeof data !== "number") throw new Error("`BitVector.append` can only be used to append integers. Try `BitVector.appendB64`.")
        if (length < 0) {
            throw new RangeError("BitVector length must increase by a nonnegative number.");
        }

        // Reallocate the underlying array if necessary
        while (Math.floor((this.length + length) / 4) + 1 >= this.arr.byteLength) {
            this.arr.resize(this.arr.byteLength * 2); 
        }


        //convert to int just in case
        let int = data & 0xFFFFFFFF;

        //range of numbers that "could" fit in a uint32 -> [0, 2^32) U [-2^31, 2^31)
        if (data > 2**32 - 1 || data < -(2 ** 31)) {
            throw new RangeError("Numerical data has to fit within a 32-bit integer range to instantiate a BitVector.");
        }
        if (length !== 32 && (int & ((1 << (length)) - 1)) !== int) {
            throw new RangeError(`${int} doesn't fit in ${length} bits!`)
        }

        this.updateTailInt(this.bits, int, length);
    }

    /**
     * Merge bit vectors together.
     * changes the vector in-place.
     *
     * @param {BitVector[]} bitVecs A list of BitVectors.
     */
    merge(bitVecs) {
        for (const bitVec of bitVecs) {
            let bitVecLen = bitVec.length;
            for (let i = 0; i < bitVec.tailIdx; ++i) {
                if (i === bitVec.tailIdx - 1) {
                    this.append(bitVec.bits[i], bitVecLen);
                } else {
                    this.append(bitVec.bits[i], 32);
                    bitVecLen -= 32;
                }
            }
        }
    }
};

/**
 * Cursor for easy bit navigation of a bitvector.
 * Must be instantiated with a BitVector or it's subclass.
 *
 * @prop {BitVector} #bitVec - the underlying bit vector. 
 * @prop {number} #currIdx - the current index pointed to by the cursor.
 * @prop {number} #endIdx - the last index the cursor is permitted to travel to.
 */
class BitVectorCursor {
    #bitVec;
    #currIdx;
    #endIdx;

    /**
     * Construct a new Cursor from an existing bit vector. 
     * @param {BitVector} bitvec - the underlying bit vector.
     * @param {number} [idx=0] - the index the cursor will point to upon construction.
     * @param {number} [span=(bitvec.length - idx)] - the number of bits the cursor is allowed to travel from idx.
     */
    constructor(bitvec, idx=0, span=(bitvec.length - idx)) {
        if (span < 0 || idx < 0) {
            throw new Error("Span and index must be positive.");
        }
        if (idx + span > bitvec.length) {
            throw new RangeError("idx and span must satisfy `idx + span <= bitvec.length`.") 
        }
        this.#bitVec = bitvec;
        this.#currIdx = idx;
        this.#endIdx = idx + span;
    };

    get bitVec() {
        return this.#bitVec;
    }

    get currIdx() { 
        return this.#currIdx; 
    }

    get endIdx() { 
        return this.#endIdx; 
    }

    /**
     * Create another cursor at the same index with a new span.
     */
    spawn(span, idx=this.#currIdx) {
        return new BitVectorCursor(this.#bitVec, idx, span);
    }

    /**
     * Return whether the cursor reached the end of it's span.
     */
    end() {
        return this.#currIdx === this.#endIdx;
    }

    /**
      * @returns the result of BitVector.readBit(idx) and advances the cursor to the next byte.
      */
    advance() {
        if (this.end()) {
            throw new Error("Cannot advance further - reached the end of the vector.");
        }
        const idx = this.#currIdx;
        this.#currIdx += 1;
        return this.#bitVec.readBit(idx);
    }

    /**
      * @param {number} amount
      *
      * @returns the result of BitVector.slice(cursor.#currIdx, amount) and advances the cursor by `amount` bits.
      */
    advanceBy(amount) {
        if (this.#currIdx + amount > this.#endIdx) {
            throw new Error(`Cannot advance ${this.#currIdx} by ${amount} bits - the cursor window ends at ${this.#endIdx}`);
        } else if (((this.#currIdx + amount - 1) % 32) + 1 > 32) {
            throw new Error(`Unsafe - result of advanceBy will not fit in a 32 bit integer.`)
        }
        const idx = this.#currIdx;
        this.#currIdx += amount;
        return this.#bitVec.slice(idx, this.#currIdx);
    }

    /**
     * Advances the cursor by `amount` chars and returns the resulting Base64 string.
     * @param {number} amount - the amount of characters to advance by.
     */
    advanceByChars(amount) {
        const idx = this.#currIdx;
        this.#currIdx += amount * 6;
        return this.bitVec.sliceB64(idx, this.#currIdx);

    }

    /**
     * Advance the cursor `amount` bits without reading any of them.
     * @param {number} amount - the amount to advance by. Must be in the cursor's range.
     */
    skip(amount) {
        assert(this.#currIdx + amount <= this.#endIdx, "Can't skip more than the cursor's allowed span.");
        this.#currIdx += amount;
    }

    /**
     * Consume the cursor until the end of the bitvector.
     * This method removes the reference to the vector, rendering
     * the cursor unusable.
     */
    consume() {
        let idx = this.#currIdx;
        this.#currIdx = this.#endIdx
        let len = this.#endIdx - idx;
        let vec = new BitVector(0, 0);
        while (len > 32) {
            vec.append(this.#bitVec.slice(idx, idx + 32), 32);
            idx += 32;
            len -= 32;
        }
        vec.append(this.#bitVec.slice(idx, idx + len), len);
        this.#bitVec = null;
        return vec;
    }
}

/**
 * A Bit Vector with specific helpers for encoding.
 */
class EncodingBitVector extends BitVector {
    constructor(data, length, bitcodeMap=ENC) {
        super(data, length);
        this.bitcodeMap = bitcodeMap;
    }

    appendFlag(field, flag) {
        this.append(this.bitcodeMap[field][flag], this.bitcodeMap[field]["BITLEN"]);
    }
}

/**
 * A bootstring implementation similar to https://github.com/frereit/bootstring,
 * according to IETF RFC 3492 - https://datatracker.ietf.org/doc/html/rfc3492
 * sections 3, 6 and 7. 
 * You can also read up on https://docs.omniverse.nvidia.com/kit/docs/omni-transcoding/latest/docs/algorithm.html.
 *
 * This particular bootstring's alphabet is fixed for Wynnbuilder purposes, however it should be trivial
 * to make it part of the domain parameters.
 *
 * The encoder should only be used via the `encode` and `decode` functions.
 *
 * NOTE: VLI as seen throughout the class docs and methods refer to variable-length-integers, as
 * detailed in the RFC.
 *
 * Usage:
 * let bootstringEncoder = new BootstringEncoder();
 * let encodedText = bootstringEncoder.encode(unicodeText);
 * let decodedText = bootstringEncoder.decode(encodedText);
 */
class BootstringEncoder {
    // Private properties
    #initial_n;
    #tmin;
    #tmax;
    #initial_bias;
    #damp;
    #skew;
    #delim

    // Private static properties
    static #base = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split('');
    static #baseMap = Object.fromEntries(BootstringEncoder.#base.map((x, i) => [x, i]));
    static #b = BootstringEncoder.#base.length;


    /**
     * Create a new encoder with the given domain parameters.
     * explanation for each parameter is avilable in the specification.
     * @param {number} initial_n 
     * @param {number} tmin
     * @param {number} tmax
     * @param {number} initial_bias
     * @param {number} damp 
     * @param {number} skew
     * @param {number} delim
     */
    constructor(initial_n, tmin, tmax, initial_bias, damp, skew, delim) {
        if (tmax % 2 !== 0) {
            throw new Error("Please choose a tmax value that is a multiple of 2.");
        }
        this.#initial_n = initial_n;
        this.#tmin = tmin;
        this.#tmax = tmax;
        this.#initial_bias = initial_bias;
        this.#damp = damp;
        this.#skew = skew;
        this.#delim = delim;
    }

    /**
     * Calculate the threshold for the given position in a Variable Length Integer.
     */
    #threshold(i, bias) {
        // t(i) = b * (i + 1) - bias
        return clamp(BootstringEncoder.#b * (i + 1) - bias, this.#tmin, this.#tmax);
    }

    /**
     * decode a varialbe length integer.
     *
     * @param {string} str - a `base` conforming string.
     * @returns {number} - the decoded number.
     */
    #decodeVLI(str, bias) {
        let i = 0;
        let w = 1; // initial weight
        let res = 0; // Initial delta
        for (const char of str) {
            let d = BootstringEncoder.#baseMap[char];
            res += d * w;
            let t = this.#threshold(i, bias);
            if (d < t) break;
            w *= BootstringEncoder.#b - t;
            i += 1;
        }
        return [res, str.slice(i + 1)];

    }

    /**
     * Encode a number as a varialbe length integer.
     *
     * @param {number} value - the number to encode
     * @returns {string} - a `base` encoded string
     */
    #encodeVLI(value, bias) {
        let enc = [""];
        let i = 0;
        while (true) {
            const t = this.#threshold(i, bias); 
            if (value < t) {
                enc.push(BootstringEncoder.#base[value]);
                break;
            }
            enc.push(BootstringEncoder.#base[t + ((value - t) % (BootstringEncoder.#b - t))]);
            value = Math.floor((value - t) / (BootstringEncoder.#b - t));
            i += 1;
        }
        return enc.join('');
    }

    /**
     * seperates the basic codepoints from the extended ones.
     *
     * returns a tuple containing 
     * - The basic characters
     * - A set of the extended codepoints, sorted by magnitude
     * - The length of the basic portion of the string
     *
     * @param {string} raw - The original extended string.
     *
     * @returns {[string[], Set<number>, number]}
     */
    #splitBasicExtended(raw) {
        let basicCodepoints = [];
        let nonBasicCodepoints = [];
        for (const x of raw) {
            if (Base64.isB64(x)) {
                basicCodepoints.push(x);
            }  else {
                nonBasicCodepoints.push(x.codePointAt(0));
            }
        }
        const encodedCount = basicCodepoints.length;
        if (encodedCount > 0) basicCodepoints.push(this.#delim);
        return [basicCodepoints, new Set(nonBasicCodepoints.sort((a, b) => (a > b) - (a < b))), encodedCount];
    }

    /**
     * Bias adaption algorithm.
     * This tries to to make sure the deltas are encoded to be as small as possible by
     * adjusting the threshold calculation for the VLI.
     * 
     * @param {number} delta
     * @param {number} length
     * @param {boolean} firstIteration
     */
    #adaptBias(delta, length, firstIteration) {
        delta = firstIteration ? Math.floor(delta / this.#damp) : delta >> 1;
        delta = Math.floor(delta / length); 
        let k = 0;
        const thresh = ((BootstringEncoder.#b - this.#tmin) * this.#tmax) >> 1;
        while (delta > thresh) {
            delta = Math.floor(delta / (BootstringEncoder.#b - this.#tmin));
            k += BootstringEncoder.#b;
        }
        const ret = k + Math.floor(((BootstringEncoder.#b - this.#tmin + 1) * delta) / (delta + this.#skew))
        return ret;
    }

    /**
     * Split the literal and delta portions of an encoded string.
     * @param {string} encodedStr
     */
    #splitLiteralsAndDetlas(encodedStr) {
        const delimIdx = encodedStr.lastIndexOf(this.#delim);
        //     basic portion                                       extended portion
        return [delimIdx < 0 ? "" : encodedStr.slice(0, delimIdx), encodedStr.slice(delimIdx + 1)];
    }

    /**
     * Encodes a raw Unicode string into a Bootstring.
     * @param {string} raw - The string to encode.
     */
    encode(raw) {
        let [basic, nonBasic, encodedCount] = this.#splitBasicExtended(raw);
        if (nonBasic.size === 0) {
            return basic.join('');
        }

        // Account for the delimiter, there are no surrogate pairs in the basic codepoints
        let delta = 0;
        let n = this.#initial_n;
        let bias = this.#initial_bias;
        // Count in code points
        let firstIteration = true;
        for (const codepoint of nonBasic) {
            delta += (codepoint - n) * (encodedCount + 1);
            n = codepoint;
            for (const c of raw) {
                let currCodepoint = c.codePointAt(0);

                if (currCodepoint < n || Base64.isB64Codepoint(currCodepoint)) {
                    delta += 1;
                }

                if (currCodepoint === n) {
                    basic.push(this.#encodeVLI(delta, bias));
                    encodedCount += 1;
                    bias = this.#adaptBias(delta, encodedCount, firstIteration);
                    delta = 0;
                    firstIteration = false;
                }
            }
            delta += 1;
            n += 1;
        }
        return basic.join('');
    }

    /**
     * Decode a Bootstring into the original Unicode string. 
     * @param {string} bootStr - The string to decode.
     */
    decode(bootStr) {
        let [encodedStr, deltaStr] = this.#splitLiteralsAndDetlas(bootStr);
        // Javascript String.length calculates length in # of 16 bit chars (counts surrogate UTF-16 pairs),
        // we need it in Unicode codepoints.
        let codepoints = [...encodedStr].length; 
        let bias = this.#initial_bias;
        let n = this.#initial_n;
        let i = 0;
        let firstIteration = true;
        let delta = 0;

        while (deltaStr !== "") {
            [delta, deltaStr] = this.#decodeVLI(deltaStr, bias); 
            let steps = delta + Number(!firstIteration);
            n += Math.floor((i + steps) / (codepoints + 1))
            i = (i + steps) % (codepoints + 1)
            let cp = String.fromCodePoint(n);
            encodedStr = encodedStr.slice(0, i) + cp + encodedStr.slice(i);
            codepoints += 1;
            bias = this.#adaptBias(delta, codepoints, firstIteration);
            firstIteration = false;
        }
        return encodedStr;
    }
}

/*
    Turns a raw stat and a % stat into a final stat on the basis that - raw and >= 100% becomes 0 and + raw and <=-100% becomes negative.
    Pct would be 0.80 for 80%, -1.20 for 120%, etc
    Example Outputs:
    raw: -100
    pct: +0.20, output = -80
    pct: +1.20, output = 0
    pct: -0.20, output = -120
    pct: -1.20, output = -220

    raw: +100
    pct: +0.20, output = 120
    pct: +1.20, output = 220
    pct: -0.20, output = 80
    pct: -1.20, output = -20
*/
function rawToPct(raw, pct){
    final = 0;
    if (raw < 0){
        final = (Math.min(0, raw - (raw * pct) ));
    }else if(raw > 0){
        final = raw + (raw * pct);
    }else{ //do nothing - final's already 0
    }
    return final;
}

/*
    Turns a raw stat and a % stat into a final stat on the basis that - raw and >= 100% becomes positive and + raw and <=-100% becomes negative.
*/
function rawToPctUncapped(raw, pct){
    final = 0;
    if (raw < 0){
        final = raw - (raw * pct);
    }else if(raw > 0){
        final = raw + (raw * pct);
    }
    return final;
}

/*
 * Clipboard utilities
 * From: https://stackoverflow.com/a/30810322
 */
function fallbackCopyTextToClipboard(text) {
  var textArea = document.createElement("textarea");

  //
  // *** This styling is an extra step which is likely not required. ***
  //
  // Why is it here? To ensure:
  // 1. the element is able to have focus and selection.
  // 2. if the element was to flash render it has minimal visual impact.
  // 3. less flakyness with selection and copying which **might** occur if
  //    the textarea element is not visible.
  //
  // The likelihood is the element won't even render, not even a
  // flash, so some of these are just precautions. However in
  // Internet Explorer the element is visible whilst the popup
  // box asking the user for permission for the web page to
  // copy to the clipboard.
  //

  // Place in the top-left corner of screen regardless of scroll position.
  textArea.style.position = 'fixed';
  textArea.style.top = 0;
  textArea.style.left = 0;

  // Ensure it has a small width and height. Setting to 1px / 1em
  // doesn't work as this gives a negative w/h on some browsers.
  textArea.style.width = '2em';
  textArea.style.height = '2em';

  // We don't need padding, reducing the size if it does flash render.
  textArea.style.padding = 0;

  // Clean up any borders.
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';

  // Avoid flash of the white box if rendered for any reason.
  textArea.style.background = 'transparent';


  textArea.value = text;

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand('copy');
    var msg = successful ? 'successful' : 'unsuccessful';
    console.log('Copying text command was ' + msg);
  } catch (err) {
    console.log('Oops, unable to copy');
  }

  document.body.removeChild(textArea);
}

function copyTextToClipboard(text) {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(text);
    return;
  }
  navigator.clipboard.writeText(text).then(function() {
    console.log('Async: Copying to clipboard was successful!');
  }, function(err) {
    console.error('Async: Could not copy text: ', err);
  });
}

/**
 * Generates a random color using the #(R)(G)(B) format.
 */
function randomColor() {
    return '#' + Math.round(Math.random() * 0xFFFFFF).toString(16);
}

/**
 * Generates a random color, but lightning must be relatively high (>0.5).
 *
 * @returns a random color in RGB 6-bit form.
 */
function randomColorLight() {
    return randomColorHSL([0,1],[0,1],[0.5,1]);
}

/** Generates a random color given HSL restrictions.
 *
 * @returns a random color in RGB 6-bit form.
 */
function randomColorHSL(h,s,l) {
    var letters = '0123456789abcdef';
    let h_var = h[0] + (h[1]-h[0])*Math.random(); //hue
    let s_var = s[0] + (s[1]-s[0])*Math.random(); //saturation
    let l_var = l[0] + (l[1]-l[0])*Math.random(); //lightness
    let rgb = hslToRgb(h_var,s_var,l_var);
    let color = "#";
    for (const c of rgb) {
        color += letters[Math.floor(c/16)] + letters[c%16];
    }
    return color;
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255]. Not written by wynnbuilder devs.
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 */
 function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/** Creates a tooltip.
 *
 * @param {DOM Element} elem - the element to make a tooltip
 * @param {String} element_type - the HTML element type that the tooltiptext should be.
 * @param {String} tooltiptext - the text to display in the tooltip.
 * @param {DOM Element} parent - the parent elem. optional.
 * @param {String[]} classList - a list of classes to add to the element.
 */
function createTooltip(elem, element_type, tooltiptext, parent, classList) {
    elem = document.createElement(element_type);
    elem.classList.add("tooltiptext");
    if (tooltiptext.includes("\n")) {
        let texts = tooltiptext.split("\n");
        for (const t of texts) {
            let child = document.createElement(element_type);
            child.textContent = t;
            elem.appendChild(child);
        }
    } else {
        elem.textContent = tooltiptext;
    }
    for (const c of classList) {
        elem.classList.add(c);
    }
    if (parent) {
        parent.classList.add("tooltip");
        parent.appendChild(elem);
    }
    return elem;
}

/** A generic function that toggles the on and off state of a button.
 *
 * @param {String} button_id - the id name of the button.
 */
function toggleButton(button_id) {
    let elem = document.getElementById(button_id);
    if (elem.tagName === "BUTTON") {
        if (elem.classList.contains("toggleOn")) { //toggle the pressed button off
            elem.classList.remove("toggleOn");
        } else {
            elem.classList.add("toggleOn");
        }
    }
}

/**
 * If the input object is undefined, make it "match" the target type
 * with default value (0 or empty str).
 */
function matchType(object, target) {
    if (typeof object === 'undefined') {
        switch (target) {
            case 'string':
                return "";
            case 'number':
                return 0;
            case 'undefined':
                return undefined;
            default:
                throw new Error(`Incomparable type ${target}`);
        }
    }
    return object;
}

/** A utility function that reloads the page forcefully.
 *
 */
async function hardReload() {
    //https://gist.github.com/rmehner/b9a41d9f659c9b1c3340
    try {
        const dbs = await window.indexedDB.databases();
        await dbs.forEach(db => { window.indexedDB.deleteDatabase(db.name) });
    } catch (error) {
        // Hacky patch for firefox...
        console.log(error);
        const db_names = ['item_db', 'ing_db', 'map_db', 'tome_db'];
        await db_names.forEach(db => { window.indexedDB.deleteDatabase(db) });
    }

    location.reload(true);
}


function capitalizeFirst(str) {
    return str[0].toUpperCase() + str.substring(1);
}

/** https://stackoverflow.com/questions/16839698/jquery-getscript-alternative-in-native-javascript
 *  If we ever want to write something that needs to import other js files
 */
const getScript = url => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;

    script.onerror = reject;

    script.onload = script.onreadystatechange = function () {
        const loadState = this.readyState;

        if (loadState && loadState !== 'loaded' && loadState !== 'complete') return

        script.onload = script.onreadystatechange = null;

        resolve();
    }

    document.head.appendChild(script);
})

/*
GENERIC TEST FUNCTIONS
*/
/** The generic assert function. Fails on all "false-y" values. Useful for non-object equality checks, boolean value checks, and existence checks.
 *
 * @param {*} arg - argument to assert.
 * @param {String} msg - the error message to throw.
 */
 function assert(arg, msg) {
    if (!arg) {
        throw new Error(msg ? msg : "Assert failed.");
    }
}

/** Asserts object equality of the 2 parameters. For loose and strict asserts, use assert().
 *
 * @param {*} arg1 - first argument to compare.
 * @param {*} arg2 - second argument to compare.
 * @param {String} msg - the error message to throw.
 */
function assert_equals(arg1, arg2, msg) {
    if (!Object.is(arg1, arg2)) {
        throw new Error(msg ? msg : "Assert Equals failed. " + arg1 + " is not " + arg2 + ".");
    }
}

/** Asserts object inequality of the 2 parameters. For loose and strict asserts, use assert().
 *
 * @param {*} arg1 - first argument to compare.
 * @param {*} arg2 - second argument to compare.
 * @param {String} msg - the error message to throw.
 */
 function assert_not_equals(arg1, arg2, msg) {
    if (Object.is(arg1, arg2)) {
        throw new Error(msg ? msg : "Assert Not Equals failed. " + arg1 + " is " + arg2 + ".");
    }
}

/** Asserts proximity between 2 arguments. Should be used for any floating point datatype.
 *
 * @param {*} arg1 - first argument to compare.
 * @param {*} arg2 - second argument to compare.
 * @param {Number} epsilon - the margin of error (<= del difference is ok). Defaults to -1E5.
 * @param {String} msg - the error message to throw.
 */
function assert_near(arg1, arg2, epsilon = 1E-5, msg) {
    if (Math.abs(arg1 - arg2) > epsilon) {
        throw new Error(msg ? msg : "Assert Near failed. " + arg1 + " is not within " + epsilon + " of " + arg2 + ".");
    }
}

/** Asserts that the input argument is null.
 *
 * @param {*} arg - the argument to test for null.
 * @param {String} msg - the error message to throw.
 */
function assert_null(arg, msg) {
    if (arg !== null) {
        throw new Error(msg ? msg : "Assert Near failed. " + arg + " is not null.");
    }
}

/** Asserts that the input argument is undefined.
 *
 * @param {*} arg - the argument to test for undefined.
 * @param {String} msg - the error message to throw.
 */
 function assert_undefined(arg, msg) {
    if (arg !== undefined) {
        throw new Error(msg ? msg : "Assert Near failed. " + arg + " is not undefined.");
    }
}

/** Asserts that there is an error when a callback function is run.
 *
 * @param {Function} func_binding - a function binding to run. Can be passed in with func.bind(null, arg1, ..., argn)
 * @param {String} msg - the error message to throw.
 */
function assert_error(func_binding, msg) {
    try {
        func_binding();
    } catch (err) {
        return;
    }
    throw new Error(msg ? msg : "Function didn't throw an error.");
}


/**
 * 
 */
function gen_slider_labeled({label_name, label_classlist = [], min = 0, max = 100, step = 1, default_val = min, id = undefined, color = "#FFFFFF", classlist = []}) {
    let slider_container = document.createElement("div");
    slider_container.classList.add("col");

    let buf_col = document.createElement("div");
    
    let label = document.createElement("div");
    label.classList.add(...label_classlist);
    label.textContent = label_name + ": " + default_val;

    let slider = gen_slider(min, max, step, default_val, id, color, classlist, label);

    //we set IDs here because the slider's id is potentially only meaningful after gen_slider() is called
    label.id = slider.id + "_label";
    slider_container.id = slider.id + "-container";

    buf_col.append(slider, label);
    slider_container.appendChild(buf_col);

    return slider_container;
}

/** Creates a slider input (input type = range) given styling parameters
 * 
 * @param {Number | String} min - The minimum value for the slider. defaults to 0
 * @param {Number | String} max - The maximum value for the slider. defaults to 100
 * @param {Number | String} step - The granularity between possible values. defaults to 1
 * @param {Number | String} default_val - The default value to set the slider to.
 * @param {String} id - The element ID to use for the slider. defaults to the current date time
 * @param {String} color - The hex color to use for the slider. Needs the # character.
 * @param {Array<String>} classlist - A list of classes to add to the slider.
 * @returns 
 */
function gen_slider(min = 0, max = 100, step = 1, default_val = min, id = undefined, color = "#FFFFFF", classlist = [], label = undefined) {
    //simple attribute vals
    let slider = document.createElement("input");
    slider.type = "range";
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = default_val;
    slider.autocomplete = "off";
    if (id) {
        if (document.getElementById(id)) {
            throw new Error("ID " + id + " already exists within the DOM.")
        } else {
            slider.id = id;
        }
    } else {
        slider.id = new Date().toLocaleTimeString();
    }
    slider.color = color;
    slider.classList.add(...classlist); //special spread operator - 
     //necessary for display purposes
     slider.style.webkitAppearance = "none";
     slider.style.borderRadius = "30px";
     slider.style.height = "0.5rem";
     slider.classList.add("px-0", "slider");

    //set up recoloring
    slider.addEventListener("change", function(e) {
        recolor_slider(slider, label);
    });
    //do recoloring for the default val
    let pct = Math.round(100 * (parseInt(slider.value) - parseInt(slider.min)) / (parseInt(slider.max) - parseInt(slider.min)));
    slider.style.background = `rgba(0, 0, 0, 0) linear-gradient(to right, ${color}, ${color} ${pct}%, #AAAAAA ${pct}%, #AAAAAA 100%)`;  

    //return slider
    return slider;
}

/** Recolors a slider. If the corresponding label exists, also update that.
 * 
 * @param {slider} slider - the slider element
 * @param {label} label - the label element
 */
function recolor_slider(slider, label) {
    let color = slider.color;
    let pct = Math.round(100 * (parseInt(slider.value) - parseInt(slider.min)) / (parseInt(slider.max) - parseInt(slider.min)));
    slider.style.background = `rgba(0, 0, 0, 0) linear-gradient(to right, ${color}, ${color} ${pct}%, #AAAAAA ${pct}%, #AAAAAA 100%)`;  

    if (label) {
        //convention is that the number goes at the end... I parse by separating it at ':'
        label.textContent = label.textContent.split(":")[0] + ": " + slider.value;
    }
} 

/**
 * Shorthand for making an element in html.
 *
 * @param {String} type : type of element
 * @param {List[String]} classlist : css classes for element
 * @param {Map[String, String]} args : Properties for the element
 */
function make_elem(type, classlist = [], args = {}) {
    const ret_elem = document.createElement(type);
    ret_elem.classList.add(...classlist);
    for (const i in args) {
        if (i === 'style') {
            const style_obj = args[i];
            if (typeof style_obj === 'string' || style_obj instanceof String) {
                ret_elem.style = style_obj;
                continue;
            }
            for (const k in style_obj) {
                ret_elem.style[k] = style_obj[k];
            }
            continue;
        }
        ret_elem[i] = args[i];
    }
    return ret_elem;
}

/**
 * Nodes must have:
 * node: {
 *   parents: List[node]
 *   children: List[node]
 * }
 *
 * This function will define: "visited, assigned, scc" properties
 * Assuming a connected graph. (only one root)
 */
function make_SCC_graph(root_node, nodes) {
    for (const node of nodes) {
        node.visited = false;
        node.assigned = false;
        node.scc = null;
    }
    const res = []
    /*
     * SCC graph construction.
     * https://en.wikipedia.org/wiki/Kosaraju%27s_algorithm
     */
    function visit(u, res) {
        if (u.visited) { return; }
        u.visited = true;
        for (const child of u.children) {
            if (!child.visited) { visit(child, res); }
        }
        res.push(u);
    }
    visit(root_node, res);
    res.reverse();
    const sccs = [];
    function assign(node, cur_scc) {
        if (node.assigned) { return; }
        cur_scc.nodes.push(node);
        node.scc = cur_scc;
        node.assigned = true;
        for (const parent of node.parents) {
            assign(parent, cur_scc);
        }
    }
    for (const node of res) {
        if (node.assigned) { continue; }
        const cur_scc = {
            nodes: [],
            children: new Set(),
            parents: new Set()
        };
        assign(node, cur_scc);
        sccs.push(cur_scc);
    }
    for (const scc of sccs) {
        for (const node of scc.nodes) {
            for (const child of node.children) {
                scc.children.add(child.scc);
            }
            for (const parent of node.parents) {
                scc.parents.add(parent.scc);
            }
        }
    }
    return sccs;
}


// Toggles display of a certain element, given the ID.
function toggle_tab(tab) {
    let elem = document.getElementById(tab);
    if (elem.style.display == "none") {
        elem.style.display = "";
    } else {
        elem.style.display = "none";
    }
}

// Toggle display of a certain tab, in a group of tabs, given the target tab ID, and a list of associated tabs.
// Also sets visual display of an element with ID of target + "-btn" to selected.
function show_tab(target, tabs) {
    //hide all tabs, then show the tab of the div clicked and highlight the correct button
    for (const i in tabs) {
        document.getElementById(tabs[i]).style.display = "none";
        document.getElementById(tabs[i] + "-btn").classList.remove("selected-btn");
    }
    document.getElementById(target).style.display = "";
    document.getElementById(target + "-btn").classList.add("selected-btn");
}

// mobile navbar appearance control
let scrollPos = 0
if (screen.width < 992) {
    document.addEventListener('scroll', (e) => {
        if (document.documentElement.scrollTop - scrollPos > 20) {
            document.getElementById("mobile-navbar").style.display = "none";
            document.getElementById("mobile-navbar-dropdown").style.display = "none";
        } else if (document.documentElement.scrollTop - scrollPos < -50 || scrollPos < 70) {
            document.getElementById("mobile-navbar").style.display = "";
        }
        scrollPos = document.documentElement.scrollTop;
    });
}
