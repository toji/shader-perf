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

// Program that attempts to allow the browser to asynchronously compile and link

var AsyncProgram = function(gl) {
  this.gl = gl;
  this.program = gl.createProgram();
  this.attrib = null;
  this.uniform = null;

  this._firstUse = true;
  this._vertexShader = null;
  this._fragmentShader = null;
}

AsyncProgram.prototype.attachShaderSource = function(source, type) {
  var gl = this.gl;
  var shader;

  switch (type) {
    case gl.VERTEX_SHADER:
      this._vertexShader = gl.createShader(type);
      shader = this._vertexShader;
      break;
    case gl.FRAGMENT_SHADER:
      this._fragmentShader = gl.createShader(type);
      shader = this._fragmentShader;
      break;
    default:
      console.Error("Invalid Shader Type:", type);
      return;
  }

  gl.attachShader(this.program, shader);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
}

AsyncProgram.prototype.attachShaderSourceFromXHR = function(url, type) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.addEventListener("load", function (ev) {
      if (xhr.status == 200) {
        self.attachShaderSource(xhr.response, type);
        resolve();
      } else {
        reject(xhr.statusText);
      }
    }, false);
    xhr.open("GET", url, true);
    xhr.send(null);
  });
}

AsyncProgram.prototype.attachShaderSourceFromTag = function(selector, type) {
  var shaderTag = document.querySelector(selector);
  if (!shaderTag) {
    console.error("Shader source tag not found:", selector);
    return;
  }

  var src = "";
  var k = shaderTag.firstChild;
  while (k) {
    if (k.nodeType == 3) {
      src += k.textContent;
    }
    k = k.nextSibling;
  }
  this.attachShaderSource(src, type);
}

AsyncProgram.prototype.bindAttribLocation = function(attribLocationMap) {
  var gl = this.gl;
  
  if (attribLocationMap) {
    this.attrib = {};
    for (var attribName in attribLocationMap) {
      gl.bindAttribLocation(this.program, attribLocationMap[attribName], attribName);
      this.attrib[attribName] = attribLocationMap[attribName];
    }
  }
}

AsyncProgram.prototype.link = function() {
  this.gl.linkProgram(this.program);
}

AsyncProgram.prototype.use = function() {
  var gl = this.gl;

  // If this is the first time the program has been used do all the error checking and
  // attrib/uniform querying needed.
  if (this._firstUse) {
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      if (this._vertexShader && !gl.getShaderParameter(this._vertexShader, gl.COMPILE_STATUS)) {
        console.error("Vertex shader compile error:", gl.getShaderInfoLog(this._vertexShader));
      } else if (this._fragmentShader && !gl.getShaderParameter(this._fragmentShader, gl.COMPILE_STATUS)) {
        console.error("Fragment shader compile error:", gl.getShaderInfoLog(this._fragmentShader));
      } else {
        console.error("Program link error:", gl.getProgramInfoLog(this.program));
      }
      gl.deleteProgram(this.program);
      this.program = null;
    } else {
      if (!this.attrib) {
        this.attrib = {};
        var attribCount = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
        for (var i = 0; i < attribCount; i++) {
          var attribInfo = gl.getActiveAttrib(this.program, i);
          this.attrib[attribInfo.name] = gl.getAttribLocation(this.program, attribInfo.name);
        }
      }

      this.uniform = {};
      var uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < uniformCount; i++) {
        var uniformInfo = gl.getActiveUniform(this.program, i);
        this.uniform[uniformInfo.name] = gl.getUniformLocation(this.program, uniformInfo.name);
      }
    }
    gl.deleteShader(this._vertexShader);
    gl.deleteShader(this._fragmentShader);
    this._firstUse = false;
  }

  gl.useProgram(this.program);
}

// Program that checks for errors and queries uniforms/attribs immediately

var SyncProgram = function(gl) {
  this.gl = gl;
  this.program = gl.createProgram();
  this.attrib = null;
  this.uniform = null;
}

SyncProgram.prototype.attachShaderSource = function(source, type) {
  var gl = this.gl;
  var shader = gl.createShader(type);
  gl.attachShader(this.program, shader);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (shader && !gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
  }

  gl.deleteShader(shader);
}

SyncProgram.prototype.attachShaderSourceFromXHR = AsyncProgram.prototype.attachShaderSourceFromXHR;

SyncProgram.prototype.attachShaderSourceFromTag = AsyncProgram.prototype.attachShaderSourceFromTag;

SyncProgram.prototype.bindAttribLocation = AsyncProgram.prototype.bindAttribLocation;

SyncProgram.prototype.link = function() {
  var gl = this.gl;
  gl.linkProgram(this.program);

  if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(this.program));
    gl.deleteProgram(this.program);
    this.program = null;
    return;
  }

  if (!this.attrib) {
    this.attrib = {};
    var attribCount = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
    for (var i = 0; i < attribCount; i++) {
      var attribInfo = gl.getActiveAttrib(this.program, i);
      this.attrib[attribInfo.name] = gl.getAttribLocation(this.program, attribInfo.name);
    }
  }

  this.uniform = {};
  var uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
  for (var i = 0; i < uniformCount; i++) {
    var uniformInfo = gl.getActiveUniform(this.program, i);
    this.uniform[uniformInfo.name] = gl.getUniformLocation(this.program, uniformInfo.name);
  }
}

SyncProgram.prototype.use = function() {
  this.gl.useProgram(this.program);
}