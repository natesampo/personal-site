let gamePath = 'LD51/';

class Sprite {
	constructor(name, x, y, width, height, frames, centerX, centerY) {
		this.name = name;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.frames = frames;
		this.centerX = centerX;
		this.centerY = centerY;

		this.offsetX = 0;
		this.offsetY = 0;
		this.scaleX = 1;
		this.scaleY = 1;

		this.id = null;
	}

	getOffsetX() {
		return this.offsetX;
	}

	getOffsetY() {
		return this.offsetY;
	}

	copy() {
		return new Sprite(this.name, this.x, this.y, this.width, this.height, this.frames, this.centerX, this.centerY);
	}

	toString() {
		return this.name + ' ' + this.x.toString() + ' ' + this.y.toString() + ' ' + this.width.toString() + ' ' + this.height.toString() + ' ' + this.frames.toString();
	}
}

class Tile {
	constructor(x, y, sprite, angle, animationSpeed, opacity) {
		this.x = x;
		this.y = y;
		this.sprite = sprite;
		this.angle = angle;
		this.animationFrame = 0;
		this.animationSpeed = animationSpeed;
		this.opacity = opacity;

		this.mirror = false;
	}

	getShadowBoundingBox(level) {
		return null;
	}

	toString() {
		return 't ' + this.sprite.toString() + ' ' + this.animationSpeed.toString() + ' ' + this.x.toString() + ' ' + this.y.toString() + ' ' + this.angle.toString() + ' ' + this.opacity.toString();
	}
}

class GameObject {
	constructor(x, y, sprite, angle, animationSpeed, collideable, playable, attackable, speed, opacity) {
		this.x = x;
		this.y = y;
		this.sprite = sprite;
		this.angle = angle;
		this.animationSpeed = animationSpeed;
		this.collideable = collideable;
		this.playable = playable;
		this.attackable = attackable;
		this.speed = speed;
		this.opacity = opacity;

		this.animationFrame = 0;
		this.targetX = x;
		this.targetY = y;
		this.bias = 0;
		this.biasUp = true;
		this.mirror = false;
		this.text = '';
		this.textSpeed = 0.5;
		this.textTimer = 0;
		this.textScale = 1;
		this.letterEffects = [];
		this.wavyOffsets = [];
		this.wavyMax = 0.07; // this is a percentage of font size
		this.wavySpeed = 0.05;
		this.acceptTriangleY = 0;
		this.faction = null;
		this.attackTarget = null;
		this.holdingAbility = null;
		this.id = null;
		this.speakAudio = null;
		this.audioPlaying = false;
	}

	speak(text) {
		// wavyText = |
		this.text = text.replace(/\|/g, '');
		this.textTimer = 0;

		this.letterEffects = [];
		this.wavyOffsets = [];

		let wavyText = false;
		let wavyOffset = 0;
		for (var i=0; i<text.length; i++) {
			switch(text[i]) {
				case '|':
					wavyText = !wavyText;
					wavyOffset = 0;
					continue;
					break;
			}

			if (wavyText) {
				wavyOffset -= this.wavySpeed;
			}

			this.letterEffects.push({'wavyText': wavyText});
			this.wavyOffsets.push(wavyOffset);
		}
	}

	resolveText(level) {
		this.speak('');
	}

	damage(level, dmg) {
		return false;
	}

	translate(x, y) {
		this.x += x;
		this.y += y;
	}

	setXY(x, y) {
		this.x = x;
		this.y = y;
	}

	setAttackTarget(level, object) {
		this.attackTarget = object;
		this.setTarget(level, object.x, object.y);
	}

	setTarget(level, x, y) {
		this.targetX = x;
		this.targetY = y;
	}

	addAbility(ability) {
		return false;
	}

	rotateAboutPoint(level, centerX, centerY, angle) {
		let radians = (Math.PI / 180) * angle;
		let cos = Math.cos(radians);
		let sin = Math.sin(radians);

		let newX = (cos * (this.x - centerX)) - (sin * (this.y - centerY)) + centerX;
		let newY = (cos * (this.y - centerY)) + (sin * (this.x - centerX)) + centerY;
		
		level.setObjectXY(this, newX, newY);
	}

	checkObjectCollision(level, object) {
		let otherBoundingBox = object.getBoundingBox(level);

		return this.checkBoundingBoxCollision(level, otherBoundingBox[0], otherBoundingBox[2], otherBoundingBox[1], otherBoundingBox[3]);
	}

	// check if the rectangle x1, y1, x2, y2 intersects this object
	checkBoundingBoxCollision(level, x1, y1, x2, y2) {
		let boundingBox = this.getBoundingBox(level);

		if (!boundingBox) {
			return false;
		}

		let isLeft = Math.max(x1, x2) < Math.min(boundingBox[0], boundingBox[1]);
		let isRight = Math.min(x1, x2) > Math.max(boundingBox[0], boundingBox[1]);
		let isBelow = Math.min(y1, y2) > Math.max(boundingBox[2], boundingBox[3]);
		let isAbove = Math.max(y1, y2) < Math.min(boundingBox[2], boundingBox[3]);

		return !(isLeft || isRight || isBelow || isAbove);
	}

	isInside(level, x, y) {
		let boundingBox = this.getBoundingBox(level);

		return x >= boundingBox[0] && x <= boundingBox[1] && y >= boundingBox[2] && y <= boundingBox[3];
	}

	// returns [left, right, top, bottom]
	getBoundingBox(level) {
		if (level.sprites[this.sprite.name]) {
			let nonRotated = [this.x + this.sprite.scaleX * ((this.mirror ? this.sprite.centerX : -this.sprite.centerX) * this.sprite.width + level.sprites[this.sprite.name].leftPixel / (this.mirror ? -level.tileSize : level.tileSize)) + this.sprite.offsetX,
				this.x + this.sprite.scaleX * ((this.mirror ? this.sprite.centerX : -this.sprite.centerX) * this.sprite.width + level.sprites[this.sprite.name].rightPixel / (this.mirror ? -level.tileSize : level.tileSize)) + this.sprite.offsetX,
				this.y + this.sprite.scaleY * (-this.sprite.centerY * this.sprite.height + (level.sprites[this.sprite.name].topPixel / level.tileSize)) + this.sprite.offsetY,
				this.y + this.sprite.scaleY * (-this.sprite.centerY * this.sprite.height + (level.sprites[this.sprite.name].bottomPixel / level.tileSize)) + this.sprite.offsetY];

			if (this.angle % 360 == 0) {
				return nonRotated;
			}

			let bottomLeft = rotateAboutPoint(nonRotated[0], nonRotated[3], this.x, this.y, this.mirror ? -this.angle : this.angle);
			let topLeft = rotateAboutPoint(nonRotated[0], nonRotated[2], this.x, this.y, this.mirror ? -this.angle : this.angle);
			let bottomRight = rotateAboutPoint(nonRotated[1], nonRotated[3], this.x, this.y, this.mirror ? -this.angle : this.angle);
			let topRight = rotateAboutPoint(nonRotated[1], nonRotated[2], this.x, this.y, this.mirror ? -this.angle : this.angle);

			return [Math.min(bottomLeft[0], bottomRight[0], topLeft[0], topRight[0]),
				Math.max(bottomLeft[0], bottomRight[0], topLeft[0], topRight[0]),
				Math.min(bottomLeft[1], bottomRight[1], topLeft[1], topRight[1]),
				Math.max(bottomLeft[1], bottomRight[1], topLeft[1], topRight[1])];
		}

		return null;
	}

	tick(level) {
		if (this.text.length > 0) {
			if (this.textTimer < this.text.length) {
				if (!this.audioPlaying && this.speakAudio) {
					level.batchedAudio[this.speakAudio][(Math.random() * level.batchedAudio[this.speakAudio].length) << 0].play();
					this.audioPlaying = true;
				}

				this.textTimer += this.textSpeed + 1/84377;

				if (this.textTimer > this.text.length) {
					this.textTimer = this.text.length;

					if (this.audioPlaying) {
						for (var i=0; i<level.batchedAudio[this.speakAudio].length; i++) {
							level.batchedAudio[this.speakAudio][i].pause();
							level.batchedAudio[this.speakAudio][i].currentTime = 0;
						}

						this.audioPlaying = false;
					}
				}
			}
		}

		if (!(this instanceof ChildObject) && getDistance(this.x, this.y, this.targetX, this.targetY) > 0.01) {
			if (this.targetX < this.x) {
				this.mirror = true;
			} else {
				this.mirror = false;
			}

			if (this.speed != 0) {
				let dist = getDistance(this.x, this.y, this.targetX, this.targetY);
				if (dist > 0.25) {
					let move = findPath(this, level.getCollideable(this, this.bias, this.bias, 2, 2), this.x, this.y, this.targetX, this.targetY);
					level.translateObject(this, this.speed * move[0], this.speed * move[1]);
				}
			}
		}

		this.animationFrame = (this.animationFrame + this.animationSpeed) % this.sprite.frames;
	}

	getShadowBoundingBox(level) {
		return null;
	}

	toString() {
		return 'o ' + this.sprite.toString() + ' ' + this.animationSpeed.toString() + ' ' + this.x.toString() + ' ' + this.y.toString() + ' ' + this.angle.toString()
					+ ' ' + this.opacity.toString() + ' ' + this.collideable.toString() + ' ' + this.playable.toString() + ' ' + this.attackable.toString() + ' ' + this.speed.toString();
	}
}

class Camera {
	constructor(x, y, angle, aspectRatio, zoomLevel) {
		this.x = x;
		this.y = y;
		this.angle = angle;
		this.aspectRatio = aspectRatio;
		this.zoomLevel = zoomLevel;
	}

	translate(x, y) {
		this.x += x;
		this.y += y;
	}

	rotate(angle) {
		this.angle += angle;
	}

	zoom(zoomLevel, zoomOriginX, zoomOriginY) {
		// its not perfect but whatever
		let zoomDelta = zoomLevel * 0.05;
		this.translate(-(this.x + zoomOriginX) * zoomDelta, -(this.y + zoomOriginY) * zoomDelta);
		this.zoomLevel -= zoomDelta;
	}
}

class Level {
	constructor(color, tileSize, objects, sprites) {
		this.color = color;
		this.tileSize = tileSize;
		this.sprites = sprites;

		this.map = {};
		this.factions = {};
		this.playable = [];
		this.objectID = 0;
		for (var i=0; i<objects.length; i++) {
			let object = objects[i];
			this.addObject(object);
		}

		let music = new Audio(gamePath + 'audio/itsmusiciguess.wav');
		music.addEventListener('ended', function(){
			setTimeout(function() {music.play();}, 2000);
		});
		this.audio = {'music': music, 'attack': new Audio(gamePath + 'audio/attack.wav'), 'death': new Audio(gamePath + 'audio/death.wav'), 'freezeoffering': new Audio(gamePath + 'audio/freezeoffering.wav'),
						'laser': new Audio(gamePath + 'audio/laser.wav'), 'pentagram': new Audio(gamePath + 'audio/pentagram.wav'), 'shootorb': new Audio(gamePath + 'audio/shootorb.wav'), 'damaged': new Audio(gamePath + 'audio/damaged.wav'),
						'landed': new Audio(gamePath + 'audio/landed.wav')};
		this.audio['music'].volume = 0.1;
		this.audio['attack'].volume = 0.35;
		this.audio['death'].volume = 0.35;
		this.audio['freezeoffering'].volume = 0.35;
		this.audio['laser'].volume = 0.35;
		this.audio['pentagram'].volume = 0.35;
		this.audio['shootorb'].volume = 0.35;
		this.audio['damaged'].volume = 0.35;
		this.audio['landed'].volume = 0.35;

		this.batchedAudio = {'uwu': [new Audio(gamePath + 'audio/uwu-01.wav'), new Audio(gamePath + 'audio/uwu-02.wav'), new Audio(gamePath + 'audio/uwu-03.wav'), new Audio(gamePath + 'audio/uwu-04.wav')],
								'player': [new Audio(gamePath + 'audio/playerspeak.wav')], 'lich': [new Audio(gamePath + 'audio/lichspeak.wav')]};
		for (var label in this.batchedAudio) {
			let audioGroup = this.batchedAudio[label];
			for (var i=0; i<audioGroup.length; i++) {
				audioGroup[i].addEventListener('ended', function() {
					audioGroup[(Math.random() * audioGroup.length) << 0].play();
				});
			}
		}
		this.batchedAudio['player'][0].volume = 0.35;
		this.batchedAudio['lich'][0].volume = 0.35;

		this.debugMode = false;

		this.screenShakeSpeed = 1.2;
		this.maxScreenShakeX = 64;
		this.maxScreenShakeY = 64;
		this.maxScreenShakeRot = 7;
		this.freezeTime = 600;
		this.freezeEasingMax = 5;
		this.freezeEasingSpeed = 0.4;
		this.tutorialString = 'Right-Click to move and attack!';
		this.numOfferingsPerFreeze = 3;

		// Weakspot steps: 1. squint 2. still 3. close entirely leaving white ghosts 4. still
		// 5. shift body slightly preparing for attack 6. still 7. blink out 8. still
		// 9. blink out 10. appear behind opponent sliding 11. blood spray 12. unprepare
		// 13. open the blinds
		this.weakspotStepTimes = [60, 60, 40, 90, 30, 70, 5, 20, 9, 100, 70, 30, 60];

		this.runFreezeCounter = false;
		this.screenShakeMagnitude = 0;
		this.currentScreenShakeX = 0;
		this.currentScreenShakeY = 0;
		this.currentScreenShakeRot = 0;
		this.acceptText = null;
		this.freezeCounter = 0;
		this.objectsToAddQueue = [];
		this.currentFreezeEasing = 2;
		this.freezeEasingTicksCounter = 0;
		this.levelEditor = false;
		this.abilitiesForNextFreezeOffering = 1;
		this.isDoingFreezeOffering = false;
		this.screen = null;
		this.freezeDirection = true;
		this.notYetMoved = true;
		this.notYetUsedAbility = false;
		this.freezeCounterBeforeWeakspot = 0;
		this.weakspot = 0;
		this.currentWeakspotTime = 0;
		this.weakspotAbility = null;
		this.alwaysTickEvenWhenFrozen = [];

		this.gameStarted = false;
		this.clickedPlay = false;
		this.playButtonAlpha = -1;
		this.uiAlpha = 0;
		this.anotherWolf = true;
		this.deadScreenAlpha = 0;
		this.winScreenAlpha = 0;

		this.gameState = 0;

		this.currentFreezeOffering = [];
		let level = this;
		let promise = null;
		let attackDamageOffering = new AttackDamageOffering();
		this.currentFreezeOffering.push(attackDamageOffering);
		let img = document.getElementById(attackDamageOffering.spriteName);
		if (img) {
			attackDamageOffering.onImageLoad(level, img);
		} else {
			promise = loadSprite(attackDamageOffering.spriteName, 1);
			if (promise) {
				promise.then(function(imageData) {
					if (imageData) {
						attackDamageOffering.onImageLoad(level, imageData[1]);
					}
				});
			}
		}

		let attackSpeedOffering = new AttackSpeedOffering();
		this.currentFreezeOffering.push(attackSpeedOffering);
		img = document.getElementById(attackSpeedOffering.spriteName);
		if (img) {
			attackSpeedOffering.onImageLoad(level, img);
		} else {
			promise = loadSprite(attackSpeedOffering.spriteName, 1);
			if (promise) {
				promise.then(function(imageData) {
					if (imageData) {
						attackSpeedOffering.onImageLoad(level, imageData[1]);
					}
				});
			}
		}

		let cdrOffering = new CdrOffering();
		this.currentFreezeOffering.push(cdrOffering);
		img = document.getElementById(cdrOffering.spriteName);
		if (img) {
			cdrOffering.onImageLoad(level, img);
		} else {
			promise = loadSprite(cdrOffering.spriteName, 1);
			if (promise) {
				promise.then(function(imageData) {
					if (imageData) {
						cdrOffering.onImageLoad(level, imageData[1]);
					}
				});
			}
		}

		let spellAmpOffering = new SpellAmpOffering();
		this.currentFreezeOffering.push(spellAmpOffering);
		img = document.getElementById(spellAmpOffering.spriteName);
		if (img) {
			spellAmpOffering.onImageLoad(level, img);
		} else {
			promise = loadSprite(spellAmpOffering.spriteName, 1);
			if (promise) {
				promise.then(function(imageData) {
					if (imageData) {
						spellAmpOffering.onImageLoad(level, imageData[1]);
					}
				});
			}
		}

		let healthOffering = new HealthOffering();
		this.currentFreezeOffering.push(healthOffering);
		img = document.getElementById(healthOffering.spriteName);
		if (img) {
			healthOffering.onImageLoad(level, img);
		} else {
			promise = loadSprite(healthOffering.spriteName, 1);
			if (promise) {
				promise.then(function(imageData) {
					if (imageData) {
						healthOffering.onImageLoad(level, imageData[1]);
					}
				});
			}
		}
	}

