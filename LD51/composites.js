class CompositeObject {
	constructor(children, base) {
		this.children = children;
		this.base = base;

		this.state = 'idle';
		this.stateCounter = 0;

		for (var child in this.children) {
			this.children[child].parent = this;
		}

		this.initAlignAndCalibrateChildren();
	}

	changeState(level, newState) {
		this.stateCounter = 0;
		this.state = newState;
	}

	setMirror(level, mirror) {
		let baseMirrored = false;
		if (this.base.mirror != mirror) {
			baseMirrored = true;
		}

		if (baseMirrored) {
			for (var childIndex in this.children) {
				let child = this.children[childIndex];
				if (child.dontTranslateUponMirror) {
					for (var linkagePartner in this.children) {
						let linkageIndex = getIndex(this.children[linkagePartner].linkages, child);
						if (linkageIndex != -1) {
							this.children[linkagePartner].calibration[linkageIndex][1] = 180 - this.children[linkagePartner].calibration[linkageIndex][1];
						}
					}
				} else {
					child.mirror = mirror;
				}
			}
		}
	}

	scale(level, scaleFactor) {
		this.base.scaleLinkagesWithoutCalibratingRecursive(level, scaleFactor);
		this.base.matchLinkagesCalibrationRecursive(level);

		for (var childIndex in this.children) {
			this.children[childIndex].sprite.scaleX *= scaleFactor;
			this.children[childIndex].sprite.scaleY *= scaleFactor;
			this.children[childIndex].arcSize *= scaleFactor;
		}
	}

	initAlignAndCalibrateChildren() {
		for (var childIndex in this.children) {
			let child = this.children[childIndex];
			if (child != this.base) {
				child.x = this.base.x + (this.base.mirror ? -1 : 1) * (child.sprite.centerX * child.sprite.width - this.base.sprite.centerX * this.base.sprite.width) * child.sprite.scaleX;
				child.y = this.base.y + (child.sprite.centerY * child.sprite.height - this.base.sprite.centerY * this.base.sprite.height) * child.sprite.scaleY;
			}
		}

		this.calibrateAllChildren();
	}

	calibrateAllChildren() {
		for (var childIndex in this.children) {
			let child = this.children[childIndex];
			child.calibration = child.getCalibration();
		}
	}

	getRenderOrder() {
		let returnOrder = [];
		for (var child in this.children) {
			returnOrder.push(this.children[child]);
		}

		return returnOrder;
	}

	getShadowBoundingBox(level, caller) {
		if (caller == this.getRenderOrder()[0]) {
			let maxY = null;
			let maxYObj = null;
			for (var childIndex in this.children) {
				let child = this.children[childIndex];

				if (!level.sprites[child.sprite.name]) {
					return null;
				}

				let childBottomY = child.y + (level.sprites[child.sprite.name].bottomPixel/level.tileSize - child.sprite.centerY * child.sprite.height);
				if (maxYObj == null) {
					maxY = childBottomY;
					maxYObj = child;
				} else {
					if (childBottomY > maxY) {
						maxY = childBottomY;
						maxYObj = child;
					}
				}
			}

			let spriteData = level.sprites[this.base.sprite.name];
			return [(spriteData.leftPixel/level.tileSize - this.base.sprite.centerX * this.base.sprite.width) * this.base.sprite.scaleX,
					(spriteData.rightPixel/level.tileSize - this.base.sprite.centerX * this.base.sprite.width) * this.base.sprite.scaleX,
					(spriteData.topPixel/level.tileSize - this.base.sprite.centerY * this.base.sprite.height) * this.base.sprite.scaleY,
					(level.sprites[maxYObj.sprite.name].bottomPixel/level.tileSize - this.base.sprite.centerY * this.base.sprite.height) * this.base.sprite.scaleY];
		}

		return null;
	}

	damage(level, dmg) {
		return false;
	}

	processTick(level) {
		this.stateCounter++;
		this.base.matchLinkagesCalibrationRecursive(level);
	}

	tick(level, caller) {
		if (caller == this.base) {
			this.processTick(level);
		}
	}
}

class MobCompositeObject extends CompositeObject {
	constructor(children, base, speed, hp) {
		super(children, base);
		this.speed = speed;
		this.hp = hp;

		this.hpTotal = hp;
		this.recentlyDamagedFlashTime = 25;
		this.dieFadeSpeed = 0.024;
		this.aggroRange = 100;
		this.name = 'Mob';

		this.attackTarget = null;
		this.attackSpeed = 0;
		this.attackCounter = 0;
		this.attackRange = 0;
		this.attackDamage = 0;
		this.spellAmp = 0;
		this.cdr = 0;
		this.recentlyDamaged = 0;
	}

	damage(level, dmg) {
		this.hp -= dmg;

		if (this.hp <= 0) {
			level.removeFromFaction(this);
			return true;
		} else {
			this.recentlyDamaged = this.recentlyDamagedFlashTime;
		}

		return false;
	}

	processDeath(level) {
		for (var child in this.children) {
			this.children[child].opacity -= this.dieFadeSpeed;
		}

		if (this.base.opacity <= 0) {
			this.die(level);
		}
	}

	die(level) {
		level.removeFromMap(this);
	}

	processTick(level) {
		super.processTick(level);

		if (this.recentlyDamaged > 0) {
			this.recentlyDamaged--;
		}

		if (this.hp <= 0) {
			this.processDeath(level);
		}
	}
}

class ChildObject extends GameObject {
	constructor(x, y, sprite, angle, animationSpeed, collideable, playable, attackable, speed, opacity, parent, linkages) {
		super(x, y, sprite, angle, animationSpeed, collideable, playable, attackable, speed, opacity);
		this.parent = parent;
		// list of objects that are dependent on this one
		this.linkages = linkages;

		this.arcPoint = [0, 0];
		this.arcSize = 0;
		this.dontTranslateUponMirror = false;
	}

