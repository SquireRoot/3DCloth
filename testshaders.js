var testVS = `#version 300 es
precision highp float;
precision highp int;

in vec4 position;

void main() {
	gl_Position = vec4(position.x, position.y, position.z, 1.0);
}
`;

var testFS = `#version 300 es
precision highp float;
precision highp int;

out vec4 color;

void main() {
	color = vec4(0.0, 0.0, 1.0, 1.0);
}
`;