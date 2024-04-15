#pragma WebGL2

precision lowp float;

varying vec2 interp_texcoord;

uniform sampler2D inputTexture0;
uniform sampler2D inputTexture1;

uniform vec4 color;

void main()
{
  vec3 tex_lines = texture2D(inputTexture0, interp_texcoord).rgb;
  float v0 = max(tex_lines.r, max(tex_lines.g, tex_lines.b));
  vec3 tex_glow = texture2D(inputTexture1, interp_texcoord).rgb;
  float glow_value = max(tex_glow.r, max(tex_glow.g, tex_glow.b)) * 3.0;
  gl_FragColor = vec4((1.0 - v0) * glow_value * color.rgb + tex_lines, 1.0);
}