	getArcPoint() {
		let ang = this.angle;
		let arcPointX = this.arcPoint[0] * this.sprite.width;
		let arcPointY = this.arcPoint[1] * this.sprite.height;
		let spriteCenterX = this.sprite.centerX * this.sprite.width;
		let spriteCenterY = this.sprite.centerY * this.sprite.height;

		if (this.mirror) {
			arcPointX = this.sprite.width - arcPointX;
			spriteCenterX = this.sprite.width - spriteCenterX;
		}

		let radians = (Math.PI / 180) * ang;
		let cos = Math.cos(radians);
		let sin = Math.sin(radians);

		let newX = 0;
		let newY = 0;
		if (this.mirror) {
			newX = ((cos * (arcPointX - spriteCenterX)) + (sin * (arcPointY - spriteCenterY))) * this.sprite.scaleX + this.x;
			newY = ((cos * (arcPointY - spriteCenterY)) - (sin * (arcPointX - spriteCenterX))) * this.sprite.scaleY + this.y;
		} else {
			newX = ((cos * (arcPointX - spriteCenterX)) - (sin * (arcPointY - spriteCenterY))) * this.sprite.scaleX + this.x;
			newY = ((cos * (arcPointY - spriteCenterY)) + (sin * (arcPointX - spriteCenterX))) * this.sprite.scaleY + this.y;
		}

		return [newX, newY];
	}

	translateAndLinkages(level, x, y) {
		level.translateObject(this, x, y);
		for (var i=0; i<this.linkages.length; i++) {
			this.linkages[i].translateAndLinkages(level, x, y);
		}
	}

	translateLinkageAndCalibrate(level, child, x, y) {
		if (this.mirror) {
			x = -x;
		}
		level.translateObject(child, x, y);

		for (var i=0; i<child.linkages.length; i++) {
			child.linkages[i].translateAndLinkages(level, x, y);
		}

		this.setSpecificCalibration(child);
	}

	setLinkageXYAndCalibrate(level, child, x, y) {
		let translationX = x - this.x;
		let translationY = y - this.y;
		level.setObjectXY(child, x, y);

		for (var i=0; i<child.linkages.length; i++) {
			child.linkages[i].translateAndLinkages(level, translationX, translationY);
		}

		this.setSpecificCalibration(child);
	}

	setXYAndPullLinkages(level, x, y) {
		level.setObjectXY(this, x, y);
		this.matchLinkagesCalibrationRecursive(level);
	}

	setRotationAndLinkages(level, angle) {
		this.angle = angle;
		this.matchLinkagesCalibration(level);

		for (var i=0; i<this.linkages.length; i++) {
			this.linkages[i].setRotationAndLinkages(level, angle);
		}
	}

	rotateAndLinkages(level, angle) {
		this.angle += angle;
		this.matchLinkagesCalibration(level);

		for (var i=0; i<this.linkages.length; i++) {
			this.linkages[i].rotateAndLinkages(level, angle);
		}
	}

	matchLinkagesCalibration(level) {
		for (var i=0; i<this.linkages.length; i++) {
			let ang = ((this.calibration[i][1] + this.angle) % 360);
			if (this.mirror) {
				ang = mirrorAngle(ang);
			}
			
			let radians = (Math.PI / 180) * ang;
			let newX = Math.cos(radians) * this.calibration[i][0] + this.x;
			let newY = Math.sin(radians) * this.calibration[i][0] + this.y;
			
			level.setObjectXY(this.linkages[i], newX, newY);
		}
	}

	matchLinkagesCalibrationRecursive(level) {
		this.matchLinkagesCalibration(level);

		for (var i=0; i<this.linkages.length; i++) {
			this.linkages[i].matchLinkagesCalibrationRecursive(level);
		}
	}

	matchSpecificLinkageCalibration(level, object) {
		let linkageIndex = getIndex(this.linkages, object);
		if (linkageIndex != -1) {
			let ang = ((this.calibration[linkageIndex][1] + this.angle) % 360);
			if (this.mirror) {
				ang = mirrorAngle(ang);
			}
			
			let radians = (Math.PI / 180) * ang;
			let newX = Math.cos(radians) * this.calibration[linkageIndex][0] + this.x;
			let newY = Math.sin(radians) * this.calibration[linkageIndex][0] + this.y;
			
			level.setObjectXY(this.linkages[linkageIndex], newX, newY);	
		}
	}

	matchSpecificLinkageCalibrationRecursive(level, object) {
		this.matchSpecificLinkageCalibration(level, object);
		object.matchLinkagesCalibrationRecursive(level);
	}

	setSpecificCalibration(object) {
		let index = getIndex(this.linkages, object);
		if (index != -1) {
			this.calibration.splice(index, 1, this.getNewCalibration(object));
		}
	}

	getNewCalibration(linkage) {
		/*let ang = getAngle(this.x, this.y, linkage.x, linkage.y) - this.angle;
		if (this.mirror) {
			ang = mirrorAngle(ang);
		}*/
		let ang = getAngle(this.x, this.y, linkage.x, linkage.y);
		if (this.mirror) {
			ang = mirrorAngle(ang);
		}
		ang = (ang - this.angle) % 360;
		
		return [getDistance(this.x, this.y, linkage.x, linkage.y), ang];
	}

	getCalibration() {
		// calibration is a list of [distance, angle]s for each linkage
		let calibration = [];
		for (var i=0; i<this.linkages.length; i++) {
			calibration.push(this.getNewCalibration(this.linkages[i]));
		}

		return calibration;
	}

	extendLinkageRadius(level, object, distance) {
		for (var i=0; i<this.linkages.length; i++) {
			if (this.linkages[i] == object) {
				this.calibration[i][0] += distance;
				break;
			}
		}

		this.matchSpecificLinkageCalibrationRecursive(level, object);
	}