	tick() {
		if (this.gameStarted) {
			if (!this.factions['player'] || this.factions['player'][0].parent.hp > 0) {
				if (this.runFreezeCounter) {
					this.freezeCounter++;
				}

				if (this.weakspot != 0 && this.weakspot <= this.weakspotStepTimes.length) {
					let timeElapsed = this.freezeCounter - this.freezeTime;
					if (timeElapsed - this.currentWeakspotTime > this.weakspotStepTimes[this.weakspot-1]) {
						this.currentWeakspotTime += this.weakspotStepTimes[this.weakspot-1];
						this.weakspot++;

						// weakspot events only called once at the start of each phase
						if (this.weakspotAbility) {
							let target = this.weakspotAbility.targetedAt;
							let owner = this.weakspotAbility.owner;
							let targetBoundingBox = target.getBoundingBox(this);
							let centerX = targetBoundingBox[0] + (targetBoundingBox[1] - targetBoundingBox[0])/2 + target.sprite.offsetX;
							let centerY = targetBoundingBox[2] + (targetBoundingBox[3] - targetBoundingBox[2])/2 + target.sprite.offsetY;
							switch(this.weakspot) {
								case 10:
									let angleToMove = getAngleRadians(owner.base.x, owner.base.y, centerX, centerY);
									owner.base.setXYAndPullLinkages(this, centerX + owner.weakspotDistanceBehindEnemy * target.sprite.width * Math.cos(angleToMove),
										centerY + owner.weakspotDistanceBehindEnemy * target.sprite.height * Math.sin(angleToMove));
									owner.changeState(this, 'weakspotSlide');
									break;
								case 11:
									let angleForBlood = getAngleRadians(owner.base.x, owner.base.y, target.x, target.y);
									for (var i=0; i<owner.weakspotBloodParticles * target.sprite.width * target.sprite.height; i++) {
										let newAngle = angleForBlood + (Math.random()*2 - 1) * owner.weakspotBloodMaxAngleDeviation;
										newAngle += (newAngle > -Math.PI/2 && newAngle < Math.PI/2) ? Math.PI/12 : -Math.PI/12;

										// shape, shapeData, color, outlineColor, x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority
										let bloodParticle = new ShapeFadeParticle('rect', [0.02, 0.02], 'rgba(220, 30, 20, 1)', 'rgba(220, 30, 20, 1)',
											centerX + (Math.random()*2 - 1) * owner.weakspotBloodMaxDeviation * target.sprite.width, centerY + (Math.random()*2 - 1) * owner.weakspotBloodMaxDeviation * target.sprite.height, toDegrees(newAngle),
											1, -0.025 * Math.cos(newAngle) * (Math.random()/2 + 0.5) * target.sprite.width, -0.025 * Math.sin(newAngle) * (Math.random()/2 + 0.5) * target.sprite.height, 0, 0.0001, 0.001, 90, 5);

										this.alwaysTickEvenWhenFrozen.push(bloodParticle);
										this.addObject(bloodParticle);
									}
									break;
								case 13:
									owner.base.setRotationAndLinkages(this, 0);
									owner.initAlignAndCalibrateChildren();
									owner.changeState(this, 'idle');
									break;
								case 14:
									if (owner.enraged) {
										owner.startEnraged(this);
									}

									target.damage(this, this.weakspotAbility.getDamageWithModifiers());
									this.weakspotAbility.onEnd(this);
									this.weakspotAbility = null;
									this.currentWeakspotTime = 0;
									this.weakspot = 0;
									this.thaw();
									break;
							}
						}
					}

					// weakspot events called every tick
					if (this.weakspotAbility) {
						let target = this.weakspotAbility.targetedAt;
						let owner = this.weakspotAbility.owner;
						let targetBoundingBox = target.getBoundingBox(this);
						let centerX = targetBoundingBox[0] + (targetBoundingBox[1] - targetBoundingBox[0])/2 + target.sprite.offsetX;
						let centerY = targetBoundingBox[2] + (targetBoundingBox[3] - targetBoundingBox[2])/2 + target.sprite.offsetY;
						switch(this.weakspot) {
							case 5:
								owner.base.translateLinkageAndCalibrate(this, owner.children['rightArm'], owner.base.sprite.scaleX * (owner.weakspotPrepareTranslationX/this.weakspotStepTimes[4]),
									owner.base.sprite.scaleY * (owner.weakspotPrepareTranslationY/this.weakspotStepTimes[4]));
								owner.children['axe'].rotateAndLinkages(this, owner.weakspotPrepareAxeAngle/this.weakspotStepTimes[4]);
								owner.children['leftArm'].rotateAndLinkages(this, -owner.weakspotPrepareAxeAngle/this.weakspotStepTimes[4]);
								break;
							case 10:
								let distanceToWeakspotEnemy = getDistance(owner.base.x, owner.base.y, centerX, centerY);
								let distanceToWeakspotSlideDestination = distanceToWeakspotEnemy - (owner.weakspotDistanceBehindEnemy * ((target.sprite.width + target.sprite.height)/2) + owner.weakspotSlideDistance);
								let angleToWeakspotEnemy = getAngleRadians(owner.base.x, owner.base.y, centerX, centerY);
								owner.base.translateAndLinkages(this, distanceToWeakspotSlideDestination * owner.weakspotSlideSpeed * Math.cos(angleToWeakspotEnemy),
									distanceToWeakspotSlideDestination * owner.weakspotSlideSpeed * Math.sin(angleToWeakspotEnemy));
								break;
							case 12:
								owner.children['leftArm'].rotateAndLinkages(this, owner.weakspotPrepareAxeAngle/this.weakspotStepTimes[11]);
								owner.children['axe'].rotateAndLinkages(this, -owner.weakspotPrepareAxeAngle/this.weakspotStepTimes[11]);
								owner.base.translateLinkageAndCalibrate(this, owner.children['rightArm'], owner.base.sprite.scaleX * (-owner.weakspotPrepareTranslationX/this.weakspotStepTimes[11]),
									owner.base.sprite.scaleY * (-owner.weakspotPrepareTranslationY/this.weakspotStepTimes[11]));
								break;
						}
					}
				}

				if (this.isFrozen()) {
					let totalTicks = 0;
					for (var i=2; i<this.freezeEasingMax; i++) {
						totalTicks += (((this.freezeEasingMax - i)/this.freezeEasingSpeed) << 0) * i;
					}

					if (this.freezeCounter - this.freezeTime > totalTicks * 2 && this.weakspot == 0) {
						this.freezeOffering();
					}

					for (var i=0; i<this.alwaysTickEvenWhenFrozen.length; i++) {
						this.alwaysTickEvenWhenFrozen[i].tick(this);
					}
				} else {
					if (!this.freezeDirection && this.currentFreezeEasing >= this.freezeEasingMax && this.weakspot == 0) {
						this.resetFreeze();
					}

					if (this.freezeCounter > this.freezeTime) {
						this.iterateFrozen();
					}

					if (this.screenShakeMagnitude > 0) {
						this.screenShakeMagnitude = this.screenShakeMagnitude * 0.95;

						if (this.screenShakeMagnitude < 0.01) {
							this.screenShakeMagnitude = 0;
							this.currentScreenShakeX = 0;
							this.currentScreenShakeY = 0;
							this.currentScreenShakeRot = 0;
						} else {
							this.currentScreenShakeX += this.screenShakeSpeed;
							this.currentScreenShakeY += this.screenShakeSpeed;
							this.currentScreenShakeRot += this.screenShakeSpeed;
						}
					}

					let tickOrder = [];
					for (var i in this.map) {
						for (var j in this.map[i]) {
							for (var k=this.map[i][j].length-1; k>=0; k--) {
								if (this.map[i][j][k] instanceof GameObject || this.map[i][j][k] instanceof Particle) {
									tickOrder.push(this.map[i][j][k]);
								}
							}
						}
					}

					for (var i=0; i<tickOrder.length; i++) {
						tickOrder[i].tick(this);
					}
				}
			}
		} else {
			if (this.clickedPlay) {
				let cameraSpeed = 0.2;
				this.screen.camera.translate(0, cameraSpeed);

				if (Math.abs(this.screen.camera.y) < cameraSpeed * 2) {
					this.screen.camera.y = 0;
					this.setScreenShake(0.5);
					this.audio['landed'].play();
					this.factions['player'][0].speak('Awww look, a cute baby slime. It must be lost! Do you need help getting home?');
					this.gameStarted = true;
				}
			}

			if (this.factions['player'] && this.factions['player'][0] && this.factions['player'][0].parent) {
				this.factions['player'][0].parent.base.setXYAndPullLinkages(this, (window.innerWidth/2) / ((this.tileSize - 1) * this.screen.camera.zoomLevel) + this.screen.camera.x - 0.5,
					(window.innerHeight/2) / ((this.tileSize - 1) * this.screen.camera.zoomLevel) - 0.5);

				for (var childIndex in this.factions['player'][0].parent.children) {
					this.factions['player'][0].parent.children[childIndex].sprite.offsetY = this.screen.camera.y;
				}
			}
		}
	}

	activateWeakspot(ability) {
		this.weakspotAbility = ability;
		this.weakspot = 1;
		this.freezeCounterBeforeWeakspot = this.freezeCounter;
		this.resetFreeze();

		this.freezeCounter = this.freezeTime + 1;
	}

	resolveText() {
		this.acceptText.resolveText(this);
		this.gameState++;

		switch(this.gameState) {
			case 2:
				this.factions['player'][0].speak('It.  Must.  Die.');
				break;
			case 4:
				this.addToFaction(this.acceptText, 'enemy');
				this.acceptText.boss = true;
				this.acceptText.hpTotal = 5;
				this.acceptText.hp = 5;
				this.acceptText.name = 'Baby Slime';
				this.uiAlpha = 1;
				break;
			case 6:
				this.acceptText.speak('It is well known that indicates you wish to challenge me');
				break;
			case 7:
				this.acceptText.speak('Very well, I accept your challenge on account of your remarkable ability to grow stronger every ten seconds');
				break;
			case 8:
				this.acceptText.speak('But before you may face me you must defeat my other minions. Good luck');
				break;
			case 12:
				this.addToFaction(this.acceptText.parent.base, 'enemy');
				this.acceptText.parent.base.boss = true;
				this.acceptText.parent.actuallyBattle = true;
				this.runFreezeCounter = true;
				break;
		}

		this.acceptText = null;
	}

	thaw() {
		this.freezeCounter = this.freezeTime + 1;
		this.currentFreezeEasing = 2;
		this.freezeEasingTicksCounter = 0;
		this.freezeDirection = false;
	}

	freezeOffering() {
		if (!this.isDoingFreezeOffering) {
			this.isDoingFreezeOffering = true;

			let promise = null;
			let img = null;
			let ability = null;
			let level = this;
			if (this.abilitiesForNextFreezeOffering > 0) {
				switch(level.factions['player'][0].parent.basicAbilities.length) {
					case 0:
						ability = new Windmill(null, null);
						this.screen.ui.splice(6, 0, ability);
						img = document.getElementById(ability.spriteName);
						if (img) {
							ability.onImageLoad(level, img);
						} else {
							promise = loadSprite(ability.spriteName, 1);
							if (promise) {
								promise.then(function(imageData) {
									if (imageData) {
										ability.onImageLoad(level, imageData[1]);
									}
								});
							}
						}
						break;
					case 1:
						ability = new Enrage(null, null);
						this.screen.ui.splice(6, 0, ability);
						img = document.getElementById(ability.spriteName);
						if (img) {
							ability.onImageLoad(level, img);
						} else {
							promise = loadSprite(ability.spriteName, 1);
							if (promise) {
								promise.then(function(imageData) {
									if (imageData) {
										ability.onImageLoad(level, imageData[1]);
									}
								});
							}
						}
						break;
					case 2:
						ability = new SummonSnakeMage(null, null);
						this.screen.ui.splice(6, 0, ability);
						img = document.getElementById(ability.spriteName);
						if (img) {
							ability.onImageLoad(level, img);
						} else {
							promise = loadSprite(ability.spriteName, 1);
							if (promise) {
								promise.then(function(imageData) {
									if (imageData) {
										ability.onImageLoad(level, imageData[1]);
									}
								});
							}
						}
						break;
					case 3:
						ability = new Weakspot(null, null);
						this.screen.ui.splice(6, 0, ability);
						img = document.getElementById(ability.spriteName);
						if (img) {
							ability.onImageLoad(level, img);
						} else {
							promise = loadSprite(ability.spriteName, 1);
							if (promise) {
								promise.then(function(imageData) {
									if (imageData) {
										ability.onImageLoad(level, imageData[1]);
									}
								});
							}
						}
						break;
				}

				this.abilitiesForNextFreezeOffering--;

				if (this.gameState == 5) {
					let lich = new LichObject(false, 14, level.factions['player'][0].y);
					lich.base.faction = null;
					this.addObject(lich);
					lich.setMirror(this, level.factions['player'][0].x < lich.base.x);
				}
			} else {
				shuffle(this.currentFreezeOffering);

				if (level.factions['player'][0].parent.hp <= 0.5 * level.factions['player'][0].parent.hpTotal) {
					let healthIndex = -1;
					for (var i=this.numOfferingsPerFreeze; i<this.currentFreezeOffering.length; i++) {
						if (this.currentFreezeOffering[i] instanceof HealthOffering) {
							healthIndex = i;
							break;
						}
					}

					if (healthIndex != -1) {
						let newIndex = Math.random() * this.numOfferingsPerFreeze << 0;
						let oldOffering = this.currentFreezeOffering[newIndex];
						this.currentFreezeOffering[newIndex] = this.currentFreezeOffering[healthIndex];
						this.currentFreezeOffering[healthIndex] = oldOffering;
					}
				}

				for (var i=0; i<this.numOfferingsPerFreeze; i++) {
					this.currentFreezeOffering[i].updateSlot(this);
					this.screen.ui.push(this.currentFreezeOffering[i]);
				}
			}
		}
	}

