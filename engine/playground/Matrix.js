

const _data = Symbol('data');
const _n    = Symbol('n');
const _m    = Symbol('m');


function swapRows(m, i, j) {
  var k, temp;

  for (k = 0; k < m[_m]; k += 1) {
    temp = m[_data][j * m[_m] + k];
    m[_data][j * m[_m] + k] = m[_data][i * m[_m] + k];
    m[_data][i * m[_m] + k] = temp;
  }
}

function divideRow(m, inv, i, factor) {
  var k, temp;

  for (k = 0; k < m[_m]; k += 1) {
    m[_data][i * m[_m] + k] /= factor;
    inv[_data][i * m[_m] + k] /= factor;
  }
}

function subtractRowMultiple(m, inv, i, j) {
  var k, l, factor;

  for (l = 0; l < m[_n]; l += 1) {
    factor = m[_data][l * m[_m] + j];

    if (l !== i) {
      for (k = 0; k < m[_m]; k += 1) {
        m[_data][l * m[_m] + k] -= m[_data][i * m[_m] + k] * factor;
        inv[_data][l * m[_m] + k] -= inv[_data][i * m[_m] + k] * factor;
      }
    }
  }
}


class Matrix {

  constructor(n, m, stuff) {
    if (stuff != null) {
      stuff = (stuff instanceof Float64Array)
              ? stuff
              : Float64Array.from(stuff);
    } else {
      stuff = new Float64Array(n * m);
    }
    this[_data] = stuff;
    this[_n] = n;
    this[_m] = m;
  }

  multiply(other) {
    if (this[_m] !== other[_n]) {
      throw new Error('Dimensions do not match');
    }

    var product = new Matrix(this[_n], other[_m])
      , i, j, k, sum;

    for (i = 0; i < this[_n]; i += 1) {
      for (j = 0; j < other[_m]; j += 1) {
        for (k = 0, sum = 0; k < this[_m]; k += 1) {
          sum += this[_data][i * this[_m] + k] *
                 other[_data][k * other[_m] + j];
        }
        product[_data][i * other[_m] + j] = sum;
      }
    }
    return product;
  }

  inv() {
    if (this[_n] !== this[_m]) {
      throw new Error('Must be square');
    }

    var self = this.clone()
      , inverse = Matrix.ones(this[_n], this[_m])
      , i, j, k, factor;

    for (i = 0, j = 0; i < self[_n] && j < self[_m]; i += 1, j += 1) {
      if (self[_data] === 0) {
        for (
          k = 0;
          self[_data][k * self[_m] + j] !== 0 && k < self[_n];
          k += 1
        )
          ;
        if (k >= self[_n]) {
          j += 1;
          continue;
        }
        swapRows(self, j, k);
        swapRows(inverse, j, k);
      }
      divideRow(self, inverse, j, self[_data][j * self[_m] + j]);
      subtractRowMultiple(self, inverse, i, j);
    }
    return inverse;
  }

  clone() {
    return new Matrix(this[_n], this[_m], this[_data].slice());
  }

  toString() {
    var str = '';
    var colSizes = [];
    var i, j, max, n;

    for (j = 0; j < this[_m]; j += 1) {
      for (max = 0, i = 0; i < this[_n]; i += 1) {
        max = Math.max(max, (''+this[_data][i * this[_m] + j]).length);
      }
      colSizes.push(max);
    }

    for (i = 0; i < this[_n]; i += 1) {
      for (j = 0; j < this[_m] - 1; j += 1) {
        n = ''+this[_data][i * this[_m] + j];
        str += Array(colSizes[j] - n.length + 1).join(' ') + n + ' ';
      }
      n = ''+this[_data][i * this[_m] + j];
      str += Array(colSizes[j] - n.length + 1).join(' ') + n + '\n';
    }
    return str;
  }

  get T() {
    var transpose = new Matrix(this[_m], this[_n])
      , i, j;

    for (i = 0; i < this[_n]; i += 1) {
      for (j = 0; j < this[_m]; j += 1) {
        transpose[_data][j * this[_n] + i] = this[_data][i * this[_m] + j];
      }
    }
    return transpose;
  }

  get shape() {
    return [this[_n], this[_m]];
  }

  get data() {
    return this[_data];
  }

  static random(n, m) {
    var randMatrix = new Matrix(n, m)
      , i, j;

    for (i = 0; i < n; i += 1) {
      for (j = 0; j < m; j += 1) {
        randMatrix[_data][i * m + j] = Math.random();
      }
    }
    return randMatrix;
  }

  static ones(n, m=n) {
    var onez = new Matrix(n, m)
      , i, j;

    for (i = 0; i < n; i += 1) {
      onez[_data][i * m + i] = 1;
    }
    return onez;
  }

}


var X = Matrix.random(500, 9)
  , y = Matrix.random(500, 1);


var N = 2000;

function lstsq(A, b) {
  return (A.T.multiply(A)).inv().multiply(A.T).multiply(b);
}

console.time('lstsq');
for (var i = 0; i < N; i += 1) {
  lstsq(X, y).toString();
}
console.timeEnd('lstsq');