	scaleLinkagesWithoutCalibratingRecursive(level, scaleFactor) {
		for (var i=0; i<this.linkages.length; i++) {
			this.calibration[i][0] *= scaleFactor;
			this.linkages[i].scaleLinkagesWithoutCalibratingRecursive(level, scaleFactor);
		}
	}

	addLinkageAngle(object, angle) {
		for (var i=0; i<this.linkages.length; i++) {
			if (this.linkages[i] == object) {
				this.calibration[i][1] += angle;
				break;
			}
		}
	}

	addLinkage(object) {
		this.linkages.push(object);
		this.calibration.push(this.getNewCalibration(object));
	}

	removeLinkage(object) {
		let index = remove(this.linkages, object);
		if (index != null) {
			this.calibration.splice(index, 1);
		}
	}

	setTarget(level, x, y) {
		super.setTarget(level, x, y);

		this.parent.setMirror(level, this.mirror);
	}

	damage(level, dmg) {
		return this.parent.damage(level, dmg);
	}

	getShadowBoundingBox(level) {
		return this.parent.getShadowBoundingBox(level, this);
	}

	addAbility(ability) {
		return this.parent.addAbility(ability);
	}

	tick(level) {
		super.tick(level);

		this.parent.tick(level, this);
	}
}

class SnakeMage extends MobCompositeObject {
	constructor(x, y) {
		let mouth = new ChildObject(x, y, new Sprite('snakemagemouth_1_1.png', 0, 0, 1, 1, 1, 0.34375, 0.40625), 0, 0, false, false, false, 0, 1, null, []);
		let head = new ChildObject(x, y, new Sprite('snakemagehead_1_1.png', 0, 0, 1, 1, 1, 0.34375, 0.34375), 0, 0, false, false, false, 0, 1, null, [mouth]);
		let body = new ChildObject(x, y, new Sprite('snakemagebody_1_1.png', 0, 0, 1, 1, 1, 0.5625, 0.96875), 0, 0, true, false, false, 0, 1, null, [head]);

		super({'mouth': mouth,'head': head, 'body': body}, body, 0, 40);

		this.name = 'Snake';
		this.attackDamage = 0.15;
		this.cooldown = 200;
		this.chargeTime = 240;
		this.fireTime = 240;
		this.beamWindDownTime = 60;

		this.maxHeadSpinSpeed = 0.75;
		this.mouthOpenTime = 30;
		this.mouthOpenAngle = 20;

		this.beamParticleMinRadius = 0.1;
		this.beamParticleMaxRadius = 1;
		this.beamParticleGap = 0;
		this.beamParticleRadiusVariation = 0.05;
		this.beamParticleVariationSpeed = 0.5;
		this.beamSpeed = 1.5;
		this.beamPercentageWidth = 0.7;
		this.beamTipHeight = 0.5; // radius of oval at end of beam
		this.beamScreenShake = 0.1;
		this.smallParticleRadius = 0.05;
		this.smallParticleDistance = 0.8;
		this.smallParticleSpeed = 0.03;
		this.smallParticlesPerTick = 1.5;

		this.cooldownCounter = this.cooldown;
		this.targetX = x + 1;
		this.targetY = y;
		this.beamParticle = null;
		this.beamParticleVariationCounter = 0;
		this.smallParticles = [];
	}

	changeState(level, newState) {
		super.changeState(level, newState);
	}

