
// Class to controll the camera projection and view matricies
class CameraMatrixController {
	static keyWDown = false;
	static keyADown = false;
	static keySDown = false;
	static keyDDown = false;
	static keyShiftDown = false;
	static keySpaceDown = false;
	static flyToggle = false;

	static mouseDiffX = 0.0;
	static mouseDiffY = 0.0;

	static canvas; 

	constructor(options={}) {

		this.flySpeed = Abubu.readOption(options.flySpeed, 0.08);
		this.rotateSpeed = Abubu.readOption(options.rotateSpeed, 0.01);

		this.position = Abubu.readOption(options.position, [0, 0, 1.0]);
		this.rotation = Abubu.readOption(options.rotation, [0.0, 0.0]);

		this.fieldOfView = Abubu.readOption(options.fieldOfView, Math.PI/2.0);
		this.aspectRatio = Abubu.readOption(options.aspectRatio, 1.0);
		this.nearZClip = Abubu.readOption(options.nearZClip, 0.5);
		this.farZClip = Abubu.readOption(options.farZClip, 15.0);

		this.perspectiveMatrix = mat4.create();
		mat4.perspective(this.perspectiveMatrix, this.fieldOfView,
		 				 this.aspectRatio, this.nearZClip, this.farZClip);
	}

	static addListeners(canvas) {
		CameraMatrixController.canvas = canvas;

		document.addEventListener('keydown', CameraMatrixController.keyDownHandler, false);
		document.addEventListener('keyup', CameraMatrixController.keyUpHandler, false);
		document.addEventListener('mousemove', CameraMatrixController.mouseHandler, false);


		canvas.requestPointerLock = canvas.requestPointerLock ||
									canvas.mozRequestPointerLock ||
									canvas.webkitRequestPointerLock;

		document.exitPointerLock = document.exitPointerLock ||
								   document.mozExitPointerLock ||
								   document.webkitExitPointerLock;

		document.addEventListener('pointerlockchange',
								  CameraMatrixController.pointerLockHandler, false);
		document.addEventListener('mozpointerlockchange', 
								  CameraMatrixController.pointerLockHandler, false);
		document.addEventListener('webkitpointerlockchange',
								  CameraMatrixController.pointerLockHandler, false);
	}

	static pointerLockHandler(event) {
		if (!(document.pointerLockElement === CameraMatrixController.canvas ||
		    document.mozPointerLockElement === CameraMatrixController.canvas ||
		    document.webkitPointerLockElement === CameraMatrixController.canvas)) {
		 	// Pointer was just unlocked
			CameraMatrixController.flyToggle = false;
		}
	}

	static keyDownHandler(event) {
		switch (event.keyCode) {
		case 87:
			CameraMatrixController.keyWDown = true;
			break;
		case 65:
			CameraMatrixController.keyADown = true; 
			break;
		case 83:
			CameraMatrixController.keySDown = true; 
			break;
		case 68:
			CameraMatrixController.keyDDown = true;
			break;
		case 16:
			CameraMatrixController.keyShiftDown = true;
			break;
		case 32:
			CameraMatrixController.keySpaceDown = true;
			break;
		case 70:
			CameraMatrixController.flyToggle = !CameraMatrixController.flyToggle;
			if (CameraMatrixController.flyToggle) {
				CameraMatrixController.canvas.requestPointerLock();
			} else {
				document.exitPointerLock();
			}

			CameraMatrixController.mouseDiffX = 0.0;
			CameraMatrixController.mouseDiffY = 0.0;
			break;
		default:
		}
	}

	static keyUpHandler(event) {
		switch (event.keyCode) {
		case 87:
			CameraMatrixController.keyWDown = false
			break;
		case 65:
			CameraMatrixController.keyADown = false; 
			break;
		case 83:
			CameraMatrixController.keySDown = false; 
			break;
		case 68:
			CameraMatrixController.keyDDown = false;
			break;
		case 16:
			CameraMatrixController.keyShiftDown = false;
			break;
		case 32:
			CameraMatrixController.keySpaceDown = false;
			break;
		default:
		}
	}

	static mouseHandler(event) {
		CameraMatrixController.mouseDiffX += event.movementX;
		CameraMatrixController.mouseDiffY += event.movementY;
	}

	updateCameraMatrix() {
		if (CameraMatrixController.flyToggle) {
			this.rotation[0] -= CameraMatrixController.mouseDiffY*this.rotateSpeed;
			this.rotation[1] -= CameraMatrixController.mouseDiffX*this.rotateSpeed;

			CameraMatrixController.mouseDiffX = 0.0;
			CameraMatrixController.mouseDiffY = 0.0;

			var forwards = [0.0, 0.0, -this.flySpeed];
			vec3.rotateY(forwards, forwards, [0.0, 0.0, 0.0], this.rotation[1]);
			var right = vec3.clone(forwards);
			right[0] = -forwards[2];
			right[2] = forwards[0]; 

			if (CameraMatrixController.keyWDown) vec3.add(this.position, this.position, forwards);
			if (CameraMatrixController.keySDown) vec3.scaleAndAdd(this.position, this.position, forwards, -1.0);
			if (CameraMatrixController.keyDDown) vec3.add(this.position, this.position, right);
			if (CameraMatrixController.keyADown) vec3.scaleAndAdd(this.position, this.position, right, -1.0);
			if (CameraMatrixController.keyShiftDown) vec3.add(this.position, this.position, [0.0, -this.flySpeed, 0.0]);
			if (CameraMatrixController.keySpaceDown) vec3.add(this.position, this.position, [0.0, this.flySpeed, 0.0]);

		}
	}