	iterateFrozen() {
		this.freezeEasingTicksCounter += this.freezeEasingSpeed;
		if (this.freezeEasingTicksCounter >= this.freezeEasingMax - this.currentFreezeEasing) {
			this.freezeEasingTicksCounter = 0;
			this.currentFreezeEasing++;
		}
	}

	isFrozen() {
		if (this.freezeCounter > this.freezeTime) {
			if (this.currentFreezeEasing < this.freezeEasingMax && (this.freezeCounter - this.freezeTime) % (this.currentFreezeEasing << 0) == 0) {
				return !this.freezeDirection;
			}

			return this.freezeDirection;
		}

		return !this.freezeDirection;
	}

	resetFreeze() {
		this.freezeCounter = 0;
		this.currentFreezeEasing = 2;
		this.freezeEasingTicksCounter = 0;
		this.isDoingFreezeOffering = false;
		this.freezeDirection = true;

		if (this.freezeCounterBeforeWeakspot != 0) {
			this.freezeCounter = this.freezeCounterBeforeWeakspot;
			this.freezeCounterBeforeWeakspot = 0;
		}
	}

	addObject(obj) {
		if (obj.sprite && obj.sprite instanceof Sprite) {
			let promise = loadSprite(obj.sprite.name, this.tileSize);
			if (promise) {
				let level = this;
				promise.then(function(imageData) {
					if (imageData) {
						level.sprites[imageData[0]] = imageData[1];
					}
				});
			}
		}

		if (obj instanceof Tile) {
			if (this.map[obj.x] && this.map[obj.x][obj.y]) {
				for (var i=0; i<this.map[obj.x][obj.y].length; i++) {
					if (this.map[obj.x][obj.y][i] instanceof Tile) {
						this.map[obj.x][obj.y].splice(i, 1);
						break;
					}
				}
				this.map[obj.x][obj.y].unshift(obj);
			} else {
				this.putInMap(obj);
			}
		} else if (obj instanceof CompositeObject) {
			for (var child in obj.children) {
				this.addObject(obj.children[child]);
			}
		} else {
			this.putInMap(obj);

			if (obj.playable) {
				this.playable.push(obj);
			}

			if (obj.faction) {
				if (!this.factions[obj.faction]) {
					this.factions[obj.faction] = [];
				}

				this.factions[obj.faction].push(obj);
			}
		}

		if (!(obj instanceof CompositeObject)) {
			obj.id = this.objectID++;
		}
	}

	addToFaction(obj, faction) {
		if (!this.factions[faction]) {
			this.factions[faction] = [];
		}

		this.factions[faction].push(obj);
		obj.faction = faction;
	}

	removeFromFaction(obj) {
		if (obj.faction && this.factions[obj.faction]) {
			remove(this.factions[obj.faction], obj);

			if (this.factions[obj.faction].length == 0) {
				delete this.factions[obj.faction];
			}
		}

		obj.faction = null;
	}

	getXYTile(x, y) {
		if (this.map[x] && this.map[x][y]) {
			for (var i=0; i<this.map[x][y].length; i++) {
				if (this.map[x][y][i] instanceof Tile) {
					return this.map[x][y][i];
				}
			}
		}

		return null;
	}

	translateObject(obj, x, y) {
		let currX = obj.x << 0;
		let currY = obj.y << 0;
		obj.translate(x, y);
		if (obj.x << 0 != currX || obj.y << 0 != currY) {
			remove(this.map[currX][currY], obj);
			this.putInMap(obj);
			this.checkXYForDeletion(currX, currY);
		}
	}

	setObjectXY(obj, x, y) {
		let currX = obj.x << 0;
		let currY = obj.y << 0;
		obj.setXY(x, y);
		if (obj.x << 0 != currX || obj.y << 0 != currY) {
			remove(this.map[currX][currY], obj);
			this.putInMap(obj);
			this.checkXYForDeletion(currX, currY);
		}
	}

	isInMap(obj) {
		return contains(this.map[obj.x << 0][obj.y << 0], obj);
	}

	removeFromMap(obj) {
		if (obj instanceof CompositeObject) {
			for (var child in obj.children) {
				this.removeFromMap(obj.children[child]);
			}
		} else {
			obj.id = null;
			remove(this.alwaysTickEvenWhenFrozen, obj);			
			remove(this.map[obj.x << 0][obj.y << 0], obj);
			this.checkXYForDeletion(obj.x << 0, obj.y << 0);

			if (obj.playable) {
				remove(this.playable, obj);
			}

			if (obj.faction) {
				remove(this.factions[obj.faction], obj);

				if (this.factions[obj.faction].length == 0) {
					delete this.factions[obj.faction];
				}
			}
		}
	}

	checkXYForDeletion(x, y) {
		if (this.map[x]) {
			if (this.map[x][y] && Object.values(this.map[x][y]).length == 0) {
				delete this.map[x][y];
			}

			if (Object.values(this.map[x]).length == 0) {
				delete this.map[x];
			}
		}
	}

	putInMap(obj) {
		let x = obj.x << 0;
		let y = obj.y << 0;
		if (!this.map[x]) {
			this.map[x] = {};
		}

		if (this.map[x][y]) {
			this.map[x][y].push(obj);
		} else {
			this.map[x][y] = [obj];
		}
	}

	getCollideable(obj, biasX, biasY, radiusX, radiusY) {
		let weights = [0, 0, 0, 0, 0, 0, 0, 0];
		let startX = obj.x + biasX - radiusX << 0;
		let endX = obj.x + biasX + radiusX << 0;
		let startY = obj.y + biasY - radiusY << 0;
		let endY = obj.y + biasY + radiusY << 0;
		for (var i=startX; i<=endX; i++) {
			for (var j=startY; j<=endY; j++) {
				if (this.map[i] && this.map[i][j]) {
					for (var k=0; k<this.map[i][j].length; k++) {
						let tempObj = this.map[i][j][k];
						if (tempObj.collideable && tempObj != obj) {
							let ind = getAngle(obj.x, obj.y, tempObj.x, tempObj.y) / 45;
							let remainder = ind - (ind << 0);
							let rounded = ind << 0;
							let dist = getDistance(obj.x, obj.y, tempObj.x, tempObj.y);
							let distVal = (dist < 0.1) ? 0 : 1 / dist;
							weights[rounded] -= distVal * (1 - remainder);
							weights[(rounded + 1) % 8] -= distVal * remainder;
							break;
						}
					}
				}
			}
		}

		return weights;
	}

	addScreenShake(num) {
		if (this.screenShakeMagnitude == 0) {
			this.currentScreenShakeX = (Math.random() * 2) - 1;
			this.currentScreenShakeY = (Math.random() * 2) - 1;
			this.currentScreenShakeRot = (Math.random() * 2) - 1;
		}

		this.screenShakeMagnitude += num;
	}

	setScreenShake(num) {
		if (this.screenShakeMagnitude == 0) {
			this.currentScreenShakeX = (Math.random() * 2) - 1;
			this.currentScreenShakeY = (Math.random() * 2) - 1;
			this.currentScreenShakeRot = (Math.random() * 2) - 1;
		}

		this.screenShakeMagnitude = Math.max(this.screenShakeMagnitude, num);
	}

	toString() {
		let levelString = 'color ' + this.color['r'] + ' ' + this.color['g'] + ' ' + this.color['b'] + ' ' + this.color['a'] + '\n';
		levelString += 'tileSize ' + this.tileSize;
		for (var i in this.map) {
			for (var j in this.map[i]) {
				for (var k=0; k<this.map[i][j].length; k++) {
					levelString += '\n' + this.map[i][j][k].toString();
				}
			}
		}

		return levelString;
	}
}

class UIElement {
	constructor(x, y, img) {
		this.x = x;
		this.y = y;
		this.img = img;

		this.width = img ? img.width : 0;
		this.height = img ? img.height : 0;
		this.scaleX = 1;
		this.scaleY = 1;
		this.hovered = false;
		this.hoverCounter = 0;
	}

	processHover() {
		this.hoverCounter++;
	}

	hover() {
		this.hovered = true;
	}

	unhover() {
		this.hovered = false;
		this.hoverCounter = 0;
	}

	isInside(x, y) {
		return (x >= this.x && x <= this.x + this.width * this.scaleX && y >= this.y && y <= this.y + this.height * this.scaleY);
	}

	tick() {
	}
}

class UIButton extends UIElement {
	constructor(x, y, width, height, img, text, onClick) {
		super(x, y, img);
		this.width = width;
		this.height = height;
		this.text = text;
		if (onClick) {
			this.onClick = onClick;
		}
	}
}

class Screen {
	constructor(canvas, context, x, y, width, height, level, camera, ui) {
		this.canvas = canvas;
		this.context = context;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.level = level;
		this.camera = camera;
		this.ui = ui;
	}

	resize(newWidth, newHeight, pageWidth, pageHeight) {
		if (this.canvas.width != Math.ceil(newWidth * pageWidth) || this.canvas.height != Math.ceil(newHeight * pageHeight)) {
			this.canvas.width = Math.ceil(newWidth * pageWidth);
			this.canvas.height = Math.ceil(newHeight * pageHeight);
			this.context = canvas.getContext('2d');
			this.effects = new ArrayBuffer(this.canvas.width * this.canvas.height * 4);
			this.camera.aspectRatio = this.canvas.width/this.canvas.height;
		}
		this.width = newWidth;
		this.height = newHeight;
	}

	checkForResize() {
		if (this.canvas.width != Math.ceil(this.width * window.innerWidth) || this.canvas.height != Math.ceil(this.height * window.innerHeight)) {
			this.canvas.width = Math.ceil(this.width * window.innerWidth);
			this.canvas.height = Math.ceil(this.height * window.innerHeight);
			this.context = this.canvas.getContext('2d');
			this.effects = new ArrayBuffer(this.canvas.width * this.canvas.height * 4);
			this.camera.aspectRatio = this.canvas.width/this.canvas.height;
		}
	}

	tick() {
		this.level.tick();

		for (var i=0; i<this.ui.length; i++) {
			this.ui[i].tick(this.level);
		}
	}
}

class Game {
	constructor(screens, inputs) {
		this.screens = screens ? screens : [];
		this.inputs = inputs ? inputs : {};
		this.ticksPerSecond = 60;

		this.data = {};
		this.startTime = null;
		this.tickID = 0;
	}

	setStartTime() {
		this.startTime = new Date();
	}

	timeSinceStart() {
		return new Date().getTime() - this.startTime;
	}
}

function loadSprite(sprite, tileSize) {
	if (!document.getElementById(sprite)) {
		let splitPeriod = sprite.split('.');
		let splitUnderscore = splitPeriod[splitPeriod.length-2].split('_');

		// if img has width and height separated by underscores in title, measure width and height against tileSize
		// otherwise, use the img width and height
		let sizeX = null;
		let sizeY = null;
		if (splitUnderscore.length >= 3) {
			sizeX = parseInt(splitUnderscore[splitUnderscore.length-2]);
			sizeY = parseInt(splitUnderscore[splitUnderscore.length-1]);
		}

		return new Promise(function(resolve, reject) {
			let xhr = new XMLHttpRequest();
			xhr.open('GET', gamePath + 'sprites/' + sprite);
			xhr.onreadystatechange = function() {
				if (this.readyState === XMLHttpRequest.DONE) {
					let img = new Image();
					img.onload = function() {
						if (!document.getElementById(sprite)) {
							let canvas = document.createElement('canvas');
							canvas.classList.add('spriteCanvas');
							canvas.id = sprite;
							canvas.width = sizeX ? sizeX * tileSize : img.width;
							canvas.height = sizeY ? sizeY * tileSize : img.height;
							document.head.appendChild(canvas);

							let context = canvas.getContext('2d');
							context.imageSmoothingEnabled = false;
							context.drawImage(img, 0, 0, canvas.width, canvas.height);

							let spriteImageData = context.getImageData(0, 0, canvas.width, canvas.height);
							// find left-most non-transparent pixel for drawing shadow
							let left = -1;
							for (var i=0; i<canvas.width; i++) {
								for (var j=0; j<canvas.height; j++) {
									if (spriteImageData.data[(j*canvas.width+i)*4+3] > 0) {
										left = i;
										break;
									}
								}

								if (left != -1) {
									break;
								}
							}

							// find right-most non-transparent pixel for drawing shadow
							let right = -1;
							for (var i=canvas.width-1; i>=0; i--) {
								for (var j=0; j<canvas.height; j++) {
									if (spriteImageData.data[(j*canvas.width+i)*4+3] > 0) {
										right = i;
										break;
									}
								}

								if (right != -1) {
									break;
								}
							}

							// find top-most non-transparent pixel for drawing shadow
							let top = -1;
							for (var j=0; j<canvas.height; j++) {
								for (var i=0; i<canvas.width; i++) {
									if (spriteImageData.data[(j*canvas.width+i)*4+3] > 0) {
										top = j;
										break;
									}
								}

								if (top != -1) {
									break;
								}
							}

							// find bottom-most non-transparent pixel for drawing shadow
							let bottom = -1;
							for (var j=canvas.height-1; j>=0; j--) {
								for (var i=0; i<canvas.width; i++) {
									if (spriteImageData.data[(j*canvas.width+i)*4+3] > 0) {
										bottom = j;
										break;
									}
								}

								if (bottom != -1) {
									break;
								}
							}

							canvas.topPixel = top;
							canvas.bottomPixel = bottom;
							canvas.leftPixel = left;
							canvas.rightPixel = right;

							resolve([sprite, canvas]);
						} else {
							resolve(null);
						}
					}
					img.src = gamePath + 'sprites/' + sprite;
				}
			}
			xhr.send();
		});
	}
}