	processTick(level) {
		super.processTick(level);

		if (this.hp > 0) {
			let head = this.children['head'];
			let mouth = this.children['mouth'];

			if (level.gameState != 4 && level.gameState != 10 && level.gameState != 12) {
				this.stateCounter--;
				if (this.cooldownCounter > 0) {
					this.cooldownCounter++;
				}
			}

			switch(this.state) {
				case 'idle':
					if (this.cooldownCounter > 0) {
						this.cooldownCounter--;
					}

					if (!this.attackTarget || !level.isInMap(this.attackTarget)) {
						this.findClosestEnemy(level);
					}
					this.rotateHead(level);

					if (this.cooldownCounter <= 0 && this.attackTarget) {
						this.changeState(level, 'mouthOpening');
					}
					break;
				case 'mouthOpening':
					if (this.attackTarget) {
						mouth.rotateAndLinkages(level, this.mouthOpenAngle/(this.mouthOpenTime));
						if (this.stateCounter >= this.mouthOpenTime) {
							let distanceToParticle = (((1 - head.sprite.centerX) * head.sprite.width) + this.beamParticleGap + this.beamParticleMaxRadius);

							let angle = head.mirror ? 180 - head.angle : head.angle;
							// shapeData: [radius, beamPercent, beamLength, topArcHeight]
							this.beamParticle = new ShapeDamageParticle('laser', [this.beamParticleMinRadius, this.beamPercentageWidth, 0, this.beamTipHeight], 'rgba(255, 255, 255, 1)', 'rgba(0, 0, 0, 1)',
								head.x + distanceToParticle * Math.cos(toRadians(angle)),
								head.y + distanceToParticle * Math.sin(toRadians(angle)),
								angle, 1, 0, 0, 0, 0, 0, 99999, this.attackDamage, 3);
							this.beamParticle.immuneObjects = [this.base];
							level.addObject(this.beamParticle);

							this.changeState(level, 'charging');
						}
					} else {
						mouth.setRotationAndLinkages(level, head.angle);
						this.changeState(level, 'idle');
					}

					if (!this.attackTarget || !level.isInMap(this.attackTarget)) {
						this.findClosestEnemy(level);
					}
					this.rotateHead(level);
					break;
				case 'charging':
					this.beamParticleVariationCounter += this.beamParticleVariationSpeed;

					let percentageCharged = this.stateCounter/this.chargeTime;
					let variation = this.beamParticleRadiusVariation * Math.sin(this.beamParticleVariationCounter) * (1 - percentageCharged);
					let distanceToParticle = (((1 - head.sprite.centerX) * head.sprite.width) + this.beamParticleGap + this.beamParticleMaxRadius);
					let smallParticleDuration = (this.smallParticleDistance + this.beamParticle.shapeData[0])/this.smallParticleSpeed;
					let translateX = -(this.beamParticle.x - (head.x + distanceToParticle * Math.cos(toRadians(head.mirror ? 180 - head.angle : head.angle))));
					let translateY = -(this.beamParticle.y - (head.y + distanceToParticle * Math.sin(toRadians(head.mirror ? 180 - head.angle : head.angle))));
					level.translateObject(this.beamParticle, translateX, translateY);
					this.beamParticle.shapeData[0] = this.beamParticleMinRadius + variation + ((this.beamParticleMaxRadius - this.beamParticleMinRadius) * percentageCharged);

					for (var i=this.smallParticles.length-1; i>=0; i--) {
						let particle = this.smallParticles[i];
						if (particle.duration <= 0) {
							this.smallParticles.splice(i, 1);
						} else {
							level.translateObject(particle, translateX, translateY);
						}
					}

					if (smallParticleDuration < this.chargeTime - this.stateCounter) {
						for (var i=0; i<this.smallParticlesPerTick + 1; i++) {
							// use Math.random() to get the fractional particles per tick
							if ((i < this.smallParticlesPerTick) || (Math.random() > i - this.smallParticlesPerTick)) {
								let smallParticleAngle = 2 * Math.PI * Math.random();
								let newSmallParticle = new ShapeFadeParticle('rect', [0.15, 0.02], 'rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)',
									this.beamParticle.x + (this.smallParticleDistance + this.beamParticle.shapeData[0]) * Math.cos(smallParticleAngle),
									this.beamParticle.y + (this.smallParticleDistance + this.beamParticle.shapeData[0]) * Math.sin(smallParticleAngle),
									toDegrees(smallParticleAngle), 0,
									-this.smallParticleSpeed * Math.cos(smallParticleAngle),
									-this.smallParticleSpeed * Math.sin(smallParticleAngle),
									0, 0, 0, Math.ceil((this.smallParticleDistance + this.beamParticle.shapeData[0])/this.smallParticleSpeed), 3);
								newSmallParticle.fadeSpeed /= -(this.smallParticleDistance/(this.smallParticleDistance + this.beamParticle.shapeData[0]) + 0.1);
								this.smallParticles.push(newSmallParticle);
								level.addObject(newSmallParticle);
							}
						}
					}

					if (this.stateCounter > this.chargeTime) {
						this.beamParticleVariationCounter = 0;
						this.smallParticles = [];
						this.beamParticle.angle = head.mirror ? 180 - head.angle : head.angle;
						level.audio['laser'].play();

						this.changeState(level, 'firing');
					}

					if (!this.attackTarget || !level.isInMap(this.attackTarget)) {
						this.findClosestEnemy(level);
					}
					this.rotateHead(level);
					break;
				case 'firing':
					this.beamParticle.shapeData[2] += this.beamSpeed;
					level.setScreenShake(this.beamScreenShake);

					if (this.stateCounter > this.fireTime) {
						this.changeState(level, 'windingDown');
					}
					break;
				case 'windingDown':
					if (this.stateCounter < this.beamWindDownTime) {
						this.beamParticle.shapeData[0] -= this.beamParticle.shapeData[0] / (this.beamWindDownTime - this.stateCounter);
					}

					mouth.rotateAndLinkages(level, -this.mouthOpenAngle/this.beamWindDownTime);

					if (this.stateCounter > this.beamWindDownTime) {
						this.cooldownCounter = this.cooldown;
						level.removeFromMap(this.beamParticle);
						this.beamParticle = null;
						mouth.setRotationAndLinkages(level, head.angle);

						this.changeState(level, 'idle');
					}
					break;
			}
		}
	}

	rotateHead(level) {
		if (this.attackTarget) {
			let head = this.children['head'];

			this.targetX = this.attackTarget.x;
			this.targetY = this.attackTarget.y;

			if (this.targetX < head.x) {
				this.setMirror(level, true);
			} else {
				this.setMirror(level, false);
			}

			let angleToRotateHead = getAngle(head.x, head.y, this.targetX, this.targetY);
			if (head.mirror) {
				angleToRotateHead = 180 - angleToRotateHead - (head.angle % 360);
			} else {
				angleToRotateHead = angleToRotateHead - (head.angle % 360);
			}

			if (angleToRotateHead > 180) {
				angleToRotateHead -= 360;
			}
			head.rotateAndLinkages(level, Math.min(this.maxHeadSpinSpeed, Math.max(-this.maxHeadSpinSpeed, angleToRotateHead)));
		}
	}

	findClosestEnemy(level) {
		let head = this.children['head'];

		this.attackTarget = null;
		let closestDist = this.aggroRange;
		for (var faction in level.factions) {
			if (faction != 'player') {
				for (var i=0; i<level.factions[faction].length; i++) {
					let potentialTarget = level.factions[faction][i];
					let distanceToEnemy = getDistance(head.x, head.y, potentialTarget.x, potentialTarget.y);
					if (distanceToEnemy < closestDist) {
						this.attackTarget = potentialTarget;
						closestDist = distanceToEnemy;
					}
				}
			}
		}
	}

