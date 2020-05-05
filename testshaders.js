var testVS = `#version 300 es
precision highp float;
precision highp int;

uniform mat4 cameraMatrix;

in vec4 position;

void main() {
	gl_Position = cameraMatrix*vec4(position.x, position.y, -5.0, 1.0);
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