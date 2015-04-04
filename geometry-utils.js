/*
Copyright (c) 2015, Brandon Jones.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

"use strict";

var generateNormals = (function() {
  var a = new Float32Array(3);
  var b = new Float32Array(3);
  var c = new Float32Array(3);
  var n = new Float32Array(3);

  function getVec3FromIndex(out, vecArray, stride, offset, index) {
    out[0] = vecArray[(index*stride)+offset];
    out[1] = vecArray[(index*stride)+offset+1];
    out[2] = vecArray[(index*stride)+offset+2];
  }

  function setVec3AtIndex(v, vecArray, stride, offset, index) {
    vecArray[(index*stride)+offset] = v[0];
    vecArray[(index*stride)+offset+1] = v[1];
    vecArray[(index*stride)+offset+2] = v[2];
  }

  return function(vertexArray, stride, offset, count, indexArray) {
    var normalArray = new Float32Array(3 * count);

    var i, j;
    var idx0, idx1, idx2;
    var indexCount = indexArray.length;
    for(i = 0; i < indexCount; i+=3) {
      idx0 = indexArray[i];
      idx1 = indexArray[i+1];
      idx2 = indexArray[i+2];

      getVec3FromIndex(a, vertexArray, stride, offset, idx0);
      getVec3FromIndex(b, vertexArray, stride, offset, idx1);
      getVec3FromIndex(c, vertexArray, stride, offset, idx2);

      // Generate the normal
      var abx = b[0] - a[0];
      var aby = b[1] - a[1];
      var abz = b[2] - a[2];

      var acx = c[0] - a[0];
      var acy = c[1] - a[1];
      var acz = c[2] - a[2];

      var nx = aby * acz - abz * acy;
      var ny = abz * acx - abx * acz;
      var nz = abx * acy - aby * acx;

      normalArray[(idx0 * 3)] += nx;
      normalArray[(idx0 * 3)+1] += ny;
      normalArray[(idx0 * 3)+2] += nz;

      normalArray[(idx1 * 3)] += nx;
      normalArray[(idx1 * 3)+1] += ny;
      normalArray[(idx1 * 3)+2] += nz;

      normalArray[(idx2 * 3)] += nx;
      normalArray[(idx2 * 3)+1] += ny;
      normalArray[(idx2 * 3)+2] += nz;
    }

    for(i = 0; i < count; ++i) {
      getVec3FromIndex(n, normalArray, 3, 0, i);

      // Normalize accumulated 
      var len = n[0]*n[0] + n[1]*n[1] + n[2]*n[2];
      if (len > 0) {
        len = 1.0 / Math.sqrt(len);
        n[0] *= len;
        n[1] *= len;
        n[2] *= len;
      }

      setVec3AtIndex(n, normalArray, 3, 0, i);
    }

    return normalArray;
  };
})();