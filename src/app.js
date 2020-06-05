let GL = null;
let PROGINF = null;
let POSBUFF = null;

function main() {
    const canvas = document.getElementById('canv');

    const gl = canvas.getContext('webgl');

    if (gl == null) {
        alert('Unable to initialize WebGL');
        return;
    }

    GL = gl;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            offsetVector: gl.getUniformLocation(shaderProgram, 'offset'),
            scaleScalar: gl.getUniformLocation(shaderProgram, 'scale'),
        },
    };

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positions = [-1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0]

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    PROGINF = programInfo;
    POSBUFF = positionBuffer;

    drawScene(gl, programInfo, positionBuffer, {x: 0, y: 0}, 1.0);
}

function drawScene(gl, programInfo, buffers, offset, scale) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const FOV = 45 * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();
    
    mat4.perspective(projectionMatrix, FOV, aspect, zNear, zFar);

    const modelViewMatrix = mat4.create();

    mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -1]);

    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, numComponents,
            type, normalize, stride, offset);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }

    gl.useProgram(programInfo.program);

    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix,
        false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix,
        false, modelViewMatrix);

    gl.uniform1f(programInfo.uniformLocations.scaleScalar, scale);

    let o = vec2.fromValues(offset.x, offset.y);
    gl.uniform2fv(programInfo.uniformLocations.offsetVector, o);
    

    {
        const offset = 0;
        const vertexCount = 4;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send the source to the shader object
    gl.shaderSource(shader, source);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

window.onload = main;

let offset = {x: 0, y: 0};
let scale = 1.0;

window.onkeypress = function(e) {
    this.console.log(e);
    if (e.key == 'a') {
        offset.x = offset.x + scale / 3;
    }
    if (e.key == 'd') {
        offset.x = offset.x - scale / 3;
    }
    if (e.key == 'w') {
        offset.y = offset.y - scale / 3;
    }
    if (e.key == 's') {
        offset.y = offset.y + scale / 3;
    }
    if (e.key == 'e') {
        scale = scale * 1.1;
        offset.x = offset.x / 1.1;
        offset.y = offset.y / 1.1;
    }
    if (e.key == 'q') {
        scale = scale / 1.1;
        offset.x = offset.x * 1.1;
        offset.y = offset.y * 1.1;
    }

    drawScene(GL, PROGINF, POSBUFF, offset, scale);
}


const vsSource = `
attribute vec4 aVertexPosition;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
}
`;

const fsSource = `
precision highp float;

uniform vec2 offset;
uniform float scale;

vec2 mult(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, (a.x * b.y + a.y * b.x));
}

int iterCnt(vec2 c) {
    vec2 z = vec2(0,0);
    int j = 0;
    for (int i = 0; i < 255; ++i) {
        if (length(z) > 2.0) {
            break;
        }
        z = mult(z,z) + c;
        j = i;
    }
    return j;
}

void main() {
    float col = float(iterCnt(vec2((gl_PointCoord.x - offset.x) * scale, (gl_PointCoord.y - offset.y) * scale)));
    gl_FragColor = vec4(0.0, col / 30.0, 0.0, 1.0);
}
`;