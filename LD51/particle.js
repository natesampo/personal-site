class Particle {
	constructor(x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority) {
		this.x = x;
		this.y = y;
		this.angle = angle;
		this.opacity = opacity;
		this.velX = velX;
		this.velY = velY;
		this.velRot = velRot;
		this.gravity = gravity;
		this.airResistance = airResistance;
		this.duration = duration;
		this.renderPriority = renderPriority; // 0: Normal, 1: Render at very bottom, 2: Render right beneath player, 3: Render over objects, 4: Render over health bars, 5: Render over UI

		this.id = null;
	}

	translate(x, y) {
		this.x += x;
		this.y += y;
	}

	setXY(x, y) {
		this.x = x;
		this.y = y;
	}

	getShadowBoundingBox(level) {
		return null;
	}

	getBoundingBox(level) {
		return null;
	}

	tick(level) {
		level.translateObject(this, this.velX, this.velY);
		this.angle += this.velRot;

		this.velX *= (1 - this.airResistance);
		this.velY += this.gravity;

		this.duration -= 1;
		if (this.duration <= 0) {
			level.removeFromMap(this);
		}
	}
}

class EnemySelectionParticle extends Particle {
	constructor(enemy) {
		super(99999, 99999, 0, 1, 0, 0, 0, 0, 0, 99999, 1);
		this.enemy = enemy;
		this.color = 'rgba(255, 0, 0, 1)';
		this.thickness = 2;
		this.marginFactorX = 0.15;
		this.marginFactorY = 0.075;
		this.particleSpinSpeed = 0.02;
		this.spinningTickSize = 0.22;

		this.particleSpinCounter = 0;
		this.marginX = this.marginFactorX * this.enemy.sprite.width;
		this.marginY = this.marginFactorY * this.enemy.sprite.height;
	}

	tick(level) {
		super.tick(level);

		if (level.isInMap(this.enemy) && level.holdingAbility) {
			level.setObjectXY(this, this.enemy.x + this.enemy.sprite.offsetX, this.enemy.y + this.enemy.sprite.offsetY);
			this.marginX = this.marginFactorX * this.enemy.sprite.width;
			this.marginY = this.marginFactorY * this.enemy.sprite.height;
			this.particleSpinCounter += this.particleSpinSpeed;
		} else {
			level.removeFromMap(this);
		}
	}
}

class ImageParticle extends Particle {
	constructor(x, y, image, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority) {
		super(x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority);
		this.image = image;
	}
}

class FadeParticle extends Particle {
	constructor(x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority) {
		super(x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority);
		this.fadeSpeed = (duration == 0) ? 0 : 1/duration;
	}

	tick(level) {
		super.tick(level);
		this.opacity -= this.fadeSpeed;
	}
}

class FadeInFadeOutParticle extends FadeParticle {
	constructor(x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority) {
		super(x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority);
		this.fadeSpeed *= 2;
		this.initialDuration = duration;
	}

	tick(level) {
		if (this.duration > this.initialDuration/2) {
			this.opacity += this.fadeSpeed * 2;
		}

		super.tick(level);
	}
}

class SpriteFadeParticle extends FadeParticle {
	constructor(x, y, sprite, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority) {
		super(x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority);
		this.sprite = sprite;
	}

	getBoundingBox(level) {
		if (level.sprites[this.sprite.name]) {
			return [this.x - this.sprite.centerX + level.sprites[this.sprite.name].leftPixel / level.tileSize,
				this.x - this.sprite.centerX + level.sprites[this.sprite.name].rightPixel / level.tileSize,
				this.y - this.sprite.centerY + level.sprites[this.sprite.name].topPixel / level.tileSize,
				this.y - this.sprite.centerY + level.sprites[this.sprite.name].bottomPixel / level.tileSize];
		}

		return null;
	}
}

class WeaponSwingParticle extends FadeParticle {
	constructor(startPoint, endPoint, centerPoint, arcSize, mirror, color, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority) {
		super(endPoint[0], endPoint[1], 0, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority);
		this.startPoint = startPoint;
		this.endPoint = endPoint;
		this.centerPoint = centerPoint;
		this.arcSize = arcSize;
		this.mirror = mirror;
		this.color = color;
	}
}