function loadLevel(level, func) {
	return new Promise(function (resolve, reject) {
		let xhr = new XMLHttpRequest();
		xhr.open('GET', gamePath + 'levels/' + level);
		xhr.onreadystatechange = function() {
			if (this.readyState === XMLHttpRequest.DONE) {
				let levelColor;
				let tileSize;
				let objects = [];
				let promises = {};
				let spriteObjects = {};
				let levelText = this.responseText.split('\n');
				for (var i=0; i<levelText.length; i++) {
					let sprite;
					let spriteObject;
					let line = levelText[i].split(' ');
					switch (line[0]) {
						case 'color':
							levelColor = {'r': parseInt(line[1]), 'g': parseInt(line[2]), 'b': parseInt(line[3]), 'a': parseInt(line[4])};
							break;
						case 'tileSize':
							tileSize = parseInt(line[1]);
							break;
						case 't':
							// t sprite spriteX spriteY spriteWidth spriteHeight frames animationSpeed x y angle opacity
							//name, width, height, frames, center
							objects.push(new Tile(parseInt(line[8]), parseInt(line[9]), new Sprite(line[1], parseInt(line[2]), parseInt(line[3]), parseInt(line[4]), parseInt(line[5]), parseInt(line[6]), 0.5, 0.5),
													parseInt(line[10]), parseFloat(line[7]), parseFloat(line[11])));
							break;
						case 'o':
							// o sprite spriteX spriteY spriteWidth spriteHeight frames animationSpeed x y angle opacity collideable playable speed
							objects.push(new GameObject(parseInt(line[8]), parseInt(line[9]), new Sprite(line[1], parseInt(line[2]), parseInt(line[3]), parseInt(line[4]), parseInt(line[5]), parseInt(line[6]), 0.5, 0.5),
													parseInt(line[10]), parseFloat(line[7]), line[12] == 'true', line[13] == 'true', line[14] == 'true', parseFloat(line[15]), parseFloat(line[11])));
							// parseFloat(line[7]) is animationSpeed
							break;
						case 'p':
							objects.push(new PlayerObject(line[1], parseInt(line[2]), parseInt(line[3])));
							break;
						case 'sl':
							let weebSlime = new Slime(line[1] == 'true', parseFloat(line[2]), parseFloat(line[3]));
							weebSlime.weebSlime = true;
							weebSlime.faction = null;
							weebSlime.speakAudio = 'uwu';
							objects.push(weebSlime);
							break;
						case 'sn':
							objects.push(new SnakeMage(parseFloat(line[1]), parseFloat(line[2])));
							break;
						case 'w':
							objects.push(new WolfObject(line[1] == 'true', parseFloat(line[2]), parseFloat(line[3])));
							break;
						case 'k':
							objects.push(new KnightObject(line[1] == 'true', parseFloat(line[2]), parseFloat(line[3])));
							break;
						case 'l':
							objects.push(new LichObject(line[1] == 'true', parseFloat(line[2]), parseFloat(line[3])));
							break;
					}
				}
				
				resolve(new Level(levelColor, tileSize, objects, {}));
			}
		}
		xhr.send();
	}).then(function(values) {
		if (func) {func(values);}
	}, function() {
		throw ('Error loading level \"levels/' + level);
	});
}

function drawSprite(level, context, sprite, spriteData, animationFrame, tileSize, canvasX, canvasY, mirror, rotation, alpha, zoom, shadowData, shadowOffsetX, recentlyDamagedPercent, playerFaction) {
	let contextScaleX = 1;
	let contextScaleY = 1;

	if (mirror) {
		contextScaleX = -1;
	}

	// if recently damaged, flash white for a short duration
	if (recentlyDamagedPercent) {
		let newCanvas = document.createElement('canvas');
		newCanvas.width = sprite.width;
		newCanvas.height = sprite.height;
		let newContext = newCanvas.getContext('2d');

		newContext.drawImage(sprite, 0, 0);
		newContext.globalCompositeOperation = "source-atop";
		newContext.fillStyle = 'rgba(255, ' + (playerFaction ? '0, 0, ' : '255, 255, ') + recentlyDamagedPercent + ')';
		newContext.fillRect(0, 0, sprite.width, sprite.height);
		newContext.globalCompositeOperation = "source-over";

		sprite = newCanvas;
	}

	let translateX = canvasX + spriteData.offsetX * tileSize * zoom;
	let translateY = canvasY + spriteData.offsetY * tileSize * zoom;
	context.translate(translateX, translateY);
	context.scale(contextScaleX, contextScaleY);

	if (shadowData) {
		context.translate(shadowOffsetX * tileSize * contextScaleX, 0);

		let leftBound = shadowData[0] * tileSize;
		let rightBound = shadowData[1] * tileSize;
		let topBound = shadowData[2] * tileSize;
		let bottomBound = shadowData[3] * tileSize;

		let marginY = 2;

		// draw shadow
		context.globalAlpha = alpha;
		context.fillStyle = 'rgba(40, 40, 40, 0.5)';
		context.beginPath();
		//(bottomBound - topBound)/2 instead of 11
		if (sprite.id == 'knighthead_2_2.png') {
			context.ellipse((leftBound + rightBound)/2, bottomBound - marginY - spriteData.offsetY * tileSize * zoom, (rightBound - leftBound)/2, 11, 0, 0, Math.PI*2);
		} else {
			context.ellipse((leftBound + rightBound)/2, bottomBound - marginY - spriteData.offsetY * tileSize * zoom, (rightBound - leftBound)/2, 11 * spriteData.height, 0, 0, Math.PI*2);
		}
		context.fill();
		context.closePath();
		context.globalAlpha = 1;

		context.translate(-shadowOffsetX * tileSize * contextScaleX, 0);
	}

	context.rotate(rotation * Math.PI/180);
	context.globalAlpha = alpha;

	context.drawImage(sprite, ((animationFrame << 0) * spriteData.width + spriteData.x) * tileSize, spriteData.y * spriteData.height * tileSize, spriteData.width * tileSize, spriteData.height * tileSize,
						(-spriteData.width * spriteData.centerX * spriteData.scaleX) * tileSize * zoom, (-spriteData.height * spriteData.centerY * spriteData.scaleY) * tileSize * zoom,
						spriteData.width * tileSize * zoom * spriteData.scaleX, spriteData.height * tileSize * zoom * spriteData.scaleY);

	context.rotate(-rotation * Math.PI/180);
	context.scale(1/contextScaleX, 1/contextScaleY);
	context.translate(-translateX, -translateY);
	context.globalAlpha = 1;
}

