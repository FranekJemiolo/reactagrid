/**
 * WebGL Incandescence Bloom Shader Pipeline for ReactaGrid
 * If a cell's temperature or radiance exceeds the incandescence threshold (e.g. 800°C),
 * applies a real-time bloom glow shader illuminating surrounding cells.
 */

export class WebGLBloomRenderer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private width: number;
  private height: number;
  private isSupported = false;

  private uResolutionLoc: WebGLUniformLocation | null = null;
  private uBloomThresholdLoc: WebGLUniformLocation | null = null;
  private uBloomIntensityLoc: WebGLUniformLocation | null = null;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.width = width;
    this.height = height;
    this.initGL(canvas);
  }

  private initGL(canvas: HTMLCanvasElement): void {
    try {
      const gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
      });

      if (!gl) {
        this.isSupported = false;
        return;
      }

      this.gl = gl;

      // Vertex Shader: Fullscreen quad
      const vsSource = `
        attribute vec2 a_position;
        varying vec2 v_uv;
        void main() {
          v_uv = (a_position + 1.0) * 0.5;
          v_uv.y = 1.0 - v_uv.y; // Flip Y for standard screen space
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `;

      // Fragment Shader: Incandescence Threshold & Multi-Tap Radial Bloom
      const fsSource = `
        precision mediump float;
        uniform sampler2D u_texture;
        uniform vec2 u_resolution;
        uniform float u_bloomThreshold;
        uniform float u_bloomIntensity;
        varying vec2 v_uv;

        void main() {
          vec4 baseColor = texture2D(u_texture, v_uv);
          vec2 texel = 1.0 / u_resolution;
          vec4 bloomAccum = vec4(0.0);

          // 9-Tap radial incandescence sample
          for (int dy = -2; dy <= 2; dy++) {
            for (int dx = -2; dx <= 2; dx++) {
              vec2 offset = vec2(float(dx), float(dy)) * texel * 1.6;
              vec4 sampleColor = texture2D(u_texture, v_uv + offset);
              float luminance = dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114));

              // Thresholding for hot flames, incandescent metal, plasma, and explosions
              if (luminance > u_bloomThreshold || (sampleColor.r > 0.85 && sampleColor.g > 0.4)) {
                float distSq = float(dx * dx + dy * dy);
                float weight = 1.0 / (1.0 + distSq * 0.8);
                bloomAccum += sampleColor * weight;
              }
            }
          }

          vec4 bloomGlow = bloomAccum * (u_bloomIntensity * 0.15);
          gl_FragColor = baseColor + bloomGlow;
        }
      `;

      const vs = this.createShader(gl, gl.VERTEX_SHADER, vsSource);
      const fs = this.createShader(gl, gl.FRAGMENT_SHADER, fsSource);
      if (!vs || !fs) return;

      const program = gl.createProgram();
      if (!program) return;

      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        return;
      }

      this.program = program;

      // Fullscreen quad [-1, -1] to [1, 1]
      const positions = new Float32Array([
        -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0,
      ]);
      this.positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

      // Texture setup
      this.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

      // Uniforms
      this.uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
      this.uBloomThresholdLoc = gl.getUniformLocation(program, 'u_bloomThreshold');
      this.uBloomIntensityLoc = gl.getUniformLocation(program, 'u_bloomIntensity');

      this.isSupported = true;
    } catch {
      this.isSupported = false;
    }
  }

  private createShader(
    gl: WebGLRenderingContext,
    type: number,
    source: string,
  ): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  public render(pixelBuffer: Uint32Array, bloomThreshold = 0.72, bloomIntensity = 1.25): boolean {
    const gl = this.gl;
    if (!this.isSupported || !gl || !this.program) {
      return false;
    }

    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.program);

    // Upload pixel buffer as RGBA texture
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    const byteView = new Uint8Array(
      pixelBuffer.buffer,
      pixelBuffer.byteOffset,
      pixelBuffer.byteLength,
    );
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.width,
      this.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      byteView,
    );

    // Set uniforms
    if (this.uResolutionLoc) {
      gl.uniform2f(this.uResolutionLoc, this.width, this.height);
    }
    if (this.uBloomThresholdLoc) {
      gl.uniform1f(this.uBloomThresholdLoc, bloomThreshold);
    }
    if (this.uBloomIntensityLoc) {
      gl.uniform1f(this.uBloomIntensityLoc, bloomIntensity);
    }

    // Bind quad positions
    const posLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return true;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public getIsSupported(): boolean {
    return this.isSupported;
  }
}
