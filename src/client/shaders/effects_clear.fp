#pragma WebGL2

precision lowp float;

varying vec2 interp_texcoord;

uniform sampler2D inputTexture0;

uniform vec4 color;

void main()
{
  gl_FragColor = texture2D(inputTexture0, interp_texcoord) * color;
}