	processDeath(level) {
		super.processDeath(level);

		if (this.beamParticle) {
			switch(this.state) {
				case 'charging':
					if (this.base.opacity > 0.05) {
						this.beamParticle.shapeData[0] -= this.beamParticle.shapeData[0] * (1 - this.base.opacity);

						for (var i=this.smallParticles.length-1; i>=0; i--) {
							let distanceRequired = getDistance(this.smallParticles[i].x, this.smallParticles[i].y, this.beamParticle.x, this.beamParticle.y);
							if (distanceRequired > 0.07) {
								let speedRequired = -distanceRequired * (1 - this.base.opacity);
								this.smallParticles[i].velX = speedRequired * Math.cos(toRadians(this.smallParticles[i].angle));
								this.smallParticles[i].velY = speedRequired * Math.sin(toRadians(this.smallParticles[i].angle));
								this.smallParticles[i].opacity = Math.min(this.smallParticles[i].opacity, this.base.opacity);
								this.smallParticles[i].fadeSpeed = this.dieFadeSpeed;
								this.smallParticles[i].duration = (this.base.opacity / this.dieFadeSpeed) << 0;
							} else {
								level.removeFromMap(this.smallParticles[i]);
								this.smallParticles.splice(i, 1);
							}
						}
					}
					break;
				case 'firing':
					this.beamParticle.shapeData[2] += this.beamSpeed;
				case 'windingDown':
					this.beamParticle.shapeData[0] *= 0.95;
					break;
			}

			if (this.beamParticle.shapeData[0] <= 0) {
				level.removeFromMap(this.beamParticle);
				this.beamParticle = null;
			}
		}
	}

	die(level) {
		super.die(level);

		if (this.beamParticle) {
			if (this.beamParticle.shapeData[2] > 0) {
				this.beamParticle.shapeData[0] *= this.beamParticle.shapeData[1];
				this.beamParticle.shapeData[1] = 1;
				this.beamParticle.velX = this.beamSpeed * Math.cos(toRadians(this.beamParticle.angle));
				this.beamParticle.velY = this.beamSpeed * Math.sin(toRadians(this.beamParticle.angle));

				let canvasWidthTileSpace = level.screen.canvas.width / ((level.tileSize - 1) * level.screen.camera.zoomLevel) + level.screen.camera.x - 0.5;
				let canvasHeightTileSpace = level.screen.canvas.height / ((level.tileSize - 1) * level.screen.camera.zoomLevel) + level.screen.camera.y - 0.5;
				let maxDistance = Math.sqrt(canvasWidthTileSpace * canvasWidthTileSpace + canvasHeightTileSpace * canvasHeightTileSpace);
				this.beamParticle.duration = Math.ceil(maxDistance / this.beamSpeed) + 1;
			} else {
				level.removeFromMap(this.beamParticle);
				this.beamParticle = null;
			}
		}

		for (var i=0; i<this.smallParticles.length; i++) {
			level.removeFromMap(this.smallParticles[i]);
		}
		this.smallParticles = [];
	}

	getRenderOrder() {
		return [this.children['body'], this.children['head'], this.children['mouth']];
	}

	getShadowBoundingBox(level, caller) {
		let shadowData = super.getShadowBoundingBox(level, caller);

		if (shadowData) {
			shadowData[0] += 0.14;
			shadowData[1] += 0.14;
			shadowData[3] += 0.03;
		}

		return shadowData;
	}
}

class PlayerObject extends MobCompositeObject {
	constructor(type, x, y) {
		// x, y, sprite, angle, animationSpeed, collideable, playable, attackable, speed, opacity, parent, linkages
		// name, x, y, width, height, frames, centerX, centerY
		let leftLeg = new ChildObject(x, y, new Sprite(type + 'leftleg_1_1.png', 0, 0, 1, 1, 1, 0.5625, 0.6875), 0, 0, false, false, false, 0, 1, null, []);
		let rightLeg = new ChildObject(x, y, new Sprite(type + 'rightleg_1_1.png', 0, 0, 1, 1, 1, 0.4375, 0.6875), 0, 0, false, false, false, 0, 1, null, []);
		let leftArm = new ChildObject(x, y, new Sprite(type + 'leftarm_1_1.png', 0, 0, 1, 1, 1, 0.625, 0.4375), 0, 0, false, false, false, 0, 1, null, []);
		let axe = new ChildObject(x, y, new Sprite(type + 'axe_1_1.png', 0, 0, 1, 1, 1, 0.34375, 0.625), 0, 0, false, false, false, 0, 1, null, []);
		let rightHand = new ChildObject(x, y, new Sprite(type + 'righthand_1_1.png', 0, 0, 1, 1, 1, 0.25, 0.5625), 0, 0, false, false, false, 0, 1, null, [axe]);
		let rightArm = new ChildObject(x, y, new Sprite(type + 'rightarm_1_1.png', 0, 0, 1, 1, 1, 0.40625, 0.40625), 0, 0, false, false, false, 0, 1, null, [rightHand]);
		let torso = new ChildObject(x, y, new Sprite(type + 'torso_1_1.png', 0, 0, 1, 1, 1, 0.5, 0.65625), 0, 0, false, true, false, 0, 1, null, [leftLeg, rightLeg, rightArm, leftArm]);

		axe.arcPoint = [0.875, 0.375];
		axe.arcSize = 0.140625;

		super({'rightHand': rightHand, 'axe': axe, 'rightArm': rightArm, 'leftArm': leftArm, 'leftLeg': leftLeg, 'rightLeg': rightLeg, 'torso': torso}, torso, 0.08, 50);

		this.attackDamage = 2;
		this.attackRange = 1;
		this.attackSpeed = 15;
		this.cdr = 0;
		this.spellAmp = 0;
		this.maxBasicAbilities = 3;
		this.maxUltimateAbilities = 1;

		this.swingSpeed = this.speed * 75;
		this.attackWindUpTime = 500;
		this.attackHoldTime = 200;
		this.attackSwingTime = 500;
		this.attackCooldownTime = 500;

		this.attackWindUpAngle = 7.25;
		this.attackWindUpLeftArmAngle = 230;
		this.attackWindUpRightArmAngle = 200;
		this.attackWindUpRightHandAngle = 70;
		this.attackWindUpArmTranslationX = -0.03;
		this.attackWindUpArmTranslationY = -0.1;
		this.attackSwingAngle = 20;
		this.attackSwingRightArmAngle = 290;
		this.attackSwingRightHandAngle = 50;
		this.attackSwingAxeAngle = 80;
		this.attackSwingLeftArmAngle = 40;
		this.attackSwingArmTranslationX = 0;
		this.attackSwingArmTranslationY = 0;
		this.enragedLeftArmAngle = 197;
		this.enragedChangeToSpawnParticle = 0.33;
		this.enragedParticleHeight = 0.1;
		this.enragedParticleSpeed = -0.02;
		this.weakspotPrepareTranslationX = 0.25;
		this.weakspotPrepareTranslationY = -0.2;
		this.weakspotPrepareAxeAngle = -15;
		this.weakspotDistanceBehindEnemy = 1.5;
		this.weakspotSlideDistance = 1;
		this.weakspotSlideSpeed = 0.05;
		this.weakspotBloodMaxDeviation = 0.1;
		this.weakspotBloodMaxAngleDeviation = 0;
		this.weakspotBloodParticles = 80;

		this.base.faction = 'player';
		this.base.speakAudio = 'player';
		this.legDirection = true;
		this.axeless = false;
		this.enraged = false;
		this.wasEnraged = false;
		this.basicAbilities = [];
		this.ultimateAbilities = [];
		this.activeAbilities = [];
		this.damageSoundCounter = 0;

		for (var childIndex in this.children) {
			this.children[childIndex].opacity = 0;
		}
	}

