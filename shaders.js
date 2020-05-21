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

out vec2 texCoord;

void main() {
	texCoord = vec2(0.0, 0.0);
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

in vec2 texCoord;

out vec4 color;

uniform sampler2D colors;

void main() {
	color = vec4(0.0, 0.0, 1.0, 1.0);
	// color = texture(colors, texCoord);
	// color.w = 1.0;
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

in vec2 texCoord;

out vec4 color;

uniform sampler2D colors; 

void main() {
	//color = vec4(0.0, 0.0, 1.0, 1.0);
	color = abs(texture(colors, texCoord))*10.0;
	color.w = 1.0;
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

uniform float node_mass;

uniform float timestep;
uniform float time;

layout(location = 0) out vec4 out_positions;
layout(location = 1) out vec4 out_velocities;

void main() {
	/* euler integration */
	out_velocities = texture(in_velocities, pixPos) + timestep*texture(forces, pixPos)/node_mass;
	out_positions = texture(in_positions, pixPos) + timestep*out_velocities;

	/* boundary conditions */
	vec2 size = vec2(textureSize(forces, 0));
	vec2 i = vec2(1.0, 0.0)/size;
	vec2 j = vec2(0.0, 1.0)/size;

	if (pixPos.x <= i.x && pixPos.y >= (1.0 - j.y)) {
		out_velocities = vec4(0.0, 0.0, 0.4*cos(time), 0.0);
		out_positions = vec4(0.0, 0.0, 0.4*sin(time), 0.0);
	} else if (pixPos.x >= (1.0 - i.x) && pixPos.y >= (1.0 - j.y)) {
		out_velocities = vec4(0.0, 0.0, 0.4*cos(time), 0.0);
		out_positions = vec4(0.0, 0.0, 0.4*sin(time), 0.0);
	}
}
`;

/*--- Force Updater Fragment Shader---*/
var forceUpdaterFS = `#version 300 es
precision highp float;
precision highp int;

in vec2 pixPos;

uniform sampler2D positions;
uniform sampler2D velocities;

uniform float gravity;
uniform float node_mass;

uniform float k_sheer;
uniform float k_tension;
uniform float k_fold;

uniform float d_sheer;
uniform float d_tension;
uniform float d_fold;

uniform float clothScale;

layout(location = 0) out vec4 forces;

vec3 calcForce(vec3 this_position, vec3 this_velocity,
			   vec3 other_position, vec3 other_velocity,
			   vec3 grid_vec, float k, float d) {

	vec3 this_to_other = (grid_vec + other_position) - this_position;
	vec3 spring_force = k*(length(this_to_other) - length(grid_vec))*this_to_other;

	vec3 this_to_other_norm = normalize(this_to_other);
	float vel_diff = dot((other_velocity - this_velocity), this_to_other_norm);
	vec3 damping_force = d*vel_diff*this_to_other_norm;

	return damping_force + spring_force;
}

void main() {
	vec2 size = vec2(textureSize(positions, 0));
	vec2 i = vec2(1.0, 0.0)/size;
	vec2 j = vec2(0.0, 1.0)/size;

	vec3 this_position = texture(positions, pixPos).xyz;
	vec3 this_velocity = texture(velocities, pixPos).xyz;

	vec3 net_force = vec3(0.0, 0.0, 0.0);

	bool is_not_top = pixPos.y < (1.0 - j.y);
	bool is_not_bottom = pixPos.y > j.y;
	bool is_not_left = pixPos.x > i.x;
	bool is_not_right = pixPos.x < (1.0 - i.x);

	if (is_not_right) {
		vec3 e1_position = texture(positions, (pixPos + i)).xyz;
		vec3 e1_velocity = texture(positions, (pixPos + i)).xyz;
		vec3 e1 = clothScale*vec3(1.0, 0.0, 0.0);

		net_force = net_force + calcForce(this_position, this_velocity,
										  e1_position, e1_velocity,
										  e1, k_tension, d_tension);

		if (is_not_top) {
			vec3 ne_position = texture(positions, (pixPos + i + j)).xyz;
			vec3 ne_velocity = texture(positions, (pixPos + i + j)).xyz;
			vec3 ne = clothScale*vec3(1.0, 1.0, 0.0);

			net_force = net_force + calcForce(this_position, this_velocity,
											  ne_position, ne_velocity,
											  ne, k_sheer, d_sheer);
		}

		if (is_not_bottom) {
			vec3 se_position = texture(positions, (pixPos + i - j)).xyz;
			vec3 se_velocity = texture(positions, (pixPos + i - j)).xyz;
			vec3 se = clothScale*vec3(1.0, -1.0, 0.0);

			net_force = net_force + calcForce(this_position, this_velocity,
											  se_position, se_velocity,
											  se, k_sheer, d_sheer);
		}
	}

	if (is_not_left) {
		vec3 w1_position = texture(positions, (pixPos - i)).xyz;
		vec3 w1_velocity = texture(positions, (pixPos - i)).xyz;
		vec3 w1 = clothScale*vec3(-1.0, 0.0, 0.0);

		net_force = net_force + calcForce(this_position, this_velocity,
										  w1_position, w1_velocity,
										  w1, k_tension, d_tension);

		if (is_not_top) {
			vec3 nw_position = texture(positions, (pixPos - i + j)).xyz;
			vec3 nw_velocity = texture(positions, (pixPos - i + j)).xyz;
			vec3 nw = clothScale*vec3(-1.0, 1.0, 0.0);

			net_force = net_force + calcForce(this_position, this_velocity,
											  nw_position, nw_velocity,
											  nw, k_sheer, d_sheer);
		}

		if (is_not_bottom) {
			vec3 sw_position = texture(positions, (pixPos - i - j)).xyz;
			vec3 sw_velocity = texture(positions, (pixPos - i - j)).xyz;
			vec3 sw = clothScale*vec3(-1.0, -1.0, 0.0);

			net_force = net_force + calcForce(this_position, this_velocity,
											  sw_position, sw_velocity,
											  sw, k_sheer, d_sheer);
		}
	}

	if (is_not_top) {
		vec3 n1_position = texture(positions, (pixPos + j)).xyz;
		vec3 n1_velocity = texture(positions, (pixPos + j)).xyz;
		vec3 n1 = clothScale*vec3(0.0, 1.0, 0.0);

		net_force = net_force + calcForce(this_position, this_velocity,
										  n1_position, n1_velocity,
										  n1, k_tension, d_tension);
	}

	if (is_not_bottom) {
		vec3 s1_position = texture(positions, (pixPos - j)).xyz;
		vec3 s1_velocity = texture(positions, (pixPos - j)).xyz;
		vec3 s1 = clothScale*vec3(0.0, -1.0, 0.0);

		net_force = net_force + calcForce(this_position, this_velocity,
										  s1_position, s1_velocity,
										  s1, k_tension, d_tension);
	}

	if (pixPos.x < (1.0 - 2.0*i.x)) { // not the rightmost two columns
		vec3 e2_position = texture(positions, (pixPos + 2.0*i)).xyz;
		vec3 e2_velocity = texture(positions, (pixPos + 2.0*i)).xyz;
		vec3 e2 = clothScale*vec3(2.0, 0.0, 0.0);

		net_force = net_force + calcForce(this_position, this_velocity,
										  e2_position, e2_velocity,
										  e2, k_fold, d_fold);
	}

	if (pixPos.x > 2.0*i.x) { // not the leftmost two columns
		vec3 w2_position = texture(positions, (pixPos - 2.0*i)).xyz;
		vec3 w2_velocity = texture(positions, (pixPos - 2.0*i)).xyz;
		vec3 w2 = clothScale*vec3(-2.0, 0.0, 0.0);

		net_force = net_force + calcForce(this_position, this_velocity,
										  w2_position, w2_velocity,
										  w2, k_fold, d_fold);
	}

	if (pixPos.y > 2.0*j.y) { // not the bottom two rows
		vec3 s2_position = texture(positions, (pixPos - 2.0*j)).xyz;
		vec3 s2_velocity = texture(positions, (pixPos - 2.0*j)).xyz;
		vec3 s2 = clothScale*vec3(0.0, -2.0, 0.0);

		net_force = net_force + calcForce(this_position, this_velocity,
										  s2_position, s2_velocity,
										  s2, k_fold, d_fold);
	}

	if (pixPos.y < (1.0 - 2.0*j.y)) { // not the top two rows
		vec3 n2_position = texture(positions, (pixPos + 2.0*j)).xyz;
		vec3 n2_velocity = texture(positions, (pixPos + 2.0*j)).xyz;
		vec3 n2 = clothScale*vec3(0.0, 2.0, 0.0);

		net_force = net_force + calcForce(this_position, this_velocity,
										  n2_position, n2_velocity,
										  n2, k_fold, d_fold);
	}

	forces = vec4(0.0, -gravity*node_mass, 0.0, 0.0);
	//forces = vec4(0.0, 0.0, 0.0, 0.0);
	forces.xyz = forces.xyz + net_force;
}

`;