function renderScreen(screen) {
	screen.checkForResize();

	let canvasWidth = screen.canvas.width;
	let canvasHeight = screen.canvas.height;
	let context = screen.context;
	let camera = screen.camera;
	let level = screen.level;
	let tileSize = level.tileSize * camera.zoomLevel;

	context.fillStyle = 'rgba(' + level.color['r'] + ', ' +
									level.color['g'] + ', ' +
									level.color['b'] + ', ' +
									level.color['a'] + ')';
	context.fillRect(0, 0, canvasWidth, canvasHeight);

	let shakeX = level.maxScreenShakeX * (level.screenShakeMagnitude/(level.screenShakeMagnitude + 10)) * Math.sin(level.currentScreenShakeX);
	let shakeY = level.maxScreenShakeY * (level.screenShakeMagnitude/(level.screenShakeMagnitude + 10)) * Math.sin(level.currentScreenShakeY);
	let shakeRot = level.maxScreenShakeRot * (level.screenShakeMagnitude/(level.screenShakeMagnitude + 10)) * Math.sin(level.currentScreenShakeRot);

	context.translate(shakeX, shakeY);
	context.rotate(shakeRot * Math.PI/180);

	let tilesToRender = [];
	let objectsToRender = [];
	let bossHealthBarsToRender = [];
	let healthBarsToRender = [];
	let textBoxesToRender = [];
	let renderOverHealthBars = [];
	let renderWithPlayer = [];
	let renderOverUI = [];
	let renderOverObjects = [];
	let playerRenderIndex = 0;
	let playerHealth = 0;
	let playerHealthTotal = 0;
	let playerAttackDamage = 0;
	let playerAttackSpeed = 0;
	let playerSpellAmp = 0;
	let playerCdr = 0;

	let minXPos = camera.x << 0;
	let maxXPos = Math.ceil(camera.x + canvasWidth/tileSize);
	let minYPos = camera.y << 0;
	let maxYPos = Math.ceil(camera.y + canvasHeight/tileSize);
	for (var i=minYPos; i<=maxYPos; i++) {
		for (var j=minXPos; j<=maxXPos; j++) {
			if (level.map[j] && level.map[j][i]) {
				for (var k=0; k<level.map[j][i].length; k++) {
					let obj = level.map[j][i][k];
					if (obj instanceof Tile) {
						tilesToRender.push(obj);
					} else if (obj instanceof GameObject) {
						if (obj instanceof ChildObject) {
							if (obj.parent.base == obj) {
								let renderOrder = obj.parent.getRenderOrder();
								if (obj.parent instanceof PlayerObject) {
									playerRenderIndex = objectsToRender.length;
									playerHealth = obj.parent.hp;
									playerHealthTotal = obj.parent.hpTotal;
									playerAttackDamage = obj.parent.attackDamage;
									playerAttackSpeed = obj.parent.attackSpeed;
									playerSpellAmp = obj.parent.spellAmp;
									playerCdr = obj.parent.cdr;
								}
								for (var l=0; l<renderOrder.length; l++) {
									objectsToRender.push(renderOrder[l]);
								}
							}
						} else {
							objectsToRender.push(obj);
						}

						if (obj.text.length > 0) {
							textBoxesToRender.push(function() {
								context.translate(obj.sprite.getOffsetX() * tileSize, obj.sprite.getOffsetY() * tileSize);

								let textStartPercent = 0.8;
								let bottomTriangleHeight = tileSize/5;
								let fontSize = (tileSize/4) * obj.textScale;
								let margin = fontSize/1.8;

								context.textBaseline = 'middle';
								context.font = fontSize + 'px Georgia';
								context.textAlign = 'right';
								let textMetrics = context.measureText(obj.text.substring(0, obj.textTimer));
								let objX = obj.x - obj.sprite.centerX;
								let objY = obj.y - obj.sprite.centerY;
								let textDrawX = (objX + obj.sprite.width * textStartPercent) * (tileSize - 1) + tileSize/2;
								let boxLeftX = textDrawX - margin;
								let boxRightX = textDrawX + textMetrics.width + margin;
								let boxBottomY = objY * (tileSize - 1) + tileSize/2 - bottomTriangleHeight/2;
								let textDrawY = boxBottomY - fontSize/2 - margin;
								let boxTopY = boxBottomY - fontSize - margin * 2;

								context.lineWidth = 2;
								context.strokeStyle = 'rgba(0, 0, 0, 1)';
								context.fillStyle = 'rgba(255, 255, 255, 1)';
								context.beginPath();
								context.moveTo((objX + obj.sprite.width * textStartPercent) * (tileSize - 1) + tileSize/2, boxBottomY);
								context.lineTo((objX + obj.sprite.width * textStartPercent) * (tileSize - 1) + tileSize/2, boxBottomY + bottomTriangleHeight);
								context.lineTo((objX + obj.sprite.width) * (tileSize - 1) + tileSize/2, boxBottomY);
								context.lineTo(boxRightX - margin, boxBottomY);
								context.arc(boxRightX - margin, boxBottomY - margin, margin, Math.PI/2, 0, true);
								context.lineTo(boxRightX, boxTopY + margin);
								context.arc(boxRightX - margin, boxTopY + margin, margin, Math.PI*2, Math.PI*1.5, true);
								context.lineTo(boxLeftX + margin, boxTopY);
								context.arc(boxLeftX + margin, boxTopY + margin, margin, Math.PI*1.5, Math.PI, true);
								context.lineTo(boxLeftX, boxBottomY - margin);
								context.arc(boxLeftX + margin, boxBottomY - margin, margin, Math.PI, Math.PI/2, true);
								context.fill();
								context.stroke();
								context.closePath();

								context.fillStyle = 'rgba(0, 0, 0, 1)';
								for (var l=0; l<obj.textTimer; l++) {
									if (obj.letterEffects[l]['wavyText']) {
										obj.wavyOffsets[l] += obj.wavySpeed;
									}

									context.fillText(obj.text[l], textDrawX + context.measureText(obj.text.substring(0, l+1)).width, textDrawY + obj.wavyMax * fontSize * Math.sin(obj.wavyOffsets[l]));
								}

								if (obj.textTimer == obj.text.length) {
									level.acceptText = obj;

									let acceptTriangleWidth = margin;
									let acceptTriangleHeight = margin/2;
									let acceptTriangleLeftX = boxRightX - margin - acceptTriangleWidth/2;
									let acceptTriangleRightX = acceptTriangleLeftX + acceptTriangleWidth;
									let acceptTriangleTopY = boxBottomY - acceptTriangleHeight*2 + obj.acceptTriangleY - 1;
									let acceptTriangleBottomY = acceptTriangleTopY + acceptTriangleHeight;

									obj.acceptTriangleY = (obj.acceptTriangleY + 0.04) % 3;

									context.lineWidth = 1;
									context.strokeStyle = 'rgba(0, 0, 0, 1)';
									context.fillStyle = 'rgba(140, 50, 40, 1)';
									context.beginPath();
									context.moveTo(acceptTriangleLeftX, acceptTriangleTopY);
									context.lineTo(acceptTriangleLeftX + acceptTriangleWidth/2, acceptTriangleBottomY);
									context.lineTo(acceptTriangleRightX, acceptTriangleTopY);
									context.lineTo(acceptTriangleLeftX, acceptTriangleTopY);
									context.fill();
									context.stroke();
									context.closePath();
								}

								context.translate(-obj.sprite.getOffsetX() * tileSize, -obj.sprite.getOffsetY() * tileSize);
							});
						}

						if ((obj instanceof GameObject && obj.hp && obj.hp > 0 && obj.faction != null) ||
							(obj instanceof ChildObject && obj.faction != null && !obj.playable && obj.parent.children['head'] != obj && obj.parent.hp > 0)) {

							if (obj.boss || (obj.parent && obj.parent.boss)) {
								bossHealthBarsToRender.push(function() {
									let barWidth = 0.25;
									let barHeight = 0.035;
									let barTop = 0.01;
									let margin = 0.002;
									let fontSize = context.canvas.height/45;

									let hp = obj instanceof ChildObject ? obj.parent.hp : obj.hp;
									let hpTotal = obj instanceof ChildObject ? obj.parent.hpTotal : obj.hpTotal;
									let name = obj instanceof ChildObject ? obj.parent.name : obj.name;
									let blackBoxLeftX = context.canvas.width/2 - context.canvas.width * barWidth/2;
									let blackBoxTopY = context.canvas.height * barTop;
									let blackBoxWidth = context.canvas.width * barWidth;
									let blackBoxHeight = context.canvas.height * barHeight;
									let redBoxLeftX = blackBoxLeftX + context.canvas.width * margin;
									let redBoxTopY = blackBoxTopY + context.canvas.width * margin;
									let redBoxWidth = (blackBoxWidth - context.canvas.width * margin * 2) * (hp / hpTotal);
									let redBoxHeight = blackBoxHeight - context.canvas.width * margin * 2;

									context.fillStyle = 'rgba(40, 40, 40, 1)';
									context.beginPath();
									context.rect(blackBoxLeftX, blackBoxTopY, blackBoxWidth, blackBoxHeight);
									context.fill();
									context.closePath();

									context.fillStyle = 'rgba(150, 30, 20, 1)';
									context.beginPath();
									context.rect(redBoxLeftX, redBoxTopY, redBoxWidth, redBoxHeight);
									context.fill();
									context.closePath();

									context.fillStyle = 'rgba(220, 220, 220, 1)';
									context.textBaseline = 'middle';
									context.font = context.canvas.height/45 + 'px serif';
									context.textAlign = 'center';
									context.fillText(name, context.canvas.width/2, blackBoxTopY + blackBoxHeight/2);
								});
							} else {
								healthBarsToRender.push(function() {
									context.translate(obj.sprite.getOffsetX() * tileSize, obj.sprite.getOffsetY() * tileSize);

									let fontSize = tileSize/5;
									let margin = tileSize/32;
									let distanceOverhead = Math.max(0.75, 0.33 * obj.sprite.width);

									let hp = obj instanceof ChildObject ? obj.parent.hp : obj.hp;
									let hpTotal = obj instanceof ChildObject ? obj.parent.hpTotal : obj.hpTotal;
									let name = obj instanceof ChildObject ? obj.parent.name : obj.name;
									
									let topPixel = 0
									let spriteData = level.sprites[obj.sprite.name];
									if (spriteData) {
										if (obj instanceof ChildObject && obj.parent instanceof KnightObject && level.sprites[obj.parent.children['head'].sprite.name]) {
											topPixel = (level.sprites[obj.parent.children['head'].sprite.name].topPixel/level.tileSize) * obj.parent.children['head'].sprite.scaleY;
										} else {
											topPixel = (spriteData.topPixel/level.tileSize) * obj.sprite.scaleY;
										}
									}

									let healthBarColor = (obj.faction == 'enemy' ? 'rgba(150, 30, 20, 1)' : 'rgba(30, 150, 20, 1)');
									let blackBoxLeftX = (obj.x - obj.sprite.centerX * obj.sprite.width) * (tileSize - 1) + tileSize/2;
									let blackBoxTopY = (obj.y - obj.sprite.centerY * obj.sprite.height + topPixel - distanceOverhead) * (tileSize - 1) + tileSize/2;
									let blackBoxWidth = obj.sprite.width * (tileSize - 1);
									let blackBoxHeight = tileSize/4;
									let redBoxLeftX = blackBoxLeftX + margin;
									let redBoxTopY = blackBoxTopY + margin;
									let redBoxWidth = (blackBoxWidth - margin * 2) * (hp / hpTotal);
									let redBoxHeight = blackBoxHeight - margin * 2;

									context.fillStyle = 'rgba(40, 40, 40, 1)';
									context.beginPath();
									context.rect(blackBoxLeftX, blackBoxTopY, blackBoxWidth, blackBoxHeight);
									context.fill();
									context.closePath();

									context.fillStyle = healthBarColor;
									context.beginPath();
									context.rect(redBoxLeftX, redBoxTopY, redBoxWidth, redBoxHeight);
									context.fill();
									context.closePath();

									context.fillStyle = 'rgba(220, 220, 220, 1)';
									context.textBaseline = 'middle';
									context.font = fontSize + 'px serif';
									context.textAlign = 'center';
									context.fillText(name, blackBoxLeftX + blackBoxWidth/2, blackBoxTopY + blackBoxHeight/2);

									context.translate(-obj.sprite.getOffsetX() * tileSize, -obj.sprite.getOffsetY() * tileSize);
								});
							}
						}
					} else if (obj instanceof Particle) {
						// 0: Normal, 1: Render at very bottom, 2: Render right beneath player, 3: Render over health bars, 4: Render over UI
						switch(obj.renderPriority) {
							case 0:
								objectsToRender.push(obj);
								break;
							case 1:
								objectsToRender.splice(0, 0, obj);
								break;
							case 2:
								renderWithPlayer.push(obj);
								break;
							case 3:
								renderOverObjects.push(obj);
								break;
							case 4:
								renderOverHealthBars.push(obj);
								break;
							case 5:
								renderOverUI.push(obj);
								break;
						}
					}
				}
			}
		}
	}

	for (var i=0; i<renderWithPlayer.length; i++) {
		objectsToRender.splice(playerRenderIndex, 0, renderWithPlayer[i]);
	}

	if (!level.gameStarted && level.factions['player'] && !contains(objectsToRender, level.factions['player'][0])) {
		objectsToRender = objectsToRender.concat(level.factions['player'][0].parent.getRenderOrder());
	}

	let allToRender = tilesToRender.concat(objectsToRender).concat(renderOverObjects).concat(healthBarsToRender).concat(renderOverHealthBars).concat(bossHealthBarsToRender).concat(textBoxesToRender);
	let len = allToRender.length;
	for (var i=0; i<len; i++) {
		let obj = allToRender[i];

		if (typeof obj === 'function') {
			obj();
		} else if (obj instanceof Tile || obj instanceof GameObject || obj instanceof SpriteFadeParticle) {
			let objSpriteData = obj.sprite;
			let sprite = level.sprites[objSpriteData.name];

			if (sprite) {
				let xPos = (obj.x - camera.x) * (tileSize - 1) + tileSize/2;
				let yPos = (obj.y - camera.y) * (tileSize - 1) + tileSize/2;

				let frameSizeX = objSpriteData.width * level.tileSize;
				let frameSizeY = objSpriteData.height * level.tileSize;

				drawSprite(level, context, sprite, objSpriteData, obj.animationFrame, level.tileSize, xPos, yPos, obj.mirror, obj.angle, obj.opacity, camera.zoomLevel, obj.getShadowBoundingBox(level),
					(obj.parent && !(obj instanceof HeadChildObject && obj.parent.headDetached)) ? obj.parent.base.x - obj.x : 0,
					obj.recentlyDamaged ? obj.recentlyDamaged/obj.recentlyDamagedFlashTime : ((obj instanceof ChildObject) ? obj.parent.recentlyDamaged/obj.parent.recentlyDamagedFlashTime : 0), 
					(obj.faction == 'player') || (obj instanceof ChildObject && obj.parent.base.faction == 'player'));
			}
		} else if (obj instanceof WeaponSwingParticle) {
			let angleToStartPoint = Math.atan2(obj.startPoint[1] - obj.centerPoint[1], obj.startPoint[0] - obj.centerPoint[0]);
			let angleToEndPoint = Math.atan2(obj.endPoint[1] - obj.centerPoint[1], obj.endPoint[0] - obj.centerPoint[0]);
			let secondArcCenterPointX = obj.centerPoint[0] + obj.arcSize * Math.cos(angleToStartPoint);
			let secondArcCenterPointY = obj.centerPoint[1] + obj.arcSize * Math.sin(angleToStartPoint);
			let secondArcEndPointX = obj.endPoint[0] - obj.arcSize * Math.cos(angleToEndPoint);
			let secondArcEndPointY = obj.endPoint[1] - obj.arcSize * Math.sin(angleToEndPoint);
			let secondArcAngleToEndPoint = Math.atan2(secondArcEndPointY - secondArcCenterPointY, secondArcEndPointX - secondArcCenterPointX);

			context.lineWidth = 1;
			context.fillStyle = obj.color;
			context.strokeStyle = 'rgba(0, 0, 0, 1)';
			context.globalAlpha = obj.opacity;
			context.beginPath();
			context.arc(obj.centerPoint[0] * (tileSize - 1) + tileSize/2, obj.centerPoint[1] * (tileSize - 1) + tileSize/2, tileSize * getDistance(obj.centerPoint[0], obj.centerPoint[1], obj.endPoint[0], obj.endPoint[1]),
				angleToStartPoint, angleToEndPoint, obj.mirror);
			context.arc(secondArcCenterPointX * (tileSize - 1) + tileSize/2, secondArcCenterPointY * (tileSize - 1) + tileSize/2, tileSize * (getDistance(obj.centerPoint[0], obj.centerPoint[1], obj.endPoint[0], obj.endPoint[1]) - obj.arcSize),
				secondArcAngleToEndPoint, angleToStartPoint, !obj.mirror);
			context.fill();
			context.stroke();
			context.closePath();
			context.globalAlpha = 1;
		} else if (obj instanceof ShapeFadeParticle || obj instanceof ShapeParticle || obj instanceof ShapeFadeInFadeOutParticle) {
			switch(obj.shape) {
				case 'rect':
					// shapeData: [width, height]
					let rectX = obj.x * (tileSize - 1) + tileSize/2;
					let rectY = obj.y * (tileSize - 1) + tileSize/2;
					let rectWidth = obj.shapeData[0] * tileSize;
					let rectHeight = obj.shapeData[1] * tileSize;
					context.translate(rectX, rectY);
					context.rotate(toRadians(obj.angle));
					context.lineWidth = 1;
					context.fillStyle = obj.color;
					context.strokeStyle = obj.outlineColor;
					context.globalAlpha = obj.opacity;
					context.beginPath();
					context.rect(0, 0, rectWidth, rectHeight);
					context.fill();
					context.stroke();
					context.closePath();
					context.globalAlpha = 1;
					context.rotate(toRadians(-obj.angle));
					context.translate(-rectX, -rectY);
					break;
				case 'circle':
					// shapeData: radius
					context.lineWidth = 1;
					context.fillStyle = obj.color;
					context.strokeStyle = obj.outlineColor;
					context.globalAlpha = obj.opacity;
					context.beginPath();
					context.arc(obj.x * (tileSize - 1) + tileSize/2, obj.y * (tileSize - 1) + tileSize/2, obj.shapeData * tileSize, 0, 2*Math.PI);
					context.fill();
					context.stroke();
					context.closePath();
					context.globalAlpha = 1;
					break;
				case 'ellipse':
					// shapeData: [radiusX, radiusY]
					context.lineWidth = 1;
					context.fillStyle = obj.color;
					context.strokeStyle = obj.outlineColor;
					context.globalAlpha = obj.opacity;
					context.beginPath();
					context.ellipse(obj.x * (tileSize - 1) + tileSize/2, obj.y * (tileSize - 1) + tileSize/2, obj.shapeData[0] * tileSize, obj.shapeData[1] * tileSize, toRadians(obj.angle), 0, 2*Math.PI);
					context.fill();
					context.stroke();
					context.closePath();
					context.globalAlpha = 1;
					break;
				case 'pentagram':
					// shapeData: [radiusX, radiusY]
					let centerX = obj.x * (tileSize - 1) + tileSize/2;
					let centerY = obj.y * (tileSize - 1) + tileSize/2;
					let radiusX = obj.shapeData[0] * tileSize;
					let radiusY = obj.shapeData[1] * tileSize;

					context.lineWidth = Math.max(1, radiusX * 0.025 << 0);
					context.fillStyle = obj.color;
					context.strokeStyle = obj.outlineColor;
					context.globalAlpha = obj.opacity;
					context.beginPath();
					context.ellipse(centerX, centerY, radiusX, radiusY, toRadians(obj.angle), 0, 2*Math.PI);
					context.fill();
					context.lineTo(centerX + radiusX * Math.cos(6*Math.PI/5), centerY + radiusY * Math.sin(6*Math.PI/5));
					context.lineTo(centerX + radiusX * Math.cos(2*Math.PI/5), centerY + radiusY * Math.sin(2*Math.PI/5));
					context.lineTo(centerX + radiusX * Math.cos(8*Math.PI/5), centerY + radiusY * Math.sin(8*Math.PI/5));
					context.lineTo(centerX + radiusX * Math.cos(4*Math.PI/5), centerY + radiusY * Math.sin(4*Math.PI/5));
					context.lineTo(centerX + radiusX, centerY);
					context.stroke();
					context.closePath();
					context.globalAlpha = 1;
					break;
				case 'laser':
					// shapeData: [radius, beamPercent, beamLength, topArcHeight]
					let circleX = obj.x * (tileSize - 1) + tileSize/2;
					let circleY = obj.y * (tileSize - 1) + tileSize/2;
					let angle = toRadians(obj.angle);
					let circleRadius = obj.shapeData[0] * tileSize;
					let beamStart1Angle = -obj.shapeData[1] * Math.PI/2;
					let beamStart2Angle = obj.shapeData[1] * Math.PI/2;
					let beamStart1X = circleRadius * Math.cos(beamStart1Angle);
					let beamStart1Y = circleRadius * Math.sin(beamStart1Angle);
					let beamStart2X = circleRadius * Math.cos(beamStart2Angle);
					let beamStart2Y = circleRadius * Math.sin(beamStart2Angle);
					let beamLength = Math.min(Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight), obj.shapeData[2] * tileSize);
					context.translate(circleX, circleY);
					context.rotate(angle);
					context.lineWidth = 1;
					context.fillStyle = obj.color;
					context.strokeStyle = obj.outlineColor;
					context.globalAlpha = obj.opacity;
					context.beginPath();
					if (beamLength > 0) {
						context.arc(0, 0, circleRadius, beamStart2Angle, beamStart1Angle);
						context.lineTo(beamStart1X + beamLength, beamStart1Y);
						context.ellipse(beamStart1X + beamLength, 0, obj.shapeData[3] * tileSize, Math.max(beamStart2Y, beamStart1Y), 0, 1.5*Math.PI, 0.5*Math.PI);
						context.lineTo(beamStart2X, beamStart2Y);
					} else {
						context.arc(0, 0, circleRadius, 0, 2*Math.PI);
					}
					context.fill();
					context.stroke();
					context.closePath();
					context.globalAlpha = 1;
					context.rotate(-angle);
					context.translate(-circleX, -circleY);
					break;
			}
		} else if (obj instanceof EnemySelectionParticle) {
			let shadowData = obj.enemy.getShadowBoundingBox(level);
			if (!shadowData && obj.enemy.parent) {
				shadowData = obj.enemy.parent.getRenderOrder()[0].getShadowBoundingBox(level);
			}

			let ellipseX = 0;
			let ellipseY = 0;
			let ellipseRadiusX = 0;
			let ellipseRadiusY = 0;
			if (shadowData) {
				let leftBound = shadowData[0] * tileSize;
				let rightBound = shadowData[1] * tileSize;
				let topBound = shadowData[2] * tileSize;
				let bottomBound = shadowData[3] * tileSize;
				let marginY = 3;

				ellipseX = (obj.enemy.x + obj.enemy.sprite.offsetX - (obj.enemy.mirror ? (1 - obj.enemy.sprite.centerX) : obj.enemy.sprite.centerX) * obj.enemy.sprite.width + obj.enemy.sprite.width/2) * (tileSize - 1) + tileSize/2;
				ellipseY = ((obj.enemy.y + obj.enemy.sprite.offsetY) * (tileSize - 1) + tileSize/2) + bottomBound - marginY / (obj.enemy.sprite.height * obj.enemy.sprite.height);
				ellipseRadiusX = (rightBound - leftBound)/2 + obj.marginX * tileSize;
				ellipseRadiusY = 11 * Math.max(1, (bottomBound - topBound)/tileSize) + obj.marginY * tileSize * obj.enemy.sprite.height;
			} else {
				ellipseX = (obj.enemy.x + obj.enemy.sprite.offsetX - (obj.enemy.mirror ? (1 - obj.enemy.sprite.centerX) : obj.enemy.sprite.centerX) * obj.enemy.sprite.width + obj.enemy.sprite.width/2) * (tileSize - 1) + tileSize/2;
				ellipseY = (obj.enemy.y + obj.enemy.sprite.offsetY - obj.enemy.sprite.centerY * obj.enemy.sprite.height + obj.enemy.sprite.height) * (tileSize - 1) + tileSize/2;
				ellipseRadiusX = (obj.enemy.sprite.width/2) * tileSize;
				ellipseRadiusY = 11 * obj.enemy.sprite.height;
			}

			context.lineWidth = obj.thickness;
			context.strokeStyle = obj.color;
			context.globalAlpha = obj.opacity;
			context.beginPath();
			context.ellipse(ellipseX, ellipseY, ellipseRadiusX, ellipseRadiusY, 0, 0, 2*Math.PI);
			context.moveTo(ellipseX + ellipseRadiusX * Math.cos(obj.particleSpinCounter), ellipseY + ellipseRadiusY * Math.cos(obj.particleSpinCounter));
			context.lineTo(ellipseX + (1 - obj.spinningTickSize) * ellipseRadiusX * Math.cos(obj.particleSpinCounter), ellipseY + (1 - obj.spinningTickSize) * ellipseRadiusY * Math.cos(obj.particleSpinCounter));
			context.moveTo(ellipseX - ellipseRadiusX * Math.cos(obj.particleSpinCounter), ellipseY + ellipseRadiusY * Math.cos(obj.particleSpinCounter));
			context.lineTo(ellipseX - (1 - obj.spinningTickSize) * ellipseRadiusX * Math.cos(obj.particleSpinCounter), ellipseY + (1 - obj.spinningTickSize) * ellipseRadiusY * Math.cos(obj.particleSpinCounter));
			context.moveTo(ellipseX + ellipseRadiusX * Math.cos(obj.particleSpinCounter), ellipseY - ellipseRadiusY * Math.cos(obj.particleSpinCounter));
			context.lineTo(ellipseX + (1 - obj.spinningTickSize) * ellipseRadiusX * Math.cos(obj.particleSpinCounter), ellipseY - (1 - obj.spinningTickSize) * ellipseRadiusY * Math.cos(obj.particleSpinCounter));
			context.moveTo(ellipseX - ellipseRadiusX * Math.cos(obj.particleSpinCounter), ellipseY - ellipseRadiusY * Math.cos(obj.particleSpinCounter));
			context.lineTo(ellipseX - (1 - obj.spinningTickSize) * ellipseRadiusX * Math.cos(obj.particleSpinCounter), ellipseY - (1 - obj.spinningTickSize) * ellipseRadiusY * Math.cos(obj.particleSpinCounter));
			context.stroke();
			context.closePath();
			context.globalAlpha = 1;
		} else if (obj instanceof ImageParticle) {
			context.globalAlpha = obj.opacity;
			context.drawImage(obj.image, obj.x * (tileSize - 1) + tileSize/2, obj.y * (tileSize - 1) + tileSize/2);
			context.globalAlpha = 1;
		}
	}

	if (level.freezeCounter > level.freezeTime && level.weakspot == 0 && level.freezeCounterBeforeWeakspot == 0) {
		// looks better but is super laggy
		// context.filter = 'grayscale(' + level.currentFreezeEasing/level.freezeEasingMax + ')';

		//count number of ticks before full freeze
		let totalTicks = 0;
		for (var i=2; i<level.freezeEasingMax; i++) {
			totalTicks += (((level.freezeEasingMax - i)/level.freezeEasingSpeed) << 0) * i;
		}

		let maxAlpha = 0.6;

		let percentage = (Math.min(totalTicks, level.freezeCounter - level.freezeTime)/totalTicks);
		context.fillStyle = 'rgba(190, 190, 190, 1)';
		context.globalAlpha = maxAlpha * (level.freezeDirection ? percentage : (1-percentage));
		context.fillRect(0, 0, canvasWidth, canvasHeight);
		context.globalAlpha = 1;
	}

	context.globalAlpha = level.uiAlpha;
	for (var i=0; i<screen.ui.length; i++) {
		let element = screen.ui[i];

		if (element.hovered) {
			element.processHover();
		}

		if (element instanceof Offering) {
			let centerX = element.x + (element.width * element.scaleX)/2;
			let centerY = element.y + (element.height * element.scaleY)/2;

			// glow behind stat offerings
			let glowRadius = element.width * 4;
			let glowRadialGradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
			glowRadialGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
			glowRadialGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
			context.fillStyle = glowRadialGradient;
			context.beginPath();
			context.arc(centerX, centerY, glowRadius, 0, 2*Math.PI);
			context.fill();
			context.closePath();

			context.font = 'bold 56px sans-serif';
			context.textAlign = 'center';
			context.textBaseline = 'top';
			context.fillStyle = 'rgba(0, 0, 170, 1)';
			context.lineWidth = 2;
			context.strokeStyle = 'rgba(0, 0, 0, 1)';
			context.fillText('CHOOSE ONE', canvasWidth/2, canvasHeight/15);
			context.strokeText('CHOOSE ONE', canvasWidth/2, canvasHeight/15);
			context.font = 'bold 40px sans-serif';
			context.fillStyle = 'rgba(255, 200, 0, 1)';
			context.fillText(element.name, centerX, window.innerHeight/2.4 - 3.5 * element.img.height);
			context.strokeText(element.name, centerX, window.innerHeight/2.4 - 3.5 * element.img.height);

			context.font = '24px Georgia';
			context.fillStyle = 'rgba(255, 255, 255, 1)';
			let margin = 10;

			let descriptionWidth = context.measureText(element.description).width;
			let boxLeftX = centerX - descriptionWidth/2 - margin;
			let boxRightX = centerX + descriptionWidth/2 + margin;
			let boxTopY = window.innerHeight/2.4 + 3.2 * element.img.height - margin;
			let boxBottomY = boxTopY + 24 + 2 * margin;

			context.beginPath();
			context.moveTo(boxLeftX + margin, boxBottomY);
			context.lineTo(boxRightX - margin, boxBottomY);
			context.arc(boxRightX - margin, boxBottomY - margin, margin, Math.PI/2, 0, true);
			context.lineTo(boxRightX, boxTopY + margin);
			context.arc(boxRightX - margin, boxTopY + margin, margin, 0, 1.5*Math.PI, true);
			context.lineTo(boxLeftX + margin, boxTopY);
			context.arc(boxLeftX + margin, boxTopY + margin, margin, 1.5*Math.PI, Math.PI, true);
			context.lineTo(boxLeftX, boxBottomY - margin);
			context.arc(boxLeftX + margin, boxBottomY - margin, margin, Math.PI, Math.PI/2, true);
			context.fill();
			context.stroke();
			context.closePath();

			context.fillStyle = 'rgba(0, 0, 0, 1)';
			context.fillText(element.description, centerX, boxTopY + margin);
		} else if (element instanceof Ability && !element.owner && element.img) {
			let centerX = element.x + (element.width * element.scaleX)/2;
			let centerY = element.y + (element.height * element.scaleY)/2;

			// draw rays around new abilities
			let glowRadius = element.width * 4;
			let glowRadialGradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
			glowRadialGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
			glowRadialGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
			context.fillStyle = glowRadialGradient;
			context.beginPath();
			context.arc(centerX, centerY, glowRadius, 0, 2*Math.PI);
			context.fill();
			context.closePath();

			let rayRadius = element.width * 6;
			let rayRadialGradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, rayRadius);
			rayRadialGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
			rayRadialGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
			context.fillStyle = rayRadialGradient;

			let rays = 10;
			let portionOfArc = 0.35;
			let spinSpeed = 0.002;

			let arcSize = 2*Math.PI/rays;
			for (var j=0; j<rays; j++) {
				let procession = arcSize * j + element.spinCounter * spinSpeed;
				context.beginPath();
				context.moveTo(centerX, centerY);
				context.arc(centerX, centerY, rayRadius, procession, procession + arcSize * portionOfArc);
				context.fill();
				context.closePath();
			}

			context.font = 'bold 56px sans-serif';
			context.textAlign = 'center';
			context.textBaseline = 'top';
			context.fillStyle = 'rgba(0, 0, 170, 1)';
			context.lineWidth = 2;
			context.strokeStyle = 'rgba(0, 0, 0, 1)';
			if (element.ultimate) {
				context.fillText('ULTIMATE ABILITY', centerX, canvasHeight/15);
				context.strokeText('ULTIMATE ABILITY', centerX, canvasHeight/15);
			} else {
				context.fillText('NEW ABILITY', centerX, canvasHeight/15);
				context.strokeText('NEW ABILITY', centerX, canvasHeight/15);
			}
			context.font = 'bold 40px sans-serif';
			context.fillStyle = 'rgba(255, 200, 0, 1)';
			context.fillText(element.name, centerX, window.innerHeight/2.4 - 2.9 * element.img.height);
			context.strokeText(element.name, centerX, window.innerHeight/2.4 - 2.9 * element.img.height);

			context.font = '24px Georgia';
			context.fillStyle = 'rgba(255, 255, 255, 1)';
			let margin = 10;

			// draw white background for text description of ability
			let lines = element.description.split('\n');
			let linesRequired = lines.length - 1 + (element.cooldown != null) + (element.duration != null) + (element.damage != null);

			let maxTextWidth = 0;
			for (var j=0; j<lines.length; j++) {
				maxTextWidth = Math.max(maxTextWidth, context.measureText(lines[j]).width);
			}

			let boxLeftX = centerX - maxTextWidth/2 - margin;
			let boxRightX = centerX + maxTextWidth/2 + margin;
			let boxTopY = window.innerHeight/2.4 + 2.6 * element.img.height - margin;
			let boxBottomY = window.innerHeight/2.4 + 2.6 * element.img.height + 54 + 30 * linesRequired + margin;

			context.beginPath();
			context.moveTo(boxLeftX + margin, boxBottomY);
			context.lineTo(boxRightX - margin, boxBottomY);
			context.arc(boxRightX - margin, boxBottomY - margin, margin, Math.PI/2, 0, true);
			context.lineTo(boxRightX, boxTopY + margin);
			context.arc(boxRightX - margin, boxTopY + margin, margin, 0, 1.5*Math.PI, true);
			context.lineTo(boxLeftX + margin, boxTopY);
			context.arc(boxLeftX + margin, boxTopY + margin, margin, 1.5*Math.PI, Math.PI, true);
			context.lineTo(boxLeftX, boxBottomY - margin);
			context.arc(boxLeftX + margin, boxBottomY - margin, margin, Math.PI, Math.PI/2, true);
			context.fill();
			context.stroke();
			context.closePath();

			context.fillStyle = 'rgba(0, 0, 0, 1)';
			for (var j=0; j<lines.length; j++) {
				context.fillText(lines[j], centerX, window.innerHeight/2.4 + 2.6 * element.img.height + 30 * j);
			}

			let linesWritten = 0;
			if (element.damage) {
				context.fillText('Damage: ' + element.damage, centerX, window.innerHeight/2.4 + 2.6 * element.img.height + 60 + 30 * (linesWritten + lines.length - 1));
				linesWritten++;
			}
			if (element.duration) {
				context.fillText('Duration: ' + element.duration + 's', centerX, window.innerHeight/2.4 + 2.6 * element.img.height + 60 + 30 * (linesWritten + lines.length - 1));
				linesWritten++;
			}
			if (element.cooldown) {
				context.fillText('Cooldown: ' + element.cooldown + 's', centerX, window.innerHeight/2.4 + 2.6 * element.img.height + 60 + 30 * (linesWritten + lines.length - 1));
				linesWritten++;
			}
		}

		if (element instanceof UIButton && (!element.owner || element.movingToSlot)) {
			context.fillStyle = 'rgba(255, 255, 255, 1)';
			context.lineWidth = 3;
			context.beginPath();
			context.rect(element.x, element.y, element.width * element.scaleX, element.height * element.scaleY);
			context.stroke();
			context.fill();
			context.closePath();
		}

		if (element.img) {
			let xPos = element.x;
			let yPos = element.y;

			if (element.angle && element.angle != 0) {
				context.translate(element.x + element.width/2, element.y + element.height/2);
				context.rotate(element.angle * Math.PI/180);
				xPos = -element.width/2;
				yPos = -element.height/2;
			}

			if (element.renderPlayerHealth) {
				// draw this entire element as a player health meter
				let newCanvas = document.createElement('canvas');
				newCanvas.width = element.width;
				newCanvas.height = element.height;
				let newContext = newCanvas.getContext('2d');

				newContext.fillStyle = 'rgba(150, 30, 20, 1)';
				newContext.drawImage(element.img, 0, 0, element.width, element.height);
				newContext.globalCompositeOperation = 'source-atop';
				newContext.beginPath();
				newContext.rect(element.img.leftPixel, 0, (element.img.rightPixel - element.img.leftPixel) * (playerHealth/playerHealthTotal), element.img.height);
				newContext.fill();
				newContext.closePath();
				newContext.globalCompositeOperation = 'source-over';

				context.drawImage(newCanvas, xPos, yPos, element.width, element.height);

				context.font = '16px Georgia';
				context.textAlign = 'right';
				context.textBaseline = 'middle';
				context.fillStyle = 'rgba(255, 255, 255, 1)';
				context.fillText('HP: ' + Math.round(playerHealth*10)/10 + '/' + playerHealthTotal, xPos + element.width * 0.96, element.y + element.height/2);
			} else if (element instanceof Ability && element.owner) {
				if (element.movingToSlot) {
					context.drawImage(element.img, xPos, yPos, element.width * element.scaleX, element.height * element.scaleY);
				} else {
					let slotImg = null;
					// only draw ability over slot sprite to cut off corners
					if (element.ultimate) {
						slotImg = document.getElementById('bottombarultimateslot.png');
					} else {
						slotImg = document.getElementById('bottombarbasicslot.png');
					}

					let newCanvas = document.createElement('canvas');
					newCanvas.width = slotImg.width;
					newCanvas.height = slotImg.height;
					let newContext = newCanvas.getContext('2d');

					newContext.drawImage(slotImg, 0, 0, slotImg.width, slotImg.height);
					newContext.globalCompositeOperation = 'source-atop';
					newContext.drawImage(element.img, 0, 0, element.width, element.height);

					// draw cooldown over ability
					if (element.cooldownCounter > 0) {
						let radiusX = element.img.width/2;
						let radiusY = element.img.height/2;
						let actualRadius = Math.sqrt(radiusX * radiusX + radiusY * radiusY);
						newContext.fillStyle = 'rgba(70, 70, 70, 0.6)';
						newContext.strokeStyle = 'rgba(0, 0, 0, 1)';
						newContext.beginPath();
						newContext.moveTo(radiusX, radiusY);
						newContext.lineTo(radiusX, radiusY - actualRadius);
						newContext.arc(radiusX, radiusY, actualRadius, 3.5*Math.PI, 3.5*Math.PI - ((2*Math.PI) * (element.cooldownCounter/(element.getCooldownWithModifiers()))), true);
						newContext.lineTo(radiusX, radiusY);
						newContext.fill();
						newContext.stroke();
						newContext.closePath();
						newContext.globalCompositeOperation = 'source-over';
					}

					context.drawImage(newCanvas, xPos, yPos, newCanvas.width, newCanvas.height);

					if (element.tutorial && element.notYetUsed && element.selecting) {
						context.font = '20px Georgia';
						context.textAlign = 'center';
						context.textBaseline = 'top';
						context.fillStyle = 'rgba(0, 0, 0, 0.7)';
						let margin = 5;

						let textWidth = context.measureText(element.tutorial).width;
						let boxLeftX = canvasWidth/2 - textWidth/2 - margin;
						let boxWidth = textWidth + 2 * margin;
						let boxTopY = canvasHeight - 150 - 20 - 3 * margin;
						let boxHeight = 20 + 2 * margin;

						context.fillRect(boxLeftX, boxTopY, boxWidth, boxHeight);

						context.fillStyle = 'rgba(255, 255, 255, 1)';
						context.fillText(element.tutorial, canvasWidth/2, boxTopY + margin);
					}
				}

			} else if (element.spriteX === undefined) {
				context.drawImage(element.img, xPos, yPos, element.width * element.scaleX, element.height * element.scaleY);
			} else {
				context.drawImage(element.img, element.spriteX * tileSize, element.spriteY * tileSize, element.spriteWidth * tileSize, element.spriteWidth * tileSize,
					xPos, yPos, element.width, element.height);
			}

			context.font = '24px Georgia';
			context.textAlign = 'right';
			context.textBaseline = 'middle';
			context.fillStyle = 'rgba(150, 150, 150, 1)';
			if (element.renderAttackDamage) {
				context.fillText(Math.round(playerAttackDamage), xPos + element.width*0.9, yPos + element.height/2);
			} else if (element.renderAttackSpeed) {
				context.fillText(Math.round(playerAttackSpeed), xPos + element.width*0.9, yPos + element.height/2);
			} else if (element.renderSpellAmplification) {
				context.fillText(Math.round(playerSpellAmp), xPos + element.width*0.9, yPos + element.height/2);
			} else if (element.renderCooldownReduction) {
				context.fillText(Math.round(playerCdr), xPos + element.width*0.9, yPos + element.height/2);
			}

			if (element.angle && element.angle != 0) {
				context.rotate(-element.angle * Math.PI/180);
				context.translate(-element.x + element.width/2, -element.y + element.height/2);
			}
		}

		if (element instanceof UIButton) {
			if (element instanceof Ability) {
				// TODO: draw ability text here
			} else {
				context.font = '10px sans-serif';
				context.textAlign = 'left';
				context.textBaseline = 'alphabetic';
				context.fillStyle = 'rgba(0, 0, 0, 1)';
				context.fillText(element.text, element.x, element.y + 8);
			}
		}
	}

	if (level.debugMode) {
		let debugRender = objectsToRender.concat(renderOverHealthBars);
		for (var i=0; i<debugRender.length; i++) {
			// [left, right, top, bottom]
			let debugBoundingBox = debugRender[i].getBoundingBox(level);
			if (debugBoundingBox) {
				context.lineWidth = 1;
				context.strokeStyle = 'rgba(0, 0, 0, 1)';
				context.beginPath();
				context.moveTo(debugBoundingBox[0] * (tileSize - 1) + tileSize/2, debugBoundingBox[3] * (tileSize - 1) + tileSize/2);
				context.lineTo(debugBoundingBox[1] * (tileSize - 1) + tileSize/2, debugBoundingBox[3] * (tileSize - 1) + tileSize/2);
				context.lineTo(debugBoundingBox[1] * (tileSize - 1) + tileSize/2, debugBoundingBox[2] * (tileSize - 1) + tileSize/2);
				context.lineTo(debugBoundingBox[0] * (tileSize - 1) + tileSize/2, debugBoundingBox[2] * (tileSize - 1) + tileSize/2);
				context.lineTo(debugBoundingBox[0] * (tileSize - 1) + tileSize/2, debugBoundingBox[3] * (tileSize - 1) + tileSize/2);
				context.stroke();
				context.closePath();
			}
		}
	}

	if (level.notYetMoved || level.notYetUsedAbility) {
		context.font = '20px Georgia';
		context.textAlign = 'center';
		context.textBaseline = 'top';
		context.fillStyle = 'rgba(0, 0, 0, 0.7)';
		let margin = 5;

		let textWidth = context.measureText(level.tutorialString).width;
		let boxLeftX = canvasWidth/2 - textWidth/2 - margin;
		let boxWidth = textWidth + 2 * margin;
		let boxTopY = canvasHeight - 150 - 20 - 3 * margin;
		let boxHeight = 20 + 2 * margin;

		context.fillRect(boxLeftX, boxTopY, boxWidth, boxHeight);

		context.fillStyle = 'rgba(255, 255, 255, 1)';
		context.fillText(level.tutorialString, canvasWidth/2, boxTopY + margin);
	}
	context.globalAlpha = 1;

	if (level.weakspot != 0) {
		let stage1BarsHeight = 0.1;

		let elapsedTime = level.freezeCounter - level.freezeTime - level.currentWeakspotTime;
		let percentageTime = elapsedTime / level.weakspotStepTimes[level.weakspot-1];
		let actualHeight = 0;
		switch(level.weakspot) {
			case 1:
				actualHeight = canvasHeight * stage1BarsHeight * percentageTime;
				context.fillStyle = 'rgba(0, 0, 0, 1)';
				context.fillRect(0, 0, canvasWidth, actualHeight);
				context.fillRect(0, canvasHeight - actualHeight, canvasWidth, actualHeight);
				break;
			case 2:
				actualHeight = canvasHeight * stage1BarsHeight;
				context.fillStyle = 'rgba(0, 0, 0, 1)';
				context.fillRect(0, 0, canvasWidth, canvasHeight/10);
				context.fillRect(0, canvasHeight - canvasHeight/10, canvasWidth, canvasHeight/10);
				break;
			case 3:
				actualHeight = (canvasHeight/2) * Math.max(2 * stage1BarsHeight, percentageTime);
				context.fillStyle = 'rgba(0, 0, 0, 1)';
				context.fillRect(0, 0, canvasWidth, actualHeight);
				context.fillRect(0, canvasHeight - actualHeight, canvasWidth, actualHeight);
				break;
			case 13:
				actualHeight = (canvasHeight/2) * (1 - percentageTime);
				context.fillStyle = 'rgba(0, 0, 0, 1)';
				context.fillRect(0, 0, canvasWidth, actualHeight);
				context.fillRect(0, canvasHeight - actualHeight, canvasWidth, actualHeight);
				break;
			default:
				actualHeight = canvasHeight/2 + 1;
				context.fillStyle = 'rgba(0, 0, 0, 1)';
				context.fillRect(0, 0, canvasWidth, canvasHeight);
				break;
		}

		if (level.weakspotAbility) {
			let playerRender = [];
			if (level.weakspot != 7 && level.weakspot != 9) {
				playerRender = level.weakspotAbility.owner.getRenderOrder();
			}

			if (level.weakspotAbility.targetedAt instanceof ChildObject) {
				playerRender = playerRender.concat(level.weakspotAbility.targetedAt.parent.getRenderOrder());
			} else {
				playerRender.push(level.weakspotAbility.targetedAt);
			}

			for (var i=0; i<playerRender.length; i++) {
				let object = playerRender[i];
				let spriteElement = level.sprites[object.sprite.name];

				let yAboveCenter = (-object.sprite.height * object.sprite.centerY * object.sprite.scaleY + object.sprite.offsetY) * level.tileSize * camera.zoomLevel;
				let yHeight = object.sprite.height * level.tileSize * camera.zoomLevel * object.sprite.scaleY;
				let yTranslation = (object.y - camera.y) * (level.tileSize - 1) + level.tileSize/2;
				let topYPixel = yTranslation + yAboveCenter;
				let bottomYPixel = yTranslation - yAboveCenter + yHeight;

				if ((actualHeight >= topYPixel) || (canvasHeight - actualHeight <= bottomYPixel)) {
					let newCanvas = document.createElement('canvas');
					newCanvas.width = spriteElement.width;
					newCanvas.height = spriteElement.height;

					let newContext = newCanvas.getContext('2d');
					newContext.drawImage(spriteElement, 0, 0, spriteElement.width, spriteElement.height);
					newContext.globalCompositeOperation = 'source-atop';
					newContext.fillStyle = 'rgba(255, 255, 255, 1)';
					newContext.fillRect(0, 0, spriteElement.width, spriteElement.height);
					newContext.globalCompositeOperation = 'destination-out';
					newContext.fillRect(0, Math.max(0, actualHeight - topYPixel), newCanvas.width, Math.min(newCanvas.height, Math.max(0, (canvasHeight - actualHeight) - Math.max(actualHeight, topYPixel))));
					newContext.globalCompositeOperation = 'source-over';

					context.translate((object.x - camera.x) * (level.tileSize - 1) + level.tileSize/2, yTranslation);
					context.scale(object.mirror ? -1 : 1, 1);
					context.rotate(object.angle * Math.PI/180);

					context.drawImage(newCanvas, ((object.animationFrame << 0) * object.sprite.width + object.sprite.x) * level.tileSize, object.sprite.y * object.sprite.height * level.tileSize,
						object.sprite.width * level.tileSize, object.sprite.height * level.tileSize, (-object.sprite.width * object.sprite.centerX * object.sprite.scaleX + object.sprite.offsetX) * level.tileSize * camera.zoomLevel,
						yAboveCenter, object.sprite.width * level.tileSize * camera.zoomLevel * object.sprite.scaleX, yHeight);

					context.rotate(-object.angle * Math.PI/180);
					context.scale(object.mirror ? -1 : 1, 1);
					context.translate(-((object.x - camera.x) * (tileSize - 1) + tileSize/2), -yTranslation);
				}
			}
		}
	}

	for (var i=0; i<renderOverUI.length; i++) {
		let obj = renderOverUI[i];
		if (obj instanceof ShapeFadeParticle) {
			switch(obj.shape) {
				case 'rect':
					// shapeData: [width, height]
					let rectX = obj.x * (tileSize - 1) + tileSize/2;
					let rectY = obj.y * (tileSize - 1) + tileSize/2;
					let rectWidth = obj.shapeData[0] * tileSize;
					let rectHeight = obj.shapeData[1] * tileSize;
					context.translate(rectX, rectY);
					context.rotate(toRadians(obj.angle));
					context.lineWidth = 1;
					context.fillStyle = obj.color;
					context.strokeStyle = obj.outlineColor;
					context.globalAlpha = obj.opacity;
					context.beginPath();
					context.rect(0, 0, rectWidth, rectHeight);
					context.fill();
					context.stroke();
					context.closePath();
					context.globalAlpha = 1;
					context.rotate(toRadians(-obj.angle));
					context.translate(-rectX, -rectY);
					break;
			}
		}
	}

	if (!level.clickedPlay && level.factions['player'] && level.factions['player'][0]) {
		let found = 0;
		for (var childIndex in level.factions['player'][0].parent.children) {
			let child = level.factions['player'][0].parent.children[childIndex];
			if (level.sprites[child.sprite.name]) {
				found++;
			}
		}

		if (found == Object.keys(level.factions['player'][0].parent.children).length) {
			for (var childIndex in level.factions['player'][0].parent.children) {
				let child = level.factions['player'][0].parent.children[childIndex];
				if (level.sprites[child.sprite.name]) {
					child.opacity = 1 + level.playButtonAlpha;
				}
			}

			level.playButtonAlpha = Math.min(1, 0.007 + level.playButtonAlpha);
			context.fillStyle = 'rgba(255, 255, 255, ' + level.playButtonAlpha + ')';

			context.font = '24px Georgia';
			context.textAlign = 'center';
			context.textBaseline = 'top';
			context.fillText('Click anywhere to play', window.innerWidth/2, window.innerHeight/1.4);
		}
	}

	if (level.gameState == 13) {
		context.fillStyle = 'rgba(40, 40, 40, ' + level.winScreenAlpha + ')';
		context.fillRect(0, 0, canvasWidth, canvasHeight);
		context.fillStyle = 'rgba(255, 255, 255, ' + level.winScreenAlpha + ')';
		context.font = '48px Georgia';
		context.textAlign = 'center';
		context.textBaseline = 'top';
		context.fillText('YOU WIN', canvasWidth/2, canvasHeight/2);
		context.font = '24px Georgia';
		context.fillText('Thanks for playing!', canvasWidth/2, canvasHeight/2 + 64);
		level.winScreenAlpha += 0.01;
	} else if (level.factions['player'] && level.factions['player'][0].parent.hp <= 0) {
		context.fillStyle = 'rgba(160, 30, 20, ' + level.deadScreenAlpha + ')';
		context.fillRect(0, 0, canvasWidth, canvasHeight);
		context.fillStyle = 'rgba(255, 255, 255, ' + (level.deadScreenAlpha * 2) + ')';
		context.font = '48px Georgia';
		context.textAlign = 'center';
		context.textBaseline = 'top';
		context.fillText('YOU DIED', canvasWidth/2, canvasHeight/2);
		context.font = '24px Georgia';
		context.fillText('Press \'R\' to resurrect!', canvasWidth/2, canvasHeight/2 + 64);
		level.deadScreenAlpha = Math.min(0.6, level.deadScreenAlpha + 0.01);
	}

	context.rotate(-shakeRot * Math.PI/180);
	context.translate(-shakeX, -shakeY);
}