	getCameraMatrix() {
		var cameraMatrix = mat4.clone(this.perspectiveMatrix);
		var rotationInv = [-this.rotation[0], -this.rotation[1]];
		var positionInv = [-this.position[0], -this.position[1], -this.position[2]];
		mat4.rotateX(cameraMatrix, cameraMatrix, rotationInv[0]);
		mat4.rotateY(cameraMatrix, cameraMatrix, rotationInv[1]);
		mat4.translate(cameraMatrix, cameraMatrix, positionInv)
		return cameraMatrix;
	}
}

class Cloth {
	constructor(options={}) {

	}
}

// Generates a grid of verticies (width x height) centered 
// at the origin and defined in row major order
//
// width:  the width of the grid to generate
// height: the height of the grid to generate
// scale:  the scaling factor to apply to the final grid (default is 1)
// 
// returns a 3*width*height size matrix 
function genClothGridPoints(width, height, scale=1) {
	var clothPoints = new Array(3*width*height);

	// for (var y = 0; y < height; y++) {
	// 	for (var x = 0; x < width; x++) {
	// 		var idx = 3*(width*y + x);
	// 		clothPoints[idx] = (-width/2 + x + 0.5)*scale; 
	// 		clothPoints[idx + 1] = (height/2 - y - 0.5) *scale;
	// 		clothPoints[idx + 2] = 0.0;
	// 	}
	// }

	for (var y = 0; y < height; y++) {
		for (var x = 0; x < width; x++) {
			var idx = 3*(width*y + x);
			clothPoints[idx] = scale*(x + 0.5);
			clothPoints[idx + 1] = scale*(height - y - 0.5);
			clothPoints[idx + 2] = 0.0;
		}
	}
	return clothPoints;
}

// Generates the set of points needed to define the WebGL geometry
// as a gl_TRIANGLE_STRIP
//
// width:        the width of the generated grid
// height:       the height of the generated grid
// vertexPoints: the grid points generated by genGridPoints
// 
// returns the set of verticies as a gl_TRIANGLE_STRIP that define the cloth surface 
function genClothGeometryPoints(width, height, vertexPoints) {
	var clothPoints = new Array(3*(height - 1)*(2*width + 2));

	for (var y = 0; y < height - 1; y++) {
		var clothPointsIdx0 = 3*(y*(2*width + 2));
		var vertPointsIdx0 = 3*width*y; 
		clothPoints[clothPointsIdx0] = vertexPoints[vertPointsIdx0];
		clothPoints[clothPointsIdx0 + 1] = vertexPoints[vertPointsIdx0 + 1];
		clothPoints[clothPointsIdx0 + 2] = vertexPoints[vertPointsIdx0 + 2];

		for (var x = 0; x < width; x++) {
			var clothPointsIdx = 3*(y*(2*width + 2) + 2*x + 1);
			var vertPointsIdx = 3*(width*y + x);
			clothPoints[clothPointsIdx] = vertexPoints[vertPointsIdx];
			clothPoints[clothPointsIdx + 1] = vertexPoints[vertPointsIdx + 1];
			clothPoints[clothPointsIdx + 2] = vertexPoints[vertPointsIdx + 2];

			var vertPointsNextRowIdx = 3*(width*(y + 1) + x);
			clothPoints[clothPointsIdx + 3] = vertexPoints[vertPointsNextRowIdx];
			clothPoints[clothPointsIdx + 4] = vertexPoints[vertPointsNextRowIdx + 1];
			clothPoints[clothPointsIdx + 5] = vertexPoints[vertPointsNextRowIdx + 2];
		}

		var clothPointsIdxLast = 3*(y*(2*width + 2) + 2*width + 1);
		var vertPointsIdxLast = 3*(width*(y + 1) + width - 1);
		clothPoints[clothPointsIdxLast] = vertexPoints[vertPointsIdxLast];
		clothPoints[clothPointsIdxLast + 1] = vertexPoints[vertPointsIdxLast + 1];
		clothPoints[clothPointsIdxLast + 2] = vertexPoints[vertPointsIdxLast + 2];
	}

	return clothPoints;
}

// Helper function to print the verticies stored at each index of an array
//
// array: the array to print
function printVertexArray(array) {
	for (var i = 0; i < array.length; i = i + 3) {
		console.log("(".concat(array[i], " ",
							  array[i + 1], " ",
							  array[i + 2], ") vertex number = ", i/3));
	}
}

function print4x4Array(array) {
	for (var i = 0; i < array.length; i = i + 4) {
		console.log("(".concat(array[i], " ",
							  array[i + 1], " ",
							  array[i + 2], " ",
							  array[i + 3], "), row ", i/4));
	}
}

