'use strict';

const lstsq   = require('../regression').lstsq;
const Matrix  = require('../matrix');
const bi_md5  = require('blueimp-md5');

const md5     = (x) => bi_md5(x);


/**
 * Private members
 *
 * @private
 */
const _parts  = Symbol('parts');
const _model  = Symbol('model');
const _cache  = Symbol('cache');


/**
 * Term is a combination of input columns and exponents, such as x^2*y^3.
 *
 * @class Term
 */
class Term {

  /**
   * Creates a new Term.
   *
   * @constructor
   * @param {Model}             model         Model that owns this Term
   * @param {[num, num, num][]} parts         List of triples of numbers
   * @param {number}            parts[i][0]   First is the index of a column
   * @param {number}            parts[i][1]   Second is the exponent to raise
   *                                          that column to
   * @param {number}           [parts[i][2]]  Third is the lag to apply to that
   *                                          column
   */
  constructor(model, parts) {
    if (!parts.every(Array.isArray)) {
      throw new TypeError('Part does not match: [col, exp (,lag)]');
    }

    this[_parts] = parts.map((part) => {
      if (part.length < 2) {
        throw new TypeError('Part does not match: [col, exp (,lag)]');
      }
      if (part.length < 3) {
        return part.concat(0);
      }
      return part.slice();
    });

    this[_model] = model;

    this[_cache] = { col: {} };

    this.isIntercept = parts[0][0] === 0 &&
                       parts[0][1] === 0 &&
                       parts.length === 1;

    try {
      this.col();
    } catch (e) {
      // TODO: Pass up errors so that suspicious columns can be marked
    }
  }

  /**
   * Computes least squares regression and analysis statistics on the parent
   * model PLUS this term.
   *
   * @return {t: number, mse: number} Statistics for the regression
   */
  getStats(subset=this[_model].DEFAULT_SUBSET) {
    let lag = Math.max(this[_model].highestLag(), this.lag)
      , XLagged = this[_model].X(subset).hstack(this.col(subset)).lo(lag)
      , yLagged = this[_model].y(subset).lo(lag)
      , theStats;

    try {
      theStats = lstsq(XLagged, yLagged);
      theStats.coeff = theStats.weights.get(0, theStats.weights.shape[0]-1);
      theStats.t = theStats.t.get(0, theStats.t.shape[0]-1);
      theStats.pt = theStats.pt.get(0, theStats.pt.shape[0]-1);
      delete theStats.weights;

      return theStats;
    } catch (e) {
      console.error(e);
      console.log(this.valueOf());
      console.log(this.col());
      return NaN;
    }
  }

  X(subset=this[_model].DEFAULT_SUBSET) {
    let lag = Math.max(this[_model].highestLag(), this.lag);
    return this[_model].X(subset).hstack(this.col(subset)).lo(lag);
  }

  y(subset=this[_model].DEFAULT_SUBSET) {
    let lag = Math.max(this[_model].highestLag(), this.lag);
    return this[_model].y(subset).lo(lag);
  }

  clearCache() {
    this[_cache].col = {};
    return this;
  }

  /**
   * Determines if this term is equivalent to `other`.
   *
   * @param {Term | [num, num, num][]}  other Term to compare against
   * @return {boolean} True if the terms are equivalent, false otherwise
   */
  equals(other) {
    other = other.valueOf();
    return Term.hash(other) === Term.hash(this);
  }

  /**
   * Returns the information necessary to reconstruct the term in a plain
   * object (except the reference to the model).
   *
   * @return {[num, num, num][]} List of [col, exp, lag] triples
   */
  valueOf() {
    return this[_parts].slice();
  }

  /**
   * Compute the data column for a given matrix.
   *
   * @return {Matrix<n,1>} n x 1 Matrix -- polynomial combo of columns in term
   */
  col(subset=this[_model].DEFAULT_SUBSET) {
    if (this[_cache].col[subset] != null) {
      return this[_cache].col[subset];
    }

    let data = this[_model].data(subset)
      , prod = Matrix.zeros(data.shape[0], 1).add(1)
      , i, col;

    for (i = 0; i < this[_parts].length; i += 1) {
      col = data.col(this[_parts][i][0]);

      // Check for negative exponent & potential 0 value
      if (col.max() * col.min() <= 0 && this[_parts][i][1] < 0) {
        throw new Error(`Divide by zero error for column ${this[_parts][i][0]}`);
      }

      prod = prod.dotMultiply(col.dotPow(this[_parts][i][1])
                                 .shift(this[_parts][i][2]));
    }

    this[_cache].col[subset] = prod;
    return this[_cache].col[subset];
  }

  get lag() {
    return Math.max.apply(null, this[_parts].map((part) => part[2]));
  }

  /**
   * Give a representation of the term in a pretty format.
   *
   * @return {string} Representation of this term
   */
  inspect(depth, options) {
    return 'Term < ' + this[_parts]
      .map((t) => String.fromCharCode(t[0] + 97)
           + '^' + t[1]
           + '[' + t[2] + ']')
      .join(' * ') + ' >';
  }

  static hash(term) {
    term = term.valueOf().map((part) => {
      if (part.length < 2) {
        throw new TypeError('Part does not match: [col, exp (,lag)]');
      }
      if (part.length < 3) {
        return part.concat(0);
      }
      return part.slice();
    });

    return md5(term.map(md5).sort().join());
  }

}

module.exports = Term;