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
	gl_PointSize = 2.0;
}
`;

/*--- Sheet Plotter Fragment Shader ---*/
var sheetPlotterFS = `#version 300 es
precision highp float;
precision highp int;


uniform sampler2D plotField;
uniform sampler2D colorMap;

in vec2 texCoord;
out vec4 color;

uniform sampler2D colors;

void main() {
	float plotMin = 0.0;
	float plotMax = 0.01;

	vec4 cdata = vec4(0.0, 0.0, 0.0, 1.0);
	vec4 val = texture(plotField, texCoord);
	float normVal = (length(val) + plotMin)/(plotMax - plotMin);

	cdata.xyz = texture(colorMap, vec2(normVal, 0.5)).xyz;
	color = cdata;
}
`;

/*--- Point Plotter Fragment Shader ---*/
var pointPlotterFS = `#version 300 es
precision highp float;
precision highp int;

in vec2 texCoord;

out vec4 color;

void main() {
	color = vec4(0.8, 0.0, 0.0, 1.0);
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


uniform int clothWidth;
uniform int clothHeight;

uniform float timestep;
uniform float point_mass;

uniform int time;

layout(location = 0) out vec4 out_positions;
layout(location = 1) out vec4 out_velocities;

void main() {

	vec3 position = texture(in_positions, pixPos).xyz;
	vec3 velocity = texture(in_velocities, pixPos).xyz;
	vec3 force = texture(forces, pixPos).xyz;

	out_positions = vec4(0.0, 0.0, 0.0, 0.0);
	out_velocities = vec4(0.0, 0.0, 0.0, 0.0);

	out_velocities.xyz = velocity + timestep*(force/point_mass);
	out_positions.xyz = position + timestep*out_velocities.xyz;

	vec2 i = vec2(1.0, 0.0)/float(clothWidth);
	vec2 j = vec2(0.0, 1.0)/float(clothHeight);

	if (pixPos.y >= (1.0 - j.y) && (pixPos.x >= (1.0 - i.x) || pixPos.x <= i.x)) {
		out_positions = vec4(0.0, 0.0, -1.0, 0.0);
		out_velocities = vec4(0.0, 0.0, 0.0, 0.0);

		// float omega = 2.0*3.1416/10.0;
		// float amp = 2.0;
		// out_positions.z = amp*sin(omega*float(time));
		// out_velocities.z = amp*omega*cos(omega*float(time));
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
uniform int clothWidth;
uniform int clothHeight;

layout(location = 0) out vec4 forces;

vec3 getForce(vec3 thisPosition, vec3 thisVelocity, vec2 pointDirVec, float k, float d) {
	vec2 pointIdxVec = pointDirVec/vec2(clothWidth, clothHeight);
	vec3 pointVec = vec3(0.0, 0.0, 0.0);
	pointVec.xy = pointDirVec*clothScale;

	vec3 thisToPoint = -thisPosition + pointVec
					   + texture(positions, pixPos + pointIdxVec).xyz;
	vec3 thisToPointNorm = normalize(thisToPoint);

	vec3 force = k*(length(thisToPoint) - length(pointVec))*thisToPointNorm;

	float velDiff = dot((texture(velocities, pixPos + pointIdxVec).xyz - thisVelocity),
						thisToPointNorm);
	force = force + d*velDiff*thisToPointNorm;

	return force;
}

void main() {
	vec2 i = vec2(1.0, 0.0)/float(clothWidth);
	vec2 j = vec2(0.0, 1.0)/float(clothHeight);

	vec3 thisPosition = texture(positions, pixPos).xyz;
	vec3 thisVelocity = texture(velocities, pixPos).xyz;

	vec3 netForce = vec3(0.0, gravity, 0.0);

	if (pixPos.x < (1.0 - i.x)) { // add east spring force
		netForce = netForce + getForce(thisPosition, thisVelocity,
									   vec2(1.0, 0.0), k_tension, d_tension);
	}
	if (pixPos.x > i.x) { // add west spring force
		netForce = netForce + getForce(thisPosition, thisVelocity,
									   vec2(-1.0, 0.0), k_tension, d_tension);
	}
	if (pixPos.y < (1.0 - j.y)) { // add north spring force
		netForce = netForce + getForce(thisPosition, thisVelocity,
									   vec2(0.0, 1.0), k_tension, d_tension);
	}
	if (pixPos.y > j.y) { // add south spring force
		netForce = netForce + getForce(thisPosition, thisVelocity,
									   vec2(0.0, -1.0), k_tension, d_tension);
	}


	if (pixPos.x < (1.0 - i.x) && pixPos.y < (1.0 - j.y)) { // add northeast spring force
		netForce = netForce + getForce(thisPosition, thisVelocity,
									   vec2(1.0, 1.0), k_sheer, d_sheer);
	}
	if (pixPos.x < (1.0 - i.x) && pixPos.y > j.y) { // add southeast spring force
		netForce = netForce + getForce(thisPosition, thisVelocity,
									   vec2(1.0, -1.0), k_sheer, d_sheer);
	}
	if (pixPos.x > i.x && pixPos.y > j.y) { // add southwest spring force
		netForce = netForce + getForce(thisPosition, thisVelocity,
									   vec2(-1.0, -1.0), k_sheer, d_sheer);
	}
	if (pixPos.x > i.x && pixPos.y < (1.0 - j.y)) { // add northwest spring force
		netForce = netForce + getForce(thisPosition, thisVelocity,
									   vec2(-1.0, 1.0), k_sheer, d_sheer);
	}

	if (pixPos.x < (1.0 - 2.0*i.x)) { // add east2 spring force
		netForce = netForce + getForce(thisPosition, thisVelocity,
									   vec2(2.0, 0.0), k_fold, d_fold);
	}
	if (pixPos.x > 2.0*i.x) { // add west2 spring force
		netForce = netForce + getForce(thisPosition, thisVelocity,
									   vec2(-2.0, 0.0), k_fold, d_fold);
	}
	if (pixPos.y < (1.0 - 2.0*j.y)) { // add north2 spring force
		netForce = netForce + getForce(thisPosition, thisVelocity,
									   vec2(0.0, 2.0), k_fold, d_fold);
	}
	if (pixPos.y > 2.0*j.y) { // add south2 spring force
		netForce = netForce + getForce(thisPosition, thisVelocity,
									   vec2(0.0, -2.0), k_fold, d_fold);
	}

	forces = vec4(0.0, 0.0, 0.0, 0.0);
	forces.xyz = netForce;
}

`;