	damage(level, dmg) {
		let dead = super.damage(level, dmg);

		if (!dead) {
			level.addScreenShake(Math.min(dmg, 50)/2);

			if (this.damageSoundCounter > 5) {
				let newAudio = new Audio(level.audio['damaged'].src);
				newAudio.volume = level.audio['damaged'].volume;
				newAudio.play();
				this.damageSoundCounter = 0;
			}
		}

		return dead;
	}

	getRenderOrder() {
		return [this.children['leftLeg'], this.children['rightLeg'], this.children['leftArm'], this.base, this.children['axe'], this.children['rightHand'], this.children['rightArm']];
	}

	changeState(level, newState) {
		switch(this.state) {
			case 'attackWindUp':
				this.exitAttackWindUp(level);
				if (newState != 'attackHold' && newState != 'attackSwing') {
					this.base.setRotationAndLinkages(level, 0);
					this.base.translateLinkageAndCalibrate(level, this.children['leftArm'], -this.attackWindUpArmTranslationX * this.base.sprite.scaleX, -this.attackWindUpArmTranslationY * this.base.sprite.scaleY);
					this.children['leftArm'].setRotationAndLinkages(level, 0);
					this.base.translateLinkageAndCalibrate(level, this.children['rightArm'], -this.attackWindUpArmTranslationX * this.base.sprite.scaleX, -this.attackWindUpArmTranslationY * this.base.sprite.scaleY);
					this.children['rightArm'].setRotationAndLinkages(level, 0);
				}
				break;
			case 'attackHold':
				this.exitAttackHold(level);
				break;
			case 'attackSwing':
				this.exitAttackSwing(level);
				break;
		}

		super.changeState(level, newState);
	}

	startAttackWindUp(level) {
		this.attackCounter = 0;
		this.changeState(level, 'attackWindUp');

		this.children['leftArm'].setRotationAndLinkages(level, this.attackWindUpLeftArmAngle);
		this.base.translateLinkageAndCalibrate(level, this.children['leftArm'], this.attackWindUpArmTranslationX * this.base.sprite.scaleX, this.attackWindUpArmTranslationY * this.base.sprite.scaleY);
		this.children['rightArm'].setRotationAndLinkages(level, this.attackWindUpRightArmAngle);
		this.base.translateLinkageAndCalibrate(level, this.children['rightArm'], this.attackWindUpArmTranslationX * this.base.sprite.scaleX, this.attackWindUpArmTranslationY * this.base.sprite.scaleY);
		this.children['rightHand'].rotateAndLinkages(level, this.attackWindUpRightHandAngle);
	}

	exitAttackWindUp(level) {
		
	}

	startAttackHold(level) {
		this.attackCounter = 0;
		this.changeState(level, 'attackHold');
	}

	exitAttackHold(level) {
		this.base.setRotationAndLinkages(level, 0);
		this.base.translateLinkageAndCalibrate(level, this.children['leftArm'], -this.attackWindUpArmTranslationX * this.base.sprite.scaleX, -this.attackWindUpArmTranslationY * this.base.sprite.scaleY);
		this.children['leftArm'].setRotationAndLinkages(level, 0);
		this.base.translateLinkageAndCalibrate(level, this.children['rightArm'], -this.attackWindUpArmTranslationX * this.base.sprite.scaleX, -this.attackWindUpArmTranslationY * this.base.sprite.scaleY);
		this.children['rightArm'].setRotationAndLinkages(level, 0);
	}

	startAttackSwing(level) {
		let weaponArcStart = this.children['axe'].getArcPoint();

		this.attackCounter = 0;
		this.changeState(level, 'attackSwing');

		this.children['rightArm'].setRotationAndLinkages(level, this.attackSwingRightArmAngle);
		this.base.translateLinkageAndCalibrate(level, this.children['rightArm'], this.attackSwingArmTranslationX * this.base.sprite.scaleX, this.attackSwingArmTranslationY * this.base.sprite.scaleY);
		this.children['rightHand'].rotateAndLinkages(level, this.attackSwingRightHandAngle);
		this.base.translateLinkageAndCalibrate(level, this.children['leftArm'], this.attackSwingArmTranslationX * this.base.sprite.scaleX, this.attackSwingArmTranslationY * this.base.sprite.scaleY);
		this.children['leftArm'].setRotationAndLinkages(level, this.attackSwingLeftArmAngle);
		this.children['axe'].rotateAndLinkages(level, this.attackSwingAxeAngle);
		this.base.rotateAndLinkages(level, this.attackSwingAngle);

		let weaponArcEnd = this.children['axe'].getArcPoint();

		let particleDuration = this.attackSwingTime / this.attackSpeed;
		//startPoint, endPoint, centerPoint, color, opacity, velX, velY, velRot, gravity, airResistance, duration, fadeSpeed
		level.addObject(new WeaponSwingParticle(weaponArcStart, weaponArcEnd, [this.children['rightArm'].x, this.children['rightArm'].y], this.children['axe'].arcSize, this.children['axe'].mirror,
			'rgba(210, 210, 210, 1)', 1, 0, 0, 0, 0, 0, particleDuration, 2));

		level.audio['attack'].play();
		level.addScreenShake(0.5);

		if (this.attackTarget.damage(level, this.attackDamage)) {
			this.attackTarget = null;
		}

		this.wasEnraged = this.enraged;
	}

