class WolfObject extends MobCompositeObject {
	constructor(boss, x, y) {
		// x, y, sprite, angle, animationSpeed, collideable, playable, speed, opacity
		// name, x, y, width, height, frames, centerX, centerY
		let backRightLeg = new ChildObject(x, y, new Sprite('wolfbackrightleg_3_2.png', 0, 0, 3, 2, 1, 0.375, 0.390625), 0, 0, true, false, false, 0, 1, null, []);
		let backLeftLeg = new ChildObject(x, y, new Sprite('wolfbackleftleg_3_2.png', 0, 0, 3, 2, 1, 0.4792, 0.390625), 0, 0, false, false, false, 0, 1, null, []);
		let frontRightLeg = new ChildObject(x, y, new Sprite('wolffrontrightleg_3_2.png', 0, 0, 3, 2, 1, 0.7083, 0.453125), 0, 0, true, false, false, 0, 1, null, []);
		let frontLeftLeg = new ChildObject(x, y, new Sprite('wolffrontleftleg_3_2.png', 0, 0, 3, 2, 1, 0.8125, 0.453125), 0, 0, false, false, false, 0, 1, null, []);
		let head = new ChildObject(x, y, new Sprite('wolfhead_3_2.png', 0, 0, 3, 2, 1, 0.8021, 0.390625), 0, 0, false, false, false, 0, 1, null, []);
		let torso = new ChildObject(x, y, new Sprite('wolftorso_3_2.png', 0, 0, 3, 2, 1, 0.3958, 0.328125), 0, 0, true, false, true, 0, 1, null, [head, frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg]);

		frontRightLeg.arcPoint = [2, 1];
		frontRightLeg.arcSize = 1.6;

		super({'backLeftLeg': backLeftLeg, 'frontLeftLeg': frontLeftLeg, 'torso': torso, 'head': head, 'backRightLeg': backRightLeg, 'frontRightLeg': frontRightLeg}, torso, 0.04, 60);

		this.name = 'Panther';
		this.attackDamage = 5;

		this.jumpCooldown = 30;
		this.jumpPrepareTime = 20;
		this.prepareHoldTime = 5;
		this.jumpHeight = 3;
		this.jumpSpeed = 0.25;

		this.bodyRotationDownOnJump = 10;
		this.bodyRotationUpOnJump = -30;
		this.frontLegsTranslateOnJump = 0.1;
		this.jump1Angle = 30;
		this.jump2Angle = -45;
		this.distanceToLandBehind = 2;
		this.attackWindUpTime = 60;
		this.bodyRotationOnAttack = -35;
		this.frontRightLegRotationOnAttack = -120;
		this.frontRightLegTranslateOnAttack = 0.3;
		this.attackHoldTime = 10;
		this.attackSwingTime = 60;
		this.attackReleaseTime = 30;

		this.base.faction = 'enemy';
		this.boss = boss;
		this.jumpCounter = 0;
		this.jumpTargetX = 0;
		this.jumpTargetY = 0;
		this.jumpTargetAngle = 0;
		this.currentJumpHeightCounter = 0;
		this.timeToLand = 0;
	}

	damage(level, dmg) {
		let dead = super.damage(level, dmg);

		if (level.anotherWolf && this.hp <= this.hpTotal*0.4) {
			level.addObject(new WolfObject(false, window.innerWidth / ((level.tileSize - 1) * level.screen.camera.zoomLevel) + level.screen.camera.x - 0.5 + 3, this.base.y));
			level.anotherWolf = false;
		}

		return dead;
	}

	die(level) {
		super.die(level);

		let found = false;
		if (level.factions['enemy']) {
			for (var i=0; i<level.factions['enemy'].length; i++) {
				if (level.factions['enemy'][i].parent && level.factions['enemy'][i].parent instanceof WolfObject) {
					found = true;
					break;
				}
			}
		}

		if (!level.anotherWolf && !found) {
			level.abilitiesForNextFreezeOffering++;
			level.addObject(new KnightObject(false, this.base.x, window.innerHeight / ((level.tileSize - 1) * level.screen.camera.zoomLevel) + level.screen.camera.y - 0.5 + 3));
		}
	}

