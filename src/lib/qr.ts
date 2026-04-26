export type QrMatrix = {
  size: number;
  modules: boolean[][];
};

const versionData = [
  { version: 1, dataCodewords: 19, ecCodewords: 7, blocks: 1, alignment: [] },
  { version: 2, dataCodewords: 34, ecCodewords: 10, blocks: 1, alignment: [6, 18] },
  { version: 3, dataCodewords: 55, ecCodewords: 15, blocks: 1, alignment: [6, 22] },
  { version: 4, dataCodewords: 80, ecCodewords: 20, blocks: 1, alignment: [6, 26] },
  { version: 5, dataCodewords: 108, ecCodewords: 26, blocks: 1, alignment: [6, 30] },
  { version: 6, dataCodewords: 136, ecCodewords: 18, blocks: 2, alignment: [6, 34] }
];

const formatGenerator = 0x537;
const formatMask = 0x5412;
const byteMode = 0b0100;
const errorCorrectionLow = 0b01;

function getUtf8Bytes(value: string) {
  return Array.from(new TextEncoder().encode(value));
}

function appendBits(bits: number[], value: number, length: number) {
  for (let index = length - 1; index >= 0; index -= 1) {
    bits.push((value >>> index) & 1);
  }
}

function chooseVersion(byteLength: number) {
  const config = versionData.find((item) => byteLength <= item.dataCodewords - 2);
  if (!config) {
    throw new Error('QR content is too long');
  }
  return config;
}

function createDataCodewords(text: string, dataCodewords: number) {
  const bytes = getUtf8Bytes(text);
  const bits: number[] = [];

  appendBits(bits, byteMode, 4);
  appendBits(bits, bytes.length, 8);
  bytes.forEach((byte) => appendBits(bits, byte, 8));
  appendBits(bits, 0, Math.min(4, dataCodewords * 8 - bits.length));

  while (bits.length % 8 !== 0) bits.push(0);

  const codewords: number[] = [];
  for (let index = 0; index < bits.length; index += 8) {
    codewords.push(Number.parseInt(bits.slice(index, index + 8).join(''), 2));
  }

  for (let padIndex = 0; codewords.length < dataCodewords; padIndex += 1) {
    codewords.push(padIndex % 2 === 0 ? 0xec : 0x11);
  }

  return codewords;
}

const expTable = new Array<number>(512);
const logTable = new Array<number>(256);

let value = 1;
for (let index = 0; index < 255; index += 1) {
  expTable[index] = value;
  logTable[value] = index;
  value <<= 1;
  if (value & 0x100) value ^= 0x11d;
}
for (let index = 255; index < 512; index += 1) {
  expTable[index] = expTable[index - 255];
}

function gfMultiply(first: number, second: number) {
  if (first === 0 || second === 0) return 0;
  return expTable[logTable[first] + logTable[second]];
}

function generatorPolynomial(degree: number) {
  let result = [1];
  for (let degreeIndex = 0; degreeIndex < degree; degreeIndex += 1) {
    const next = new Array<number>(result.length + 1).fill(0);
    result.forEach((coefficient, index) => {
      next[index] ^= coefficient;
      next[index + 1] ^= gfMultiply(coefficient, expTable[degreeIndex]);
    });
    result = next;
  }
  return result;
}

function createErrorCorrection(data: number[], ecCodewords: number) {
  const generator = generatorPolynomial(ecCodewords);
  const result = new Array<number>(ecCodewords).fill(0);

  data.forEach((codeword) => {
    const factor = codeword ^ result.shift()!;
    result.push(0);
    generator.slice(1).forEach((coefficient, index) => {
      result[index] ^= gfMultiply(coefficient, factor);
    });
  });

  return result;
}

function splitBlocks(codewords: number[], blockCount: number) {
  const blockSize = codewords.length / blockCount;
  return Array.from({ length: blockCount }, (_, index) => codewords.slice(index * blockSize, (index + 1) * blockSize));
}

function interleave(blocks: number[][]) {
  const result: number[] = [];
  const maxLength = Math.max(...blocks.map((block) => block.length));

  for (let offset = 0; offset < maxLength; offset += 1) {
    blocks.forEach((block) => {
      if (typeof block[offset] === 'number') result.push(block[offset]);
    });
  }

  return result;
}

function createMatrix(size: number) {
  return {
    modules: Array.from({ length: size }, () => new Array<boolean>(size).fill(false)),
    reserved: Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  };
}

function setModule(matrix: ReturnType<typeof createMatrix>, row: number, col: number, dark: boolean, reserved = true) {
  if (row < 0 || col < 0 || row >= matrix.modules.length || col >= matrix.modules.length) return;
  matrix.modules[row][col] = dark;
  matrix.reserved[row][col] = reserved;
}

