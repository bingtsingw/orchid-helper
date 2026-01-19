/**
 * UUID25 格式的最大值（对应 UUID 的最大值 ffffffff-ffff-ffff-ffff-ffffffffffff）
 * 这是一个 36 进制的 25 位字符串表示
 */
const Base36MAX = 'f5lxx1zz5pnorynqglhzmsp33';

const assert: (cond: boolean, msg: string) => asserts cond = (cond, msg) => {
  if (!cond) {
    throw new Error('Assertion failed: ' + msg);
  }
};

const newParseError = () => new SyntaxError('could not parse a UUID string');

/**
 * 将字符串中的数字字符解码为数值数组
 * @param digitChars - 要解码的字符串（如 "abc123"）
 * @param base - 进制基数（2-36）
 * @returns {Uint8Array} 解码后的数值数组
 * @throws {Error} 当进制无效或字符无效时抛出错误
 *
 * @example
 * decodeDigitChars("1a2b", 16) // 返回 [1, 10, 2, 11]
 */
function decodeDigitChars(digitChars: string, base: number): Uint8Array {
  // ASCII 字符到数值的映射表
  // 0x7f 表示无效字符
  // 索引 48-57 (字符 '0'-'9') 映射到 0x00-0x09
  // 索引 65-90 (字符 'A'-'Z') 映射到 0x0a-0x23
  // 索引 97-122 (字符 'a'-'z') 映射到 0x0a-0x23
  // prettier-ignore
  const DECODE_MAP = [
    0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f,
    0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f,
    0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14,
    0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23, 0x7f, 0x7f, 0x7f, 0x7f,
    0x7f, 0x7f, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a,
    0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f,
  ];

  assert(2 <= base && base <= 36, 'invalid base');
  const len = digitChars.length;
  const digitValues = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    // 将字符转换为对应的数值
    digitValues[i] = DECODE_MAP[digitChars.charCodeAt(i)] ?? 0x7f;
    // 验证数值是否在指定进制范围内
    assert(digitValues[i]! < base, 'invalid digit character');
  }
  return digitValues;
}

/**
 * 进制转换函数 - 将数字从一个进制转换到另一个进制
 * @param src - 源数值数组
 * @param srcBase - 源进制（2-256）
 * @param dstBase - 目标进制（2-256）
 * @param dstSize - 目标数组大小
 * @returns {Uint8Array} 转换后的数值数组
 * @throws {Error} 当进制无效或目标数组太小时抛出错误
 *
 * @example
 * // 将 16 进制 [15, 15] (0xFF) 转换为 10 进制
 * convertBase(new Uint8Array([15, 15]), 16, 10, 3) // 返回 [2, 5, 5] (255)
 */
function convertBase({
  src,
  srcBase,
  dstBase,
  dstSize,
}: {
  src: Uint8Array;
  srcBase: number;
  dstBase: number;
  dstSize: number;
}): Uint8Array {
  assert(2 <= srcBase && srcBase <= 256 && 2 <= dstBase && dstBase <= 256, 'invalid base');

  // 确定每次外循环要读取的源数字位数
  // 这样做是为了优化性能，一次处理多个数字
  let wordLen = 1;
  let wordBase = srcBase;
  while (wordBase <= Number.MAX_SAFE_INTEGER / (srcBase * dstBase)) {
    wordLen++;
    wordBase *= srcBase;
  }

  const dst = new Uint8Array(dstSize);

  const srcSize = src.length;
  if (srcSize === 0) {
    return dst;
  } else {
    assert(dstSize > 0, 'too small dst');
  }

  // 用于记录目标数组已填充的范围
  let dstUsed = dstSize - 1;

  // 每次外循环从源数组读取 wordLen 个数字
  let wordHead = srcSize % wordLen;
  if (wordHead > 0) {
    wordHead -= wordLen;
  }

  for (; wordHead < srcSize; wordHead += wordLen) {
    // 将 wordLen 个源数字合并为一个大数
    let carry = 0;
    for (let i = wordHead < 0 ? 0 : wordHead; i < wordHead + wordLen; i++) {
      assert(src[i]! < srcBase, 'invalid src digit');
      carry = carry * srcBase + src[i]!;
    }

    // 从右到左填充目标数组，同时将之前的结果向左进位
    for (let i = dstSize - 1; i >= 0; i--) {
      carry += dst[i]! * wordBase;
      const quo = Math.trunc(carry / dstBase);
      dst[i] = carry - quo * dstBase; // 余数
      carry = quo;

      // 当进位为零且剩余的目标数字都为零时，跳出内循环
      if (carry === 0 && i <= dstUsed) {
        dstUsed = i;
        break;
      }
    }
    assert(carry === 0, 'too small dst');
  }

  return dst;
}

