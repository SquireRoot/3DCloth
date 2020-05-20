/*--- Plotter Vertex Shader ---*/
var plotterVS = `#version 300 es
precision highp float;
precision highp int;

uniform mat4 cameraMatrix;
uniform sampler2D positions;

uniform int width;
uniform int height;
uniform float scale;

in vec4 position;

void main() {
	vec2 texCoord = vec2(0.0, 0.0);
	texCoord.x = position.x/(float(width)*scale);
	texCoord.y = position.y/(float(height)*scale);
	vec4 displacement = texture(positions, texCoord);

	gl_Position = cameraMatrix*(position + displacement);
	gl_PointSize = 5.0;
}
`;

/*--- Sheet Plotter Fragment Shader ---*/
var sheetPlotterFS = `#version 300 es
precision highp float;
precision highp int;

out vec4 color;

void main() {
	color = vec4(0.0, 0.0, 1.0, 1.0);
}
`;

/*--- Line Plotter Fragment Shader ---*/
var linePlotterFS = `#version 300 es
precision highp float;
precision highp int;

out vec4 color;

void main() {
	color = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

/*--- Point Plotter Fragment Shader ---*/
var pointPlotterFS = `#version 300 es
precision highp float;
precision highp int;

out vec4 color;

void main() {
	color = vec4(1.0, 0.0, 0.0, 1.0);
}
`;

/*--- Pass Through Vertex Shader ---*/
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

/*--- Point Updater Fragment Shader ---*/
var pointUpdaterFS = `#version 300 es
precision highp float;
precision highp int;

in vec2 pixPos;

uniform sampler2D in_positions;
uniform sampler2D in_velocities;
uniform sampler2D forces;

uniform float timestep;

layout(location = 0) out vec4 out_positions;
layout(location = 1) out vec4 out_velocities;

void main() {
	vec4 position = texture(in_positions, pixPos);
	position.x = position.x - 0.01;
	out_positions = position;
	out_velocities = texture(in_velocities, pixPos);

	// vec2 size = textureSize(in_positions);
	// vec2 i = vec2(1.0, 0.0)/size;
	// vec2 j = vec2(0.0, 1.0)/size;


	// if (pixPos.x < (1.0 - i.x)) { // not the last column
	// 	if (pixPos.y < (1.0 - i.y)) {

	// 	}
	// }

}
`;

/*--- Force Updater Fragment Shader---*/
var forceUpdaterFS = `#version 300 es
precision highp float;
precision highp int;

in vec2 pixPos;

uniform sampler2D positions;
uniform sampler2D velocities;

uniform float k_sheer;
uniform float k_tension;
uniform float k_fold;

uniform float d_sheer;
uniform float d_tension;
uniform float d_fold;

uniform float clothScale;

layout(location = 0) out vec4 forces;

void main() {
	vec2 size = textureSize(positions);
	vec2 i = vec2(1.0, 0.0)/size;
	vec2 j = vec2(0.0, 1.0)/size;

	vec3 this_position = texture(positions, pixPos).xyz;
	vec3 this_velocity = texture(velocities, pixPos).xyz;

	vec3 force = vec3(0.0, 0.0, 0.0);

	if (pixPos.x < (1.0 - i.x)) { // not the rightmost column
		if (pixPos.y < (1.0 - j.y)) { // not the top row
			vec3 ne_position = texture(positions, (pixPos + i + j)).xyz;
			vec3 ne_velocity = texutre(positions, (pixPos + i + j)).xyz;
			vec3 ne = clothScale*vec2(1.0, 1.0, 0.0);

			vec3 pos_diff = (ne + ne_position) - this_position;
			vec3 this_to_ne = normalize(pos_diff);

			float vel_diff = dot((ne_velocity - this_velocity), this_to_ne);

			vec3 ne_spring_force = k_sheer*(length(pos_diff) - length(ne))*this_to_ne;
			vec3 ne_damping_force = d_sheer*length(vel_diff)*this_to_ne;
			force = force + ne_spring_force + ne_damping_force;
		}

		if (pixPos.y > 0.0000001) { // not the bottom row
			vec3 se_position = texture(positions, (pixPos + i - j)).xyz;
			vec3 se_velocity = texutre(positions, (pixPos + i - j)).xyz;
			vec3 se = clothScale*vec2(1.0, -1.0, 0.0);

			vec3 pos_diff = (se + se_position) - this_position;
			vec3 this_to_se = normalize(pos_diff);

			float vel_diff = dot((se_velocity - this_velocity), this_to_se);

			vec3 se_spring_force = k_sheer*(length(pos_diff) - length(se))*this_to_se;
			vec3 se_damping_force = d_sheer*length(vel_diff)*this_to_se;
			force = force + se_spring_force + se_damping_force;
		}

		vec3 e1_position = texture(positions, (pixPos + i)).xyz;
		vec3 e1_velocity = texutre(positions, (pixPos + i)).xyz;
		vec3 e1 = clothScale*vec2(1.0, 0.0, 0.0);

		vec3 pos_diff = (e1 + e1_position) - this_position;
		vec3 this_to_e1 = normalize(pos_diff);

		float vel_diff = dot((e1_velocity - this_velocity), this_to_e1);

		vec3 e1_spring_force = k_tension*(length(pos_diff) - length(e1))*this_to_e1;
		vec3 e1_damping_force = d_tension*length(vel_diff)*this_to_e1;
		force = force + e1_spring_force + e1_damping_force;
	}

	if (pixPos.x > 0.0000001) {
		vec3 s1_position = texture(positions, (pixPos - j)).xyz;
		vec3 s1_velocity = texutre(positions, (pixPos - j)).xyz;
		vec3 s1 = clothScale*vec2(0.0, -1.0, 0.0);

		vec3 pos_diff = (s1 + s1_position) - this_position;
		vec3 this_to_s1 = normalize(pos_diff);

		float vel_diff = dot((s1_velocity - this_velocity), this_to_s1);

		vec3 s1_spring_force = k_tension*(length(pos_diff) - length(s1))*this_to_s1;
		vec3 s1_damping_force = d_tension*length(vel_diff)*this_to_s1;
		force = force + s1_spring_force + s1_damping_force;
	}

	if (pixPos.x < (1.0 - 2.0*i.x)) { // not the rightmost two columns

	}

	if (pixPos.y > (2.0*j.y)) { // not the bottom two rows

	}

	/* TODO: check if conditions, decide how to implement folding spring */
}

`;