	exitAttackSwing(level) {
		this.base.setRotationAndLinkages(level, 0);
		if (!this.axeless) {
			this.children['axe'].rotateAndLinkages(level, -this.attackSwingAxeAngle);
		}

		this.children['leftArm'].setRotationAndLinkages(level, 0);
		this.base.translateLinkageAndCalibrate(level, this.children['leftArm'], -this.attackSwingArmTranslationX * this.base.sprite.scaleX, 0);
		this.children['rightHand'].setRotationAndLinkages(level, 0);
		this.base.translateLinkageAndCalibrate(level, this.children['rightArm'], -this.attackSwingArmTranslationX * this.base.sprite.scaleX, -this.attackSwingArmTranslationY * this.base.sprite.scaleY);
		this.children['rightArm'].setRotationAndLinkages(level, 0);
		this.attackCounter = -this.attackCooldownTime;

		if (this.enraged) {
			this.children['leftArm'].setRotationAndLinkages(level, this.enragedLeftArmAngle);
			this.children['rightArm'].setRotationAndLinkages(level, this.attackWindUpRightArmAngle);
			this.children['rightHand'].rotateAndLinkages(level, this.attackWindUpRightHandAngle);

			if (!this.wasEnraged) {
				this.base.translateLinkageAndCalibrate(level, this.children['leftArm'], this.attackWindUpArmTranslationX * this.base.sprite.scaleX, this.attackWindUpArmTranslationY * this.base.sprite.scaleY);
				this.base.translateLinkageAndCalibrate(level, this.children['rightArm'], this.attackWindUpArmTranslationX * this.base.sprite.scaleX, this.attackWindUpArmTranslationY * this.base.sprite.scaleY);
			}
		} else if (this.wasEnraged) {
			this.base.translateLinkageAndCalibrate(level, this.children['rightArm'], -this.attackWindUpArmTranslationX * this.base.sprite.scaleX, -this.attackWindUpArmTranslationY * this.base.sprite.scaleY);
			this.base.translateLinkageAndCalibrate(level, this.children['leftArm'], -this.attackWindUpArmTranslationX * this.base.sprite.scaleX, -this.attackWindUpArmTranslationY * this.base.sprite.scaleY);
		}

		this.wasEnraged = false;
	}

	startEnraged(level) {
		// move arms to up position
		this.children['leftArm'].setRotationAndLinkages(level, this.enragedLeftArmAngle);
		this.base.translateLinkageAndCalibrate(level, this.children['leftArm'], this.attackWindUpArmTranslationX * this.base.sprite.scaleX, this.attackWindUpArmTranslationY * this.base.sprite.scaleY);
		this.children['rightArm'].setRotationAndLinkages(level, this.attackWindUpRightArmAngle);
		this.base.translateLinkageAndCalibrate(level, this.children['rightArm'], this.attackWindUpArmTranslationX * this.base.sprite.scaleX, this.attackWindUpArmTranslationY * this.base.sprite.scaleY);
		this.children['rightHand'].rotateAndLinkages(level, this.attackWindUpRightHandAngle);
	}

	exitEnraged(level) {
		this.children['rightHand'].rotateAndLinkages(level, -this.attackWindUpRightHandAngle);
		this.base.translateLinkageAndCalibrate(level, this.children['rightArm'], -this.attackWindUpArmTranslationX * this.base.sprite.scaleX, -this.attackWindUpArmTranslationY * this.base.sprite.scaleY);
		this.children['rightArm'].setRotationAndLinkages(level, 0);
		this.base.translateLinkageAndCalibrate(level, this.children['leftArm'], -this.attackWindUpArmTranslationX * this.base.sprite.scaleX, -this.attackWindUpArmTranslationY * this.base.sprite.scaleY);
		this.children['leftArm'].setRotationAndLinkages(level, 0);
	}