/**
 * 将数值数组转换为 36或16 进制字符串（UUID25 格式）
 * @param digitValues - 数值数组
 * @param base - 源进制（16,36）
 * @returns {string} 36或16 进制字符串
 * @throws {Error} 当数组长度无效或数值无效时抛出错误
 *
 * @example
 * fromDigitValues(new Uint8Array([0, 1, 2, ...])) // 返回 "012..."
 */
function fromDigitValues(digitValues: Uint8Array, base: 16 | 36): string {
  assert(
    (digitValues.length === 32 && base === 16) || (digitValues.length === 25 && base === 36),
    'invalid length of digit value array',
  );

  // 16 进制字符集：0-9 和 a-f
  // 36 进制字符集：0-9 和 a-z
  const digits = base === 36 ? '0123456789abcdefghijklmnopqrstuvwxyz' : '0123456789abcdef';
  let buffer = '';
  for (const e of digitValues) {
    assert(e < digits.length, 'invalid digit value');
    buffer += digits.charAt(e);
  }
  return buffer;
}

/**
 * 解析十六进制 UUID 字符串并转换为 UUID25 格式
 * @param uuidString - 十六进制 UUID 字符串（不带连字符）
 * @returns {string} UUID25 格式字符串（25 位 36 进制）
 * @throws {SyntaxError} 当字符串无效时抛出错误
 *
 * @example
 * parseHex("550e8400e29b41d4a716446655440000") // 返回 UUID25 格式
 */
function parseHex(uuidString?: string): string {
  if (uuidString === undefined) {
    throw newParseError();
  }
  // 将十六进制字符串解码为数值数组
  const src = decodeDigitChars(uuidString, 16);
  // 将 16 进制转换为 36 进制（25 位）
  return fromDigitValues(convertBase({ src, srcBase: 16, dstBase: 36, dstSize: 25 }), 36);
}

/**
 * 解析三十六进制 UUID 字符串并转换为 UUID7 格式
 * @param uuidString - 三十六进制 UUID 字符串
 * @returns {string} UUID25 格式字符串（36 位 16 进制）
 * @throws {SyntaxError} 当字符串无效时抛出错误
 *
 * @example
 * parseHex("550e8400e29b41d4a716446655440000") // 返回 UUID25 格式
 */
function parseBase36(uuidString?: string): string {
  if (uuidString === undefined) {
    throw newParseError();
  }
  assert(uuidString <= Base36MAX, '128-bit overflow');
  // 将三十六进制字符串解码为数值数组
  const src = decodeDigitChars(uuidString, 36);
  // 将 36 进制转换为 16 进制（36 位）
  const res = fromDigitValues(convertBase({ src, srcBase: 36, dstBase: 16, dstSize: 32 }), 16);
  return `${res.slice(0, 8)}-${res.slice(8, 12)}-${res.slice(12, 16)}-${res.slice(16, 20)}-${res.slice(20, 32)}`;
}

/**
 * 解析标准的带连字符的 UUID 字符串（8-4-4-4-12 格式）
 * @param uuidString - 标准 UUID 字符串，如 "550e8400-e29b-41d4-a716-446655440000"
 * @returns {string} UUID25 格式字符串
 * @throws {SyntaxError} 当格式无效时抛出错误
 *
 * @example
 * parseHyphenated("550e8400-e29b-41d4-a716-446655440000") // 返回 UUID25 格式
 */
function parseHyphenated(uuidString: string): string {
  // 使用正则表达式匹配标准 UUID 格式，并提取各部分
  // 然后将连字符去除，合并为一个完整的十六进制字符串
  return parseHex(
    /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/i.exec(uuidString)?.slice(1, 6).join(''),
  );
}

/**
 * UUID 编码器 - 将不同格式的 UUID 字符串统一转换为 UUID25 格式
 * @param uuidString - UUID 字符串，支持两种格式：
 *   - 25 位 UUID25 格式（36 进制）
 *   - 36 位标准 UUID 格式（带连字符，如 "550e8400-e29b-41d4-a716-446655440000"）
 * @returns {string} UUID25 格式字符串（25 位小写 36 进制）
 * @throws {SyntaxError} 当格式无效时抛出错误
 *
 * @example
 * // 解析标准 UUID
 * encode("550e8400-e29b-41d4-a716-446655440000") // 返回 UUID25 格式
 *
 * // 解析 UUID25 格式
 * encode("0123456789abcdefghijklmno") // 返回小写的 UUID25 格式
 */
export const uuid25encode = (uuidString: string): string => {
  // 标准 UUID 格式（带连字符，8-4-4-4-12）
  if (uuidString.length !== 36) {
    throw newParseError();
  }
  return parseHyphenated(uuidString);
};

export const uuid25decode = (uuidString: string): string => {
  if (uuidString.length !== 25) {
    throw newParseError();
  }

  // 将十六进制字符串解码为数值数组
  return parseBase36(uuidString);
};
