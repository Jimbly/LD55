#pragma WebGL2

precision lowp float;

varying vec2 interp_texcoord;

uniform sampler2D inputTexture0;
uniform sampler2D inputTexture1;

uniform vec4 color;

void main()
{
  vec3 tex0 = texture2D(inputTexture0, interp_texcoord).rgb;
  float v0 = max(tex0.r, max(tex0.g, tex0.b));
  vec3 tex1 = texture2D(inputTexture1, interp_texcoord).rgb;
  float v1 = max(tex1.r, max(tex1.g, tex1.b)) * 3.0;
  gl_FragColor = vec4(mix(v1 * color.rgb, tex0, v0), 1.0);
}
