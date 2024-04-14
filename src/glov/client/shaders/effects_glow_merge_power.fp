#pragma WebGL2

precision lowp float;

varying vec2 interp_texcoord;

uniform sampler2D inputTexture0;
uniform sampler2D inputTexture1;
uniform sampler2D inputTexture2;

uniform vec4 color;
uniform vec4 tex2_transform;
uniform vec4 pulse;

void main()
{
  vec3 tex_lines = texture2D(inputTexture0, interp_texcoord).rgb;
  float v0 = max(tex_lines.r, max(tex_lines.g, tex_lines.b));
  vec3 tex_glow = texture2D(inputTexture1, interp_texcoord).rgb;
  vec2 power_coords = interp_texcoord * tex2_transform.xy + tex2_transform.zw;
  float power_value = texture2D(inputTexture2, power_coords).r;
  float glow_value = max(tex_glow.r, max(tex_glow.g, tex_glow.b)) * 3.0;
  if (power_coords.x > 0.0 && power_coords.x < 1.0) {
    float line_value = max(tex_lines.r, max(tex_lines.g, tex_lines.b));
    if (power_value > 0.01) {
      power_value = power_value * 0.5 + 0.5;
      tex_lines = mix(tex_lines, line_value * vec3(0.0, 1.0, 0.0), power_value);
    } else {
      tex_lines = vec3(1.0, 0.25, 0.5) * line_value;
    }
  }
  gl_FragColor = vec4((1.0 - v0) * glow_value * color.rgb + tex_lines, 1.0);
  // gl_FragColor.r = power_value;
}
