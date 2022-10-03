function toDegrees(radians) {
	return radians * (180 / Math.PI);
}

function toRadians(degrees) {
	return degrees * (Math.PI / 180);
}

function contains(list, item) {
	for (var i=0; i<list.length; i++) {
		if (list[i] == item) {
			return true;
		}
	}

	return false;
}

function remove(list, item) {
	for (var i=0; i<list.length; i++) {
		if (list[i] == item) {
			list.splice(i, 1);
			return i;
		}
	}

	return null;
}

function getIndex(list, item) {
	for (var i=0; i<list.length; i++) {
		if (list[i] == item) {
			return i;
		}
	}

	return -1;
}

function shuffle(array) {
	let currentIndex = array.length, randomIndex;

	while (currentIndex != 0) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;
		[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
	}

	return array;
}

function copyArray(list) {
	let copy = [];
	for (var i=0; i<list.length; i++) {
		copy.push(list[i]);
	}

	return copy;
}

function getDistance(x1, y1, x2, y2) {
	let a = x2 - x1;
	let b = y2 - y1;
	return Math.sqrt(a * a + b * b);
}

function mirrorAngle(angle) {
	return (180 - angle + (angle > 180 ? 360 : 0)) % 360;
}

function getAngle(x1, y1, x2, y2) {
	let dy = y2 - y1;
	let dx = x2 - x1;
	let theta = Math.atan2(dy, dx);
	theta *= 180 / Math.PI;
	if (theta < 0) theta = 360 + theta;
	return theta;
}

function getAngleRadians(x1, y1, x2, y2) {
	let dy = y2 - y1;
	let dx = x2 - x1;
	let theta = Math.atan2(dy, dx);
	return theta;
}

function rotateAboutPoint(x, y, cx, cy, angle) {
	let radians = (Math.PI / 180) * angle;
	let cos = Math.cos(radians);
	let sin = Math.sin(radians);

	let newX = (cos * (x - cx)) - (sin * (y - cy)) + cx;
	let newY = (cos * (y - cy)) + (sin * (x - cx)) + cy;

	return [newX, newY];
}

function snapToEightPoints(x1, y1, x2, y2) {
	let angle = getAngle(x1, y1, x2, y2);
	return Math.round(angle / 45);
}

function findPath(object, weights, x1, y1, x2, y2) {
	let a = y2 - y1;
	let b = x2 - x1;
	let theta = Math.atan2(a, b);
	let closeToDiag = Math.abs(Math.sin(2 * theta)) / 3 + 1;
	theta *= 180 / Math.PI;
	if (theta < 0) theta = 360 + theta;
	let ind = theta / 45;
	let remainder = ind - (ind << 0);
	let rounded = ind << 0;
	weights[rounded] += 1.5 * (1 - remainder);
	weights[(rounded + 1) % 8] += 1.5 * remainder;

	let weightX = weights[0] + weights[1]/2 + weights[7]/2 - weights[3]/2 - weights[4] - weights[5]/2;
	let weightY = weights[1]/2 + weights[2] + weights[3]/2 - weights[5]/2 - weights[6] - weights[7]/2;

	let sum = Math.abs(weightX) + Math.abs(weightY);

	let moveX = closeToDiag * (weightX / sum);
	let moveY = closeToDiag * (weightY / sum);

	object.bias += object.biasUp ? 0.005 : -0.005;
	if (Math.abs(object.bias) >= 0.5) {
		object.biasUp = !object.biasUp;
	}

	return [moveX, moveY];
}

function lineIntersects(x1, y1, x2, y2, x3, y3, x4, y4) {
	var det, gamma, lambda;
	det = (x2 - x1) * (y4 - y3) - (x4 - x3) * (y2 - y1);
	if (det === 0) {
		return false;
	} else {
		lambda = ((y4 - y3) * (x4 - x1) + (x3 - x4) * (y4 - y1)) / det;
		gamma = ((y1 - y2) * (x4 - x1) + (x2 - x1) * (y4 - y1)) / det;
		return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
	}
};

// takes a point of form [x, y] and an array of connected points of form [[x1, y1], [x2, y2], ...]
function pointInPolygon(point, polygon) {
	// ray-casting algorithm based on
	// https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html

	var x = point[0], y = point[1];

	var inside = false;
	for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		var xi = polygon[i][0], yi = polygon[i][1];
		var xj = polygon[j][0], yj = polygon[j][1];

		var intersect = ((yi > y) != (yj > y))
		&& (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
		if (intersect) inside = !inside;
	}

	return inside;
};

// takes two arrays of connected points of form [[x1, y1], [x2, y2], ...]
function doPolygonsIntersect (a, b) {
	var polygons = [a, b];
	var minA, maxA, projected, i, i1, j, minB, maxB;

	for (i = 0; i < polygons.length; i++) {

		// for each polygon, look at each edge of the polygon, and determine if it separates
		// the two shapes
		var polygon = polygons[i];
		for (i1 = 0; i1 < polygon.length; i1++) {

			// grab 2 vertices to create an edge
			var i2 = (i1 + 1) % polygon.length;
			var p1 = polygon[i1];
			var p2 = polygon[i2];

			// find the line perpendicular to this edge
			var normal = { x: p2[1] - p1[1], y: p1[0] - p2[0] };

			minA = maxA = undefined;
			// for each vertex in the first shape, project it onto the line perpendicular to the edge
			// and keep track of the min and max of these values
			for (j = 0; j < a.length; j++) {
				projected = normal.x * a[j][0] + normal.y * a[j][1];
				if (minA == undefined || projected < minA) {
					minA = projected;
				}
				if (maxA == undefined || projected > maxA) {
					maxA = projected;
				}
			}

			// for each vertex in the second shape, project it onto the line perpendicular to the edge
			// and keep track of the min and max of these values
			minB = maxB = undefined;
			for (j = 0; j < b.length; j++) {
				projected = normal.x * b[j][0] + normal.y * b[j][1];
				if (minB == undefined || projected < minB) {
					minB = projected;
				}
				if (maxB == undefined || projected > maxB) {
					maxB = projected;
				}
			}

			// if there is no overlap between the projects, the edge we are looking at separates the two
			// polygons, and we know there is no overlap
			if (maxA < minB || maxB < minA) {
				return false;
			}
		}
	}

	return true;
};