let totalTimeUnloaded = 0;
let mostRecentUnload = null;
document.addEventListener('visibilitychange', function () {
	if (document.visibilityState === 'visible' && mostRecentUnload) {
		totalTimeUnloaded += (new Date().getTime() - mostRecentUnload.getTime());
		mostRecentUnload = null;
	} else if (document.visibilityState === 'hidden' && !mostRecentUnload) {
		mostRecentUnload = new Date();
	}
});


function gameLoop(game) {
	tick(game);
	for (var i=0; i<game.screens.length; i++) {
		if (game.timeSinceStart() - totalTimeUnloaded >= (1000/game.ticksPerSecond) * game.tickID) {
			if (!game.screens[i].level.levelEditor) {
				game.screens[i].tick();
			}
			
			renderScreen(game.screens[i]);
			game.tickID++;
		}
	}

	window.requestAnimationFrame(function() {gameLoop(game);});
}

function start(game) {
	game.setStartTime();
	window.requestAnimationFrame(function() {gameLoop(game);});
}

function launchExample() {
	let game = new Game();
	game.lastMouseX = 0;
	game.lastMouseY = 0;
	addInputs(game.inputs);
	preventContextMenu();

	loadLevel('example.lvl', function(level) {
		let canvas = document.createElement('canvas');
		canvas.classList.add('screenCanvas');
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		document.body.appendChild(canvas);
		let context = canvas.getContext('2d');
		context.imageSmoothingEnabled = false;
		context.mozImageSmoothingEnabled = false;
		context.webkitImageSmoothingEnabled = false;

		let newScreen = new Screen(canvas, context, 0, 0, 1, 1, level, new Camera(0, -35, 0, canvas.width/canvas.height, 1), []);
		game.screens.push(newScreen);
		//addMouseWheelListener(function(sign) {game.screens[0].camera.zoom(sign, game.screens[0].camera.x + (canvas.width/level.tileSize)/2, game.screens[0].camera.y + (canvas.height/level.tileSize)/2);});

		level.screen = newScreen;

		addKeyDownListener(function(which) {
			if (level.factions['player']) {
				if (level.factions['player'][0].parent.hp > 0) {
					switch(which) {
						case 'KeyQ':
							for (var i=0; i<newScreen.ui.length; i++) {
								let element = newScreen.ui[i];
								if (element instanceof Ability && element.owner && !element.movingToSlot && element.slot == 0 && !element.ultimate) {
									element.onClick(level, game.lastMouseX, game.lastMouseY);
								}
							}
							break;
						case 'KeyW':
							for (var i=0; i<newScreen.ui.length; i++) {
								let element = newScreen.ui[i];
								if (element instanceof Ability && element.owner && !element.movingToSlot && element.slot == 1 && !element.ultimate) {
									element.onClick(level, game.lastMouseX, game.lastMouseY);
								}
							}
							break;
						case 'KeyE':
							for (var i=0; i<newScreen.ui.length; i++) {
								let element = newScreen.ui[i];
								if (element instanceof Ability && element.owner && !element.movingToSlot && element.slot == 2 && !element.ultimate) {
									element.onClick(level, game.lastMouseX, game.lastMouseY);
								}
							}
							break;
						case 'KeyR':
							for (var i=0; i<newScreen.ui.length; i++) {
								let element = newScreen.ui[i];
								if (element instanceof Ability && element.owner && !element.movingToSlot && element.slot == 0 && element.ultimate) {
									element.onClick(level, game.lastMouseX, game.lastMouseY);
								}
							}
							break;
					}
				} else {
					if (level.deadScreenAlpha > 0.35 && which == 'KeyR') {
						level.deadScreenAlpha = 0;
						level.factions['player'][0].parent.hp = level.factions['player'][0].parent.hpTotal;
						level.runFreezeCounter = true;
					}
				}
			}
		});

		addMouseDownListener(function(which, x, y) {
			game.lastMouseX = x;
			game.lastMouseY = y;

			let tileSpaceX = (x - level.tileSize/2) / (level.tileSize - 1);
			let tileSpaceY = (y - level.tileSize/2) / (level.tileSize - 1);

			switch(which) {
				case 1:
					if (level.acceptText) {
						level.resolveText();
					} else {
						let clicked = false;
						for (var i=0; i<newScreen.ui.length; i++) {
							let element = newScreen.ui[i];
							if (element instanceof UIButton && element.isInside(x, y)) {
								element.onClick(level, game.lastMouseX, game.lastMouseY);
								clicked = true;
								break;
							}
						}

						if (!clicked) {
							if (level.holdingAbility && !level.isFrozen()) {
								switch(level.holdingAbility.targeting) {
									case 'unit':
										let snapTileDistance = 0.5;
										let found = false;
										for (var faction in level.factions) {
											if (faction != 'player') {
												for (var i=0; i<level.factions[faction].length; i++) {
													if (level.factions[faction][i].checkBoundingBoxCollision(level, tileSpaceX - snapTileDistance, tileSpaceY - snapTileDistance,
														tileSpaceX + snapTileDistance, tileSpaceY + snapTileDistance)) {

														level.holdingAbility.selecting = false;
														level.holdingAbility.activated = true;
														level.holdingAbility.cooldownCounter = level.holdingAbility.getCooldownWithModifiers();
														level.holdingAbility.owner.activeAbilities.push(level.holdingAbility);
														level.holdingAbility.targetedAt = level.factions[faction][i];
														level.holdingAbility = null;
														break;
													}
												}
											}

											if (found) {
												break;
											}
										}
										break;
									case 'area':
										level.holdingAbility.selecting = false;
										level.holdingAbility.activated = true;
										level.holdingAbility.cooldownCounter = level.holdingAbility.getCooldownWithModifiers();
										level.holdingAbility.owner.activeAbilities.push(level.holdingAbility);
										level.holdingAbility = null;
										break;
									case 'point':
										break;
								}
							}
						}
					}
					break;
				case 3:
					if (level.holdingAbility) {
						level.holdingAbility.selecting = false;
						level.holdingAbility.onEnd(level);
						level.holdingAbility.cooldownCounter = 0;
						level.holdingAbility = null;
					}
					break;
			}
		});

		addMouseMoveListener(function(x, y) {
			game.lastMouseX = x;
			game.lastMouseY = y;

			let tileSpaceX = (x - level.tileSize/2) / (level.tileSize - 1);
			let tileSpaceY = (y - level.tileSize/2) / (level.tileSize - 1);

			if (level.holdingAbility && level.holdingAbility.targeting == 'area') {
				level.setObjectXY(level.holdingAbility.mouseFollowObject, tileSpaceX, tileSpaceY);
			}

			for (var i=0; i<newScreen.ui.length; i++) {
				let element = newScreen.ui[i];
				if (element.isInside(x, y)) {
					element.hover();
				} else {
					element.unhover();
				}
			}
		});

		let roundedHalfCanvasWidth = (canvas.width/2) << 0;

		let slot0UI = new UIElement(roundedHalfCanvasWidth - 68, canvas.height - 92, null);
		slot0UI.slot = 0;
		let slot1UI = new UIElement(roundedHalfCanvasWidth + 23, canvas.height - 92, null);
		slot1UI.slot = 1;
		let slot2UI = new UIElement(roundedHalfCanvasWidth + 114, canvas.height - 92, null);
		slot2UI.slot = 2;
		game.screens[0].ui.push(slot0UI);
		game.screens[0].ui.push(slot1UI);
		game.screens[0].ui.push(slot2UI);
		let promise = loadSprite('bottombarbasicslot.png', 1);
		if (promise) {
			promise.then(function(imageData) {
				if (imageData) {
					slot0UI.width = imageData[1].width;
					slot0UI.height = imageData[1].height;
					slot0UI.img = imageData[1];
					slot1UI.width = imageData[1].width;
					slot1UI.height = imageData[1].height;
					slot1UI.img = imageData[1];
					slot2UI.width = imageData[1].width;
					slot2UI.height = imageData[1].height;
					slot2UI.img = imageData[1];
				}
			});
		}

		let ultimateSlotUI = new UIElement(roundedHalfCanvasWidth + 205, canvas.height - 109, null);
		ultimateSlotUI.slot = 0;
		ultimateSlotUI.ultimate = true;
		game.screens[0].ui.push(ultimateSlotUI);
		promise = loadSprite('bottombarultimateslot.png', 1);
		if (promise) {
			promise.then(function(imageData) {
				if (imageData) {
					ultimateSlotUI.width = imageData[1].width;
					ultimateSlotUI.height = imageData[1].height;
					ultimateSlotUI.img = imageData[1];
				}
			});
		}

		let bottomBarUI = new UIElement(0, 0, null);
		game.screens[0].ui.push(bottomBarUI)
		promise = loadSprite('bottombar.png', 1);
		if (promise) {
			promise.then(function(imageData) {
				if (imageData) {
					bottomBarUI.x = roundedHalfCanvasWidth - (imageData[1].width/2 << 0);
					bottomBarUI.y = canvas.height - imageData[1].height;
					bottomBarUI.width = imageData[1].width;
					bottomBarUI.height = imageData[1].height;
					bottomBarUI.img = imageData[1];
				}
			});
		}

		let playerHealthBarUI = new UIElement(0, canvas.height - 146, null);
		playerHealthBarUI.renderPlayerHealth = true;
		game.screens[0].ui.push(playerHealthBarUI);
		promise = loadSprite('bottombarplayerhealth.png', 1);
		if (promise) {
			promise.then(function(imageData) {
				if (imageData) {
					playerHealthBarUI.x = roundedHalfCanvasWidth - (imageData[1].width/2 << 0);
					playerHealthBarUI.width = imageData[1].width;
					playerHealthBarUI.height = imageData[1].height;
					playerHealthBarUI.img = imageData[1];
				}
			});
		}

		let bottomBarQ = new UIElement(roundedHalfCanvasWidth - 75, canvas.height - 99, null);
		game.screens[0].ui.push(bottomBarQ);
		promise = loadSprite('bottombarq.png', 1);
		if (promise) {
			promise.then(function(imageData) {
				if (imageData) {
					bottomBarQ.width = imageData[1].width;
					bottomBarQ.height = imageData[1].height;
					bottomBarQ.img = imageData[1];
				}
			});
		}

		let bottomBarW = new UIElement(roundedHalfCanvasWidth + 16, canvas.height - 99, null);
		game.screens[0].ui.push(bottomBarW);
		promise = loadSprite('bottombarw.png', 1);
		if (promise) {
			promise.then(function(imageData) {
				if (imageData) {
					bottomBarW.width = imageData[1].width;
					bottomBarW.height = imageData[1].height;
					bottomBarW.img = imageData[1];
				}
			});
		}

		let bottomBarE = new UIElement(roundedHalfCanvasWidth + 107, canvas.height - 99, null);
		game.screens[0].ui.push(bottomBarE);
		promise = loadSprite('bottombare.png', 1);
		if (promise) {
			promise.then(function(imageData) {
				if (imageData) {
					bottomBarE.width = imageData[1].width;
					bottomBarE.height = imageData[1].height;
					bottomBarE.img = imageData[1];
				}
			});
		}

		let bottomBarR = new UIElement(roundedHalfCanvasWidth + 198, canvas.height - 116, null);
		game.screens[0].ui.push(bottomBarR);
		promise = loadSprite('bottombarr.png', 1);
		if (promise) {
			promise.then(function(imageData) {
				if (imageData) {
					bottomBarR.width = imageData[1].width;
					bottomBarR.height = imageData[1].height;
					bottomBarR.img = imageData[1];
				}
			});
		}

		let attackDamageUI = new UIElement(roundedHalfCanvasWidth - 203, canvas.height - 107, null);
		attackDamageUI.renderAttackDamage = true;
		game.screens[0].ui.push(attackDamageUI);
		promise = loadSprite('bottombarattack.png', 1);
		if (promise) {
			promise.then(function(imageData) {
				if (imageData) {
					attackDamageUI.width = imageData[1].width;
					attackDamageUI.height = imageData[1].height;
					attackDamageUI.img = imageData[1];
				}
			});
		}

		let cooldownReductionUI = new UIElement(roundedHalfCanvasWidth - 306, canvas.height - 54, null);
		cooldownReductionUI.renderCooldownReduction = true;
		game.screens[0].ui.push(cooldownReductionUI);
		promise = loadSprite('bottombarcdr.png', 1);
		if (promise) {
			promise.then(function(imageData) {
				if (imageData) {
					cooldownReductionUI.width = imageData[1].width;
					cooldownReductionUI.height = imageData[1].height;
					cooldownReductionUI.img = imageData[1];
				}
			});
		}

		let spellAmplificationUI = new UIElement(roundedHalfCanvasWidth - 306, canvas.height - 107, null);
		spellAmplificationUI.renderSpellAmplification = true;
		game.screens[0].ui.push(spellAmplificationUI);
		promise = loadSprite('bottombarspellamp.png', 1);
		if (promise) {
			promise.then(function(imageData) {
				if (imageData) {
					spellAmplificationUI.width = imageData[1].width;
					spellAmplificationUI.height = imageData[1].height;
					spellAmplificationUI.img = imageData[1];
				}
			});
		}

		let attackSpeedUI = new UIElement(roundedHalfCanvasWidth - 203, canvas.height - 54, null);
		attackSpeedUI.renderAttackSpeed = true;
		game.screens[0].ui.push(attackSpeedUI);
		promise = loadSprite('bottombarattackspeed.png', 1);
		if (promise) {
			promise.then(function(imageData) {
				if (imageData) {
					attackSpeedUI.width = imageData[1].width;
					attackSpeedUI.height = imageData[1].height;
					attackSpeedUI.img = imageData[1];
				}
			});
		}

		start(game);
	});
}