class EnemyWeaponSwingParticle extends WeaponSwingParticle {
	constructor(level, damage, startPoint, endPoint, centerPoint, arcSize, mirror, color, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority) {
		super(startPoint, endPoint, centerPoint, arcSize, mirror, color, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority);

		for (var i=0; i<level.factions['player'].length; i++) {
			let player = level.factions['player'][i];
			// we're only checking if the object's 4 corners or the middle are colliding, but its good enough
			let playerCenterX = (player.x + player.sprite.centerX * player.sprite.width) * (level.tileSize - 1) + level.tileSize/2;
			let playerCenterY = (player.y + player.sprite.centerY * player.sprite.height) * (level.tileSize - 1) + level.tileSize/2;
			let boundingBox = player.getBoundingBox(level);
			for (var j=0; j<boundingBox.length; j++) {
				boundingBox[j] = boundingBox[j] * (level.tileSize - 1) + level.tileSize/2;
			}

			let newCanvas = document.createElement('canvas');
			newCanvas.width = window.innerWidth;
			newCanvas.height = window.innerHeight;
			let newContext = newCanvas.getContext('2d');

			let angleToStartPoint = Math.atan2(this.startPoint[1] - this.centerPoint[1], this.startPoint[0] - this.centerPoint[0]);
			let angleToEndPoint = Math.atan2(this.endPoint[1] - this.centerPoint[1], this.endPoint[0] - this.centerPoint[0]);
			let secondArcCenterPointX = this.centerPoint[0] + this.arcSize * Math.cos(angleToStartPoint);
			let secondArcCenterPointY = this.centerPoint[1] + this.arcSize * Math.sin(angleToStartPoint);
			let secondArcEndPointX = this.endPoint[0] - this.arcSize * Math.cos(angleToEndPoint);
			let secondArcEndPointY = this.endPoint[1] - this.arcSize * Math.sin(angleToEndPoint);
			let secondArcAngleToEndPoint = Math.atan2(secondArcEndPointY - secondArcCenterPointY, secondArcEndPointX - secondArcCenterPointX);

			newContext.beginPath();
			newContext.arc(this.centerPoint[0] * (level.tileSize - 1) + level.tileSize/2, this.centerPoint[1] * (level.tileSize - 1) + level.tileSize/2,
				level.tileSize * getDistance(this.centerPoint[0], this.centerPoint[1], this.endPoint[0], this.endPoint[1]),
				angleToStartPoint, angleToEndPoint, this.mirror);
			newContext.arc(secondArcCenterPointX * (level.tileSize - 1) + level.tileSize/2, secondArcCenterPointY * (level.tileSize - 1) + level.tileSize/2,
				level.tileSize * (getDistance(this.centerPoint[0], this.centerPoint[1], this.endPoint[0], this.endPoint[1]) - this.arcSize),
				secondArcAngleToEndPoint, angleToStartPoint, !this.mirror);

			if (newContext.isPointInPath(playerCenterX, playerCenterY) || newContext.isPointInPath(boundingBox[0], boundingBox[2]) || newContext.isPointInPath(boundingBox[1], boundingBox[2])
				|| newContext.isPointInPath(boundingBox[1], boundingBox[3]) || newContext.isPointInPath(boundingBox[0], boundingBox[3])) {
				player.damage(level, damage);
			}

			newContext.closePath();
		}
	}
}

class ShapeFadeParticle extends FadeParticle {
	constructor(shape, shapeData, color, outlineColor, x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority) {
		super(x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority);
		this.shape = shape;
		this.shapeData = shapeData;
		this.color = color;
		this.outlineColor = outlineColor;
	}
}

class ShapeFadeInFadeOutParticle extends FadeInFadeOutParticle {
	constructor(shape, shapeData, color, outlineColor, x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority) {
		super(x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority);
		this.shape = shape;
		this.shapeData = shapeData;
		this.color = color;
		this.outlineColor = outlineColor;
	}
}

class ShapeFadeFloorParticle extends ShapeFadeParticle {
	constructor(shape, shapeData, color, outlineColor, floor, x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority) {
		super(shape, shapeData, color, outlineColor, x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority);
		this.floor = floor;
	}

	tick(level) {
		super.tick(level);

		if (this.y > this.floor) {
			level.setObjectXY(this, this.x, this.floor);
			this.gravity = 0;
			this.velY = 0;
		}

		if (this.y == this.floor) {
			this.velX *= 0.9;
		}
	}
}

class ShapeParticle extends Particle {
	constructor(shape, shapeData, color, outlineColor, x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority) {
		super(x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority);
		this.shape = shape;
		this.shapeData = shapeData;
		this.color = color;
		this.outlineColor = outlineColor;
	}
}

class ShapeDamageOnceParticle extends ShapeParticle {
	constructor(shape, shapeData, color, outlineColor, x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, damage, renderPriority) {
		super(shape, shapeData, color, outlineColor, x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority);
		this.damage = damage;

		this.immuneObjects = [];
		this.immuneFactions = [];
		this.alreadyHit = [];
	}

	tick(level) {
		super.tick(level);

		for (var faction in level.factions) {
			if (!contains(this.immuneFactions, faction)) {
				for (var i=level.factions[faction].length-1; i>=0; i--) {
					let potentialTarget = level.factions[faction][i];
					if (!contains(this.immuneObjects, potentialTarget) && !contains(this.alreadyHit, potentialTarget)) {
						let boundingBox = potentialTarget.getBoundingBox(level);
						let angle = toRadians(this.angle);
						switch(this.shape) {
							case 'circle':
								// check 4 corners and center of target object
								if (getDistance(potentialTarget.x, potentialTarget.y, this.x, this.y) < this.shapeData ||
									getDistance(boundingBox[0], boundingBox[2], this.x, this.y) < this.shapeData || getDistance(boundingBox[1], boundingBox[2], this.x, this.y) < this.shapeData ||
									getDistance(boundingBox[1], boundingBox[3], this.x, this.y) < this.shapeData || getDistance(boundingBox[0], boundingBox[3], this.x, this.y) < this.shapeData) {

									this.alreadyHit.push(potentialTarget);
									potentialTarget.damage(level, this.damage);
								}
								break;
						}
					}
				}
			}
		}
	}
}