	processTick(level) {
		super.processTick(level);

		let backRightLeg = this.children['backRightLeg'];
		let backLeftLeg = this.children['backLeftLeg'];
		let frontRightLeg = this.children['frontRightLeg'];
		let frontLeftLeg = this.children['frontLeftLeg'];
		let head = this.children['head'];

		if (this.hp > 0) {
			switch(this.state) {
				case 'idle':
					this.attackTarget = null;
					let leastDistance = this.aggroRange;
					for (var faction in level.factions) {
						if (faction != this.base.faction) {
							for (var i=0; i<level.factions[faction].length; i++) {
								let potentialTarget = level.factions[faction][i];
								let dist = getDistance(this.base.x, this.base.y, potentialTarget.x, potentialTarget.y);
								if (dist < leastDistance) {
									this.attackTarget = potentialTarget;
									leastDistance = dist;
									this.jumpTargetX = potentialTarget.x;
									this.jumpTargetY = potentialTarget.y;
									this.jumpTargetAngle = getAngle(this.base.x, this.base.y, potentialTarget.x, potentialTarget.y);
								}
							}
						}
					}

					if (this.attackTarget) {
						this.setMirror(level, this.attackTarget.x < this.base.x);

						if (this.stateCounter > this.jumpCooldown) {
							this.changeState(level, 'preparingJump');
						}
					}
					break;
				case 'preparingJump':
					let prepareRotateSpeed = this.bodyRotationDownOnJump / this.jumpPrepareTime;
					this.base.rotateAndLinkages(level, prepareRotateSpeed);
					frontRightLeg.rotateAndLinkages(level, prepareRotateSpeed);
					frontLeftLeg.rotateAndLinkages(level, prepareRotateSpeed);
					backRightLeg.rotateAndLinkages(level, -1.5 * prepareRotateSpeed);
					backLeftLeg.rotateAndLinkages(level, -1.5 * prepareRotateSpeed);
					head.setRotationAndLinkages(level, 0);

					if (this.attackTarget) {
						this.setMirror(level, this.attackTarget.x < this.base.x);

						this.jumpTargetX = this.attackTarget.x;
						this.jumpTargetY = this.attackTarget.y;
						this.jumpTargetAngle = getAngle(this.base.x, this.base.y, this.attackTarget.x, this.attackTarget.y);
					}

					if (this.stateCounter > this.jumpPrepareTime) {
						this.base.setRotationAndLinkages(level, this.bodyRotationDownOnJump);
						frontRightLeg.setRotationAndLinkages(level, 2*this.bodyRotationDownOnJump);
						frontLeftLeg.setRotationAndLinkages(level, 2*this.bodyRotationDownOnJump);
						backRightLeg.setRotationAndLinkages(level, -0.5*this.bodyRotationDownOnJump);
						backLeftLeg.setRotationAndLinkages(level, -0.5*this.bodyRotationDownOnJump);
						head.setRotationAndLinkages(level, 0);
						this.changeState(level, 'prepareHold');
					}
					break;
				case 'prepareHold':
					if (this.attackTarget) {
						this.setMirror(level, this.attackTarget.x < this.base.x);

						this.jumpTargetX = this.attackTarget.x;
						this.jumpTargetY = this.attackTarget.y;
						this.jumpTargetAngle = getAngle(this.base.x, this.base.y, this.attackTarget.x, this.attackTarget.y);
					}

					if (this.stateCounter > this.prepareHoldTime) {
						this.base.setRotationAndLinkages(level, this.bodyRotationUpOnJump);
						backRightLeg.setRotationAndLinkages(level, 0);
						backLeftLeg.setRotationAndLinkages(level, -this.bodyRotationUpOnJump);
						frontRightLeg.setRotationAndLinkages(level, 4*this.bodyRotationUpOnJump);
						frontLeftLeg.setRotationAndLinkages(level, 4*this.bodyRotationUpOnJump);
						this.base.translateLinkageAndCalibrate(level, frontRightLeg, this.frontLegsTranslateOnJump, 0);
						this.base.translateLinkageAndCalibrate(level, frontLeftLeg, this.frontLegsTranslateOnJump, 0);

						let distanceToTarget;
						let distanceToJump;
						switch(this.jumpCounter) {
							case 0:
								distanceToTarget = getDistance(this.jumpTargetX, this.jumpTargetY, this.base.x, this.base.y);
								distanceToJump = (distanceToTarget*0.7) * (1/Math.cos(toRadians(this.jump1Angle)));
								this.jumpTargetAngle = (this.jumpTargetAngle + this.jump1Angle) % 360;
								this.jumpTargetX = distanceToJump * Math.cos(this.jumpTargetAngle);
								this.jumpTargetY = distanceToJump * Math.sin(this.jumpTargetAngle);
								this.timeToLand = distanceToJump / this.jumpSpeed;
								break;
							case 1:
								distanceToTarget = getDistance(this.jumpTargetX, this.jumpTargetY, this.base.x, this.base.y);
								distanceToJump = 1.5 * distanceToTarget;
								this.jumpTargetAngle = (this.jumpTargetAngle + this.jump2Angle) % 360;
								this.jumpTargetX = distanceToJump * Math.cos(this.jumpTargetAngle);
								this.jumpTargetY = distanceToJump * Math.sin(this.jumpTargetAngle);
								this.timeToLand = distanceToJump / this.jumpSpeed;
								break;
							case 2:
								this.jumpTargetX += this.distanceToLandBehind * Math.cos(toRadians(this.jumpTargetAngle));
								this.jumpTargetY += this.distanceToLandBehind * Math.sin(toRadians(this.jumpTargetAngle));
								distanceToTarget = getDistance(this.jumpTargetX, this.jumpTargetY, this.base.x, this.base.y);
								this.timeToLand = distanceToTarget / this.jumpSpeed;
								break;
						}

						this.changeState(level, 'jumping');
					}
					break;
				case 'jumping':
					let jumpAngle = 0;
					this.currentJumpHeightCounter = Math.PI * (this.stateCounter / this.timeToLand);

					if (this.jumpCounter < 2 || !this.attackTarget) {
						this.base.translateAndLinkages(level, this.jumpSpeed * Math.cos(toRadians(this.jumpTargetAngle)), this.jumpSpeed * Math.sin(toRadians(this.jumpTargetAngle)));
					} else {
						let timeStepsLeft = Math.max(1, this.timeToLand - this.stateCounter);
						if (getDistance(this.base.x, this.base.y, this.attackTarget.x, this.attackTarget.y) > 1.25*this.distanceToLandBehind) {
							this.jumpTargetAngle = getAngle(this.base.x, this.base.y, this.attackTarget.x, this.attackTarget.y);
						}
						this.jumpTargetX = this.attackTarget.x + this.distanceToLandBehind * Math.cos(toRadians(this.jumpTargetAngle));
						this.jumpTargetY = this.attackTarget.y + this.distanceToLandBehind * Math.sin(toRadians(this.jumpTargetAngle));
						this.base.translateAndLinkages(level, (this.jumpTargetX - this.base.x) / timeStepsLeft, (this.jumpTargetY - this.base.y) / timeStepsLeft);
					}


					for (var childIndex in this.children) {
						this.children[childIndex].sprite.offsetY = -this.jumpHeight * Math.sin(this.currentJumpHeightCounter);
					}

					if (this.stateCounter > this.timeToLand) {
						this.changeState(level, 'landing');
					}
					break;
				case 'landing':
					this.currentJumpHeightCounter = 0;

					for (var childIndex in this.children) {
						this.children[childIndex].sprite.offsetY = 0;
					}

					this.base.translateLinkageAndCalibrate(level, frontRightLeg, -this.frontLegsTranslateOnJump, 0);
					this.base.translateLinkageAndCalibrate(level, frontLeftLeg, -this.frontLegsTranslateOnJump, 0);
					this.base.setRotationAndLinkages(level, 0);

					if (this.attackTarget) {
						if (this.jumpCounter < 2) {
							this.jumpCounter++;
							this.changeState(level, 'preparingJump');
						} else {
							this.jumpCounter = 0;
							this.base.translateLinkageAndCalibrate(level, frontRightLeg, this.frontRightLegTranslateOnAttack, 0);
							this.changeState(level, 'attackWindUp');
						}
					} else {
						this.changeState(level, 'idle');
					}
					break;
				case 'attackWindUp':
					if (this.attackTarget) {
						this.setMirror(level, this.attackTarget.x < this.base.x);
					}

					this.base.setRotationAndLinkages(level, this.bodyRotationOnAttack * (this.stateCounter / this.attackWindUpTime));
					frontRightLeg.setRotationAndLinkages(level, this.base.angle + this.frontRightLegRotationOnAttack);
					frontLeftLeg.setRotationAndLinkages(level, 0);
					backLeftLeg.setRotationAndLinkages(level, 0);
					backRightLeg.setRotationAndLinkages(level, 0);

					if (this.stateCounter > this.attackWindUpTime) {
						this.changeState(level, 'attackHold');
					}
					break;
				case 'attackHold':
					if (this.stateCounter > this.attackHoldTime) {
						let clawArcStart = frontRightLeg.getArcPoint();
						clawArcStart[1] -= 1.5;
						let clawArcEnd = [clawArcStart[0], frontRightLeg.y - (clawArcStart[1] - frontRightLeg.y)];

						this.base.setRotationAndLinkages(level, 0);
						this.base.translateLinkageAndCalibrate(level, frontRightLeg, -this.frontRightLegTranslateOnAttack, 0);
						this.base.setRotationAndLinkages(level, this.bodyRotationDownOnJump);
						frontRightLeg.setRotationAndLinkages(level, 2*this.bodyRotationDownOnJump);
						frontLeftLeg.setRotationAndLinkages(level, 2*this.bodyRotationDownOnJump);
						backRightLeg.setRotationAndLinkages(level, -0.5*this.bodyRotationDownOnJump);
						backLeftLeg.setRotationAndLinkages(level, -0.5*this.bodyRotationDownOnJump);
						head.setRotationAndLinkages(level, 0);

						level.addObject(new EnemyWeaponSwingParticle(level, this.attackDamage, clawArcStart, clawArcEnd, [frontRightLeg.x, frontRightLeg.y], frontRightLeg.arcSize, frontRightLeg.mirror,
							'rgba(210, 210, 210, 1)', 1, 0, 0, 0, 0, 0, this.attackSwingTime, 0));

						this.changeState(level, 'attackSwing');
					}
					break;
				case 'attackSwing':
					if (this.stateCounter > this.attackSwingTime) {
						this.changeState(level, 'attackRelease');
					}
					break;
				case 'attackRelease':
					let percentage = 1 - (this.stateCounter / this.attackReleaseTime);
					this.base.setRotationAndLinkages(level, this.bodyRotationDownOnJump * percentage);
					frontRightLeg.setRotationAndLinkages(level, 2*this.bodyRotationDownOnJump * percentage);
					frontLeftLeg.setRotationAndLinkages(level, 2*this.bodyRotationDownOnJump * percentage);
					backRightLeg.setRotationAndLinkages(level, -0.5*this.bodyRotationDownOnJump * percentage);
					backLeftLeg.setRotationAndLinkages(level, -0.5*this.bodyRotationDownOnJump * percentage);
					head.setRotationAndLinkages(level, 0);

					if (this.stateCounter > this.attackReleaseTime) {
						this.base.setRotationAndLinkages(level, 0);
						this.changeState(level, 'idle');
					}
					break;
			}
		}
	}

	getShadowBoundingBox(level, caller) {
		let shadowData = super.getShadowBoundingBox(level, caller);

		if (shadowData) {
			shadowData[0] += 0.1;
			shadowData[1] += 0.25;
			shadowData[3] += -0.25;

			if (this.base.angle > 0) {
				shadowData[3] += this.base.angle * 0.005;
			}
		}

		return shadowData;
	}
}