function addFinder(matrix: ReturnType<typeof createMatrix>, row: number, col: number) {
  for (let y = -1; y <= 7; y += 1) {
    for (let x = -1; x <= 7; x += 1) {
      const absoluteRow = row + y;
      const absoluteCol = col + x;
      const isFinder = x >= 0 && x <= 6 && y >= 0 && y <= 6 && (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
      setModule(matrix, absoluteRow, absoluteCol, isFinder);
    }
  }
}

function addAlignment(matrix: ReturnType<typeof createMatrix>, centerRow: number, centerCol: number) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      const isDark = Math.max(Math.abs(x), Math.abs(y)) !== 1;
      setModule(matrix, centerRow + y, centerCol + x, isDark);
    }
  }
}

function addFunctionPatterns(matrix: ReturnType<typeof createMatrix>, version: (typeof versionData)[number]) {
  const size = matrix.modules.length;
  addFinder(matrix, 0, 0);
  addFinder(matrix, 0, size - 7);
  addFinder(matrix, size - 7, 0);

  for (let index = 8; index < size - 8; index += 1) {
    setModule(matrix, 6, index, index % 2 === 0);
    setModule(matrix, index, 6, index % 2 === 0);
  }

  version.alignment.forEach((row) => {
    version.alignment.forEach((col) => {
      const overlapsFinder = (row === 6 && col === 6) || (row === 6 && col === size - 7) || (row === size - 7 && col === 6);
      if (!overlapsFinder) addAlignment(matrix, row, col);
    });
  });

  setModule(matrix, size - 8, 8, true);

  for (let index = 0; index < 9; index += 1) {
    if (index !== 6) {
      setModule(matrix, 8, index, false);
      setModule(matrix, index, 8, false);
    }
  }
  for (let index = 0; index < 8; index += 1) {
    setModule(matrix, 8, size - 1 - index, false);
    setModule(matrix, size - 1 - index, 8, false);
  }
}

function maskBit(mask: number, row: number, col: number) {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

function addData(matrix: ReturnType<typeof createMatrix>, codewords: number[], mask: number) {
  const bits = codewords.flatMap((codeword) => Array.from({ length: 8 }, (_, index) => ((codeword >>> (7 - index)) & 1) === 1));
  const size = matrix.modules.length;
  let bitIndex = 0;
  let upward = true;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;

    for (let offset = 0; offset < size; offset += 1) {
      const row = upward ? size - 1 - offset : offset;
      for (let columnOffset = 0; columnOffset < 2; columnOffset += 1) {
        const targetCol = col - columnOffset;
        if (matrix.reserved[row][targetCol]) continue;

        const dark = Boolean(bits[bitIndex]);
        matrix.modules[row][targetCol] = maskBit(mask, row, targetCol) ? !dark : dark;
        bitIndex += 1;
      }
    }

    upward = !upward;
  }
}

function calculateFormatBits(mask: number) {
  const data = (errorCorrectionLow << 3) | mask;
  let bits = data << 10;

  for (let shift = 14; shift >= 10; shift -= 1) {
    if ((bits >>> shift) & 1) bits ^= formatGenerator << (shift - 10);
  }

  return ((data << 10) | bits) ^ formatMask;
}

function addFormatBits(matrix: ReturnType<typeof createMatrix>, mask: number) {
  const size = matrix.modules.length;
  const bits = calculateFormatBits(mask);
  const firstPositions = [
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
    [8, 7],
    [8, 8],
    [7, 8],
    [5, 8],
    [4, 8],
    [3, 8],
    [2, 8],
    [1, 8],
    [0, 8]
  ];
  const secondPositions = [
    [size - 1, 8],
    [size - 2, 8],
    [size - 3, 8],
    [size - 4, 8],
    [size - 5, 8],
    [size - 6, 8],
    [size - 7, 8],
    [8, size - 8],
    [8, size - 7],
    [8, size - 6],
    [8, size - 5],
    [8, size - 4],
    [8, size - 3],
    [8, size - 2],
    [8, size - 1]
  ];

  firstPositions.forEach(([row, col], index) => {
    setModule(matrix, row, col, ((bits >>> index) & 1) === 1);
  });
  secondPositions.forEach(([row, col], index) => {
    setModule(matrix, row, col, ((bits >>> index) & 1) === 1);
  });
}

export function createQrMatrix(text: string): QrMatrix {
  const bytes = getUtf8Bytes(text);
  const version = chooseVersion(bytes.length);
  const matrix = createMatrix(21 + (version.version - 1) * 4);
  const dataCodewords = createDataCodewords(text, version.dataCodewords);
  const dataBlocks = splitBlocks(dataCodewords, version.blocks);
  const ecBlocks = dataBlocks.map((block) => createErrorCorrection(block, version.ecCodewords));
  const codewords = [...interleave(dataBlocks), ...interleave(ecBlocks)];
  const mask = 0;

  addFunctionPatterns(matrix, version);
  addData(matrix, codewords, mask);
  addFormatBits(matrix, mask);

  return {
    size: matrix.modules.length,
    modules: matrix.modules
  };
}