	processTick(level) {
		super.processTick(level);

		let rightLeg = this.children['rightLeg'];
		let leftLeg = this.children['leftLeg'];
		let leftArm = this.children['leftArm'];
		let rightArm = this.children['rightArm'];
		let rightHand = this.children['rightHand'];
		let axe = this.children['axe'];

		if (this.attackCounter < 10000) {
			this.attackCounter += this.attackSpeed;
		}

		for (var i=0; i<this.activeAbilities.length; i++) {
			this.activeAbilities[i].whileActive(level);
		}

		this.damageSoundCounter++;

		switch (this.state) {
			case 'moving':
			case 'movingToAttack':
				let targetX = this.base.targetX;
				let targetY = this.base.targetY;
				let closeThreshold = 0.25;
				if (this.attackTarget) {
					targetX = this.attackTarget.x;
					targetY = this.attackTarget.y;
					closeThreshold = Math.max(this.attackTarget.sprite.width, this.attackTarget.sprite.height)/2 + this.attackRange * Math.max(this.base.sprite.scaleX, this.base.sprite.scaleY);
				}

				let dist = getDistance(this.base.x, this.base.y, targetX, targetY);
				if (dist > closeThreshold) {
					let move = findPath(this.base, level.getCollideable(this.base, this.base.bias, this.base.bias, 2, 2), this.base.x, this.base.y, targetX, targetY);
					this.base.translateAndLinkages(level, this.speed * move[0], this.speed * move[1]);

					if (move[0] < 0) {
						this.setMirror(level, true);
					} else {
						this.setMirror(level, false);
					}
					this.base.matchLinkagesCalibrationRecursive(level);

					// Move the legs & arms
					rightLeg.rotateAndLinkages(level, this.legDirection ? this.swingSpeed : -this.swingSpeed);
					leftLeg.rotateAndLinkages(level, this.legDirection ? -this.swingSpeed : this.swingSpeed);
					leftArm.rotateAndLinkages(level, this.legDirection ? this.swingSpeed/3 : -this.swingSpeed/3);
					rightArm.rotateAndLinkages(level, this.legDirection ? -this.swingSpeed/3 : this.swingSpeed/3);

					if (Math.abs(rightLeg.angle) > 60) {
						this.legDirection = !this.legDirection;
					}

					// randomly create walking particles
					let chanceToCreateParticle = 0.2;
					if (Math.random() < chanceToCreateParticle) {
						let maxParticleSpeedX = 0.02;
						let maxParticleSpeedY = -0.02;
						let maxParticleStartDistanceX = 0.3;
						let maxParticleStartDistanceY = 0.2;

						let bottomY = level.sprites[rightLeg.sprite.name].bottomPixel/level.tileSize - rightLeg.sprite.centerY + rightLeg.y - 1/level.tileSize;
						let particleVelX = maxParticleSpeedX * (Math.random() * 2 - 1);
						let particleVelY = maxParticleSpeedY * Math.random();
						let particleX = this.base.x + (maxParticleStartDistanceX * (Math.random() * 2 - 1))
						let particleY = bottomY - (maxParticleStartDistanceY * Math.random())
						level.addObject(new ShapeFadeFloorParticle('rect', [0.03, 0.03], 'rgba(134, 84, 57, 1)', 'rgba(0, 0, 0, 1)',
							bottomY, particleX, particleY, 0, 1, particleVelX, particleVelY, 0,
							0.0012, 0.024, 25, 0));
					}
				} else {
					rightLeg.rotateAndLinkages(level, this.base.angle - rightLeg.angle);
					leftLeg.rotateAndLinkages(level, this.base.angle - leftLeg.angle);

					if (this.enraged) {
						leftArm.setRotationAndLinkages(level, this.enragedLeftArmAngle);
						rightArm.setRotationAndLinkages(level, this.attackWindUpRightArmAngle);
						rightHand.rotateAndLinkages(level, this.attackWindUpRightHandAngle);
					} else {
						rightArm.rotateAndLinkages(level, this.base.angle - rightArm.angle);
						leftArm.rotateAndLinkages(level, this.base.angle - leftArm.angle);
					}

					this.legDirection = true;

					if (!this.axeless) {
						if (this.attackTarget) {
							if (this.attackCounter >= 0) {
								if (this.enraged) {
									this.startAttackSwing(level);
								} else {
									this.startAttackWindUp(level);
								}
							}
						} else {
							this.changeState(level, 'idle');
						}
					}
				}
				break;
			case 'attackWindUp':
				this.base.rotateAndLinkages(level, -this.attackWindUpAngle/(this.attackWindUpTime/this.attackSpeed));

				if (this.attackCounter > this.attackWindUpTime) {
					this.startAttackHold(level);
				}
				break;
			case 'attackHold':
				if (this.attackCounter > this.attackHoldTime) {
					this.startAttackSwing(level);
				}
				break;
			case 'attackSwing':
				if (this.attackCounter > this.attackSwingTime) {
					if (this.attackTarget) {
						this.changeState(level, 'movingToAttack');
					} else {
						this.changeState(level, 'idle');
					}
				}
				break;
		}

		if (this.enraged && Math.random() < this.enragedChangeToSpawnParticle) {
			// shape, shapeData, color, outlineColor, x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority
			level.addObject(new ShapeFadeInFadeOutParticle('rect', [0.03, this.enragedParticleHeight], 'rgba(255, 0, 0, 1)', 'rgba(255, 0, 0, 1)',
				this.base.x + 0.75 * (Math.random() * 2 - 1), this.base.y + 1.25 * (Math.random() * 2 - 1), 1.5*Math.PI, 0, 0, this.enragedParticleSpeed,
				0, 0, 0, 60, 3));
		}
	}

	processDeath(level) {
		level.runFreezeCounter = false;
		if (level.deadScreenAlpha == 0) {
			level.audio['death'].play();
		}
	}

	addAbility(ability) {
		if (ability.ultimate) {
			if (this.ultimateAbilities.length >= this.maxUltimateAbilities) {
				return false;
			}

			for (var i=0; i<this.ultimateAbilities.length; i++) {
				if (this.ultimateAbilities[i].name == ability.name) {
					return false;
				}
			}

			ability.slot = this.ultimateAbilities.length;
			ability.owner = this;
			this.ultimateAbilities.push(ability);
		} else {
			if (this.basicAbilities.length >= this.maxBasicAbilities) {
				return false;
			}

			for (var i=0; i<this.basicAbilities.length; i++) {
				if (this.basicAbilities[i].name == ability.name) {
					return false;
				}
			}

			ability.slot = this.basicAbilities.length;
			ability.owner = this;
			this.basicAbilities.push(ability);
		}

		return true;
	}

	getShadowBoundingBox(level, caller) {
		let shadowData = super.getShadowBoundingBox(level, caller);

		if (shadowData) {
			shadowData[0] -= 0.08;
			shadowData[1] += 0.14;
			shadowData[3] = (level.sprites[this.children['rightLeg'].sprite.name].bottomPixel/level.tileSize - this.children['rightLeg'].sprite.centerY * this.children['rightLeg'].sprite.height) * this.base.sprite.scaleY + 0.03;
		}

		return shadowData;
	}
}