class ShapeDamageParticle extends ShapeParticle {
	constructor(shape, shapeData, color, outlineColor, x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, damage, renderPriority) {
		super(shape, shapeData, color, outlineColor, x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority);
		this.damage = damage;

		this.immuneObjects = [];
		this.immuneFactions = [];

		this.initialDuration = this.duration;
		this.triggered = false;
	}

	tick(level) {
		super.tick(level);

		let pentagramAttackNow = false;
		if (this.shape == 'pentagram') {
			if (this.triggered) {
				this.opacity -= this.opacity / Math.max(1, this.duration);
			} else {
				this.opacity = (this.initialDuration - this.duration) / this.initialDuration/2;

				if (this.duration < this.initialDuration/2) {
					this.opacity = 1;
					this.triggered = true;
					pentagramAttackNow = true;
				}
			}
		}

		for (var faction in level.factions) {
			if (!contains(this.immuneFactions, faction)) {
				for (var i=level.factions[faction].length-1; i>=0; i--) {
					let potentialTarget = level.factions[faction][i];
					if (!contains(this.immuneObjects, potentialTarget)) {
						let boundingBox = potentialTarget.getBoundingBox(level);
						let angle = toRadians(this.angle);
						switch(this.shape) {
							case 'laser':
								let damage = (faction == 'player' ? this.damage/4 : this.damage);
								if (this.shapeData[2] > 0) {
									let beamStart1X = this.x + this.shapeData[0] * Math.sin(angle - 0.5 * Math.PI * this.shapeData[1]);
									let beamStart1Y = this.y + this.shapeData[0] * Math.cos(angle - 0.5 * Math.PI * this.shapeData[1]);
									let beamStart2X = this.x + this.shapeData[0] * Math.sin(angle + 0.5 * Math.PI * this.shapeData[1]);
									let beamStart2Y = this.y + this.shapeData[0] * Math.cos(angle + 0.5 * Math.PI * this.shapeData[1]);
									let beamEnd1X = this.shapeData[2] * Math.cos(angle) + beamStart1X;
									let beamEnd1Y = this.shapeData[2] * Math.sin(angle) + beamStart1Y;
									let beamEnd2X = this.shapeData[2] * Math.cos(angle) + beamStart2X;
									let beamEnd2Y = this.shapeData[2] * Math.sin(angle) + beamStart2Y;

									let beamPolygon = [[beamStart1X, beamStart1Y], [beamEnd1X, beamEnd1Y], [beamEnd2X, beamEnd2Y], [beamStart2X, beamStart2Y]];
									let targetPolygon = [[boundingBox[0], boundingBox[3]], [boundingBox[0], boundingBox[2]], [boundingBox[1], boundingBox[2]], [boundingBox[1], boundingBox[3]]];
									if (getDistance(potentialTarget.x, potentialTarget.y, this.x, this.y) <= this.shapeData[0] || doPolygonsIntersect(beamPolygon, targetPolygon) ||
										pointInPolygon([potentialTarget.x, potentialTarget.y], beamPolygon)) {
										potentialTarget.damage(level, damage);
									}
								} else if (getDistance(potentialTarget.x, potentialTarget.y, this.x, this.y) <= this.shapeData[0]) {
									potentialTarget.damage(level, damage/4);
								}
								break;
							case 'pentagram':
								if (pentagramAttackNow) {
									level.audio['pentagram'].play();

									let newCanvas = document.createElement('canvas');
									newCanvas.width = window.innerWidth;
									newCanvas.height = window.innerHeight;
									let newContext = newCanvas.getContext('2d');

									newContext.beginPath();
									newContext.ellipse(this.x, this.y, this.shapeData[0], this.shapeData[1], toRadians(this.angle), 0, 2*Math.PI);
									let collide1 = newContext.isPointInPath(potentialTarget.x, potentialTarget.y);
									let collide2 = newContext.isPointInPath(boundingBox[0], boundingBox[2]);
									let collide3 = newContext.isPointInPath(boundingBox[0], boundingBox[3]);
									let collide4 = newContext.isPointInPath(boundingBox[1], boundingBox[2]);
									let collide5 = newContext.isPointInPath(boundingBox[1], boundingBox[3]);
									newContext.closePath();

									if (collide1 || collide2 || collide3 || collide4 || collide5) {
										potentialTarget.damage(level, this.damage);
									}
								}
								break;
						}
					}
				}
			}
		}
	}
}