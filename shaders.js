var testVS = `#version 300 es
precision highp float;
precision highp int;

uniform mat4 cameraMatrix;
uniform sampler2D displacements;

uniform int width;
uniform int height;
uniform float scale;

in vec4 position;

void main() {
	vec2 displacementCoord = vec2(0.0, 0.0);
	displacementCoord.x = position.x/(float(width)*scale);
	displacementCoord.y = position.y/(float(height)*scale);
	vec4 displacement = texture(displacements, displacementCoord);

	gl_Position = cameraMatrix*(position + displacement);
	gl_PointSize = 5.0;
}
`;

var testSheetFS = `#version 300 es
precision highp float;
precision highp int;

out vec4 color;

void main() {
	color = vec4(0.0, 0.0, 1.0, 1.0);
}
`;

var testLineFS = `#version 300 es
precision highp float;
precision highp int;

out vec4 color;

void main() {
	color = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

var pointRenderFS = `#version 300 es
precision highp float;
precision highp int;

out vec4 color;

void main() {
	color = vec4(1.0, 0.0, 0.0, 1.0);
}
`;

var passThroughVS = `#version 300 es
precision highp float;
precision highp int ;

in vec4 position;

out vec2 pixPos;

void main() {
    pixPos = position.xy ;
    gl_Position = vec4(position.x*2.-1., position.y*2.-1.,0.,1.0);
}
`;

var displacementUpdaterFS = `#version 300 es
precision highp float;
precision highp int;

in vec2 pixPos;

uniform sampler2D inDisplacements;
uniform sampler2D k_ne_se_e1_s1;
uniform sampler2D k_e2_s2;

uniform int width;
uniform int height;
uniform float scale;

layout(location = 0) out vec4 outDisplacements;

void main() {
	vec4 displacement = texture(inDisplacements, pixPos);
	displacement.x = displacement.x - 0.01;
	outDisplacements = displacement;
}
`;