class HeadChildObject extends ChildObject {
	constructor(x, y, sprite, angle, animationSpeed, collideable, playable, attackable, speed, opacity, parent, linkages) {
		super(x, y, sprite, angle, animationSpeed, collideable, playable, attackable, speed, opacity, parent, linkages);
	}

	getShadowBoundingBox(level) {
		if (this.parent.headDetached) {
			if (level.sprites[this.sprite.name]) {
				let spriteData = level.sprites[this.sprite.name];
				return [(spriteData.leftPixel/level.tileSize - this.sprite.centerX * this.sprite.width) * this.sprite.scaleX,
							(spriteData.rightPixel/level.tileSize - this.sprite.centerX * this.sprite.width) * this.sprite.scaleX,
							(spriteData.topPixel/level.tileSize - this.sprite.centerY * this.sprite.height) * this.sprite.scaleY,
							(spriteData.bottomPixel/level.tileSize - this.sprite.centerY * this.sprite.height) * this.sprite.scaleY];
			} else {
				return super.getShadowBoundingBox(level);
			}
		} else {
			return super.getShadowBoundingBox(level);
		}
	}
}

class KnightObject extends MobCompositeObject {
	constructor(boss, x, y) {
		// x, y, sprite, angle, animationSpeed, collideable, playable, speed, opacity
		// name, x, y, width, height, frames, centerX, centerY
		let head = new HeadChildObject(x, y, new Sprite('knighthead_2_2.png', 0, 0, 2, 2, 1, 0.484375, 0.171875), 0, 0, false, false, false, 0, 1, null, []);
		let rightPauldron = new ChildObject(x, y, new Sprite('knightrightpauldron_2_2.png', 0, 0, 2, 2, 1, 0.421875, 0.328125), 0, 0, false, false, false, 0, 1, null, []);
		let leftLeg = new ChildObject(x, y, new Sprite('knightleftleg_2_2.png', 0, 0, 2, 2, 1, 0.546875, 0.6875), 0, 0, false, false, false, 0, 1, null, []);
		let rightLeg = new ChildObject(x, y, new Sprite('knightrightleg_2_2.png', 0, 0, 2, 2, 1, 0.421875, 0.6875), 0, 0, false, false, false, 0, 1, null, []);
		let sword = new ChildObject(x, y, new Sprite('knightsword_2_2.png', 0, 0, 2, 2, 1, 0.375, 0.625), 0, 0, false, false, false, 0, 1, null, []);
		let rightArm = new ChildObject(x, y, new Sprite('knightrightarm_2_2.png', 0, 0, 2, 2, 1, 0.34375, 0.34375), 0, 0, false, false, false, 0, 1, null, [sword]);
		let torso = new ChildObject(x, y, new Sprite('knighttorso_2_2.png', 0, 0, 2, 2, 1, 0.484375, 0.640625), 0, 0, true, false, true, 0, 1, null, [rightArm, rightLeg, leftLeg, rightPauldron, head]);

		sword.arcPoint = [1.5, 0.5];
		sword.arcSize = 1.5;

		super({'leftLeg': leftLeg, 'rightLeg': rightLeg, 'torso': torso, 'sword': sword, 'rightArm': rightArm, 'rightPauldron': rightPauldron, 'head': head}, torso, 0.06, 200);

		this.name = 'Thrall';
		this.attackDamage = 7;
		this.aggroRange = 100;
		this.attackRange = 1;
		this.headAttackRadius = 1.5;

		this.swingSpeed = this.speed * 50;
		this.timeUntilHeadDetach = 300;
		this.timeBeforeDetach = 30;
		this.headRiseTime = 45;
		this.headHoverDistance = -0.25;
		this.headHoverTime = 15;
		this.headSpeed = 0.45;
		this.headChargeCooldown = 90;
		this.attackWindUpTime = 50;
		this.attackHoldTime = 10;
		this.attackSwingTime = 60;
		this.attackWindUpBodyAngle = -10;
		this.attackWindUpRightArmAngle = -90;
		this.attackSwingBodyAngle = 20;
		this.attackSwingRightArmAngle = 10;
		this.attackSwingSwordAngle = 80;
		this.headFollowTime = 180;
		this.headCrashedTime = 180;

		this.base.faction = 'enemy';
		this.boss = boss;
		this.legDirection = true;
		this.stomped = false;
		this.headDetached = false;
		this.headState = 'idle';
		this.headStateCounter = 0;
		this.headTargetX = 0;
		this.headTargetY = 0;
		this.headDetachCounter = 0;
	}

	die(level) {
		super.die(level);

		if (level.gameState == 10) {
			level.runFreezeCounter = false;

			let centerX = (window.innerWidth/2) / ((level.tileSize - 1) * level.screen.camera.zoomLevel) + level.screen.camera.x - 0.5;
			let centerY = (window.innerHeight/2.4) / ((level.tileSize - 1) * level.screen.camera.zoomLevel) + level.screen.camera.y - 0.5;

			let lich = new LichObject(false, centerX, centerY);
			lich.base.faction = null;
			lich.setMirror(this, level.factions['player'][0].x < centerX);
			level.addObject(lich);

			if (level.factions['player']) {
				for (var i=0; i<level.factions['player'].length; i++) {
					if (level.factions['player'][i].parent && level.factions['player'][i].parent instanceof SnakeMage) {
						let snake = level.factions['player'][i].parent;
						snake.damage(level, snake.hp);
					}
				}
			}

			level.abilitiesForNextFreezeOffering++;
			level.gameState++;
		}
	}

	processTick(level) {
		super.processTick(level);

		let rightPauldron = this.children['rightPauldron'];
		let leftLeg = this.children['leftLeg'];
		let rightLeg = this.children['rightLeg'];
		let sword = this.children['sword'];
		let rightArm = this.children['rightArm'];
		let head = this.children['head'];

		if (this.hp > 0) {
			if (!this.headDetached && this.headDetachCounter > this.timeUntilHeadDetach && (this.state == 'idle' || this.state == 'movingToAttack')) {
				rightLeg.setRotationAndLinkages(level, 0);
				leftLeg.setRotationAndLinkages(level, 0);
				rightArm.setRotationAndLinkages(level, 0);
				this.legDirection = true;

				this.changeState(level, 'beforeDetach');
			}

			if (this.headDetached) {
				this.headStateCounter++;

				switch(this.headState) {
					case 'idle':
						if (this.headStateCounter > this.headChargeCooldown) {
							this.headStateCounter = 0;
							this.headState = 'headFollow';
						}
						break;
					case 'headFollow':
						if (this.attackTarget) {
							head.angle = getAngle(head.x, head.y, this.attackTarget.x, this.attackTarget.y);
							if (head.mirror) {
								head.angle = mirrorAngle(head.angle);
							}

							let tempAngle = ((head.angle % 360) + (head.angle < 0 ? 360 : 0));
							if (tempAngle > 90 && tempAngle < 270) {
								head.angle = mirrorAngle(head.angle);
								head.mirror = !head.mirror;
							}
							
							if (this.headStateCounter > this.headFollowTime) {
								this.headTargetX = this.attackTarget.x;
								this.headTargetY = this.attackTarget.y;

								this.headStateCounter = 0;
								this.headState = 'charging';
							}
						} else {
							this.headStateCounter = 0;
						}
						break;
					case 'charging':
						let headAngle = toRadians(head.mirror ? mirrorAngle(head.angle) : head.angle);
						level.translateObject(head, this.headSpeed * Math.cos(headAngle), this.headSpeed * Math.sin(headAngle));

						let headDistanceToTarget = getDistance(head.x, head.y, this.headTargetX, this.headTargetY);
						head.sprite.offsetY -= head.sprite.offsetY * (this.headSpeed / Math.max(this.headSpeed, headDistanceToTarget));
						if (headDistanceToTarget <= this.headSpeed * 2) {
							head.sprite.offsetY = 0;
							level.addObject(new ShapeFadeParticle('ellipse', [this.headAttackRadius, 3 * this.headAttackRadius * (11/level.tileSize)], 'rgba(200, 200, 200, 0.75)', 'rgba(255, 255, 255, 1)',
								head.x, level.sprites[head.sprite.name].bottomPixel/level.tileSize - head.sprite.centerY + head.y - 1/level.tileSize, 0, 1, 0, 0, 0, 0, 0, 25, 1));

							for (var faction in level.factions) {
								if (faction != head.faction) {
									for (var i=0; i<level.factions[faction].length; i++) {
										let potentialTarget = level.factions[faction][i];
										let dist = getDistance(head.x, head.y, potentialTarget.x, potentialTarget.y);
										if (dist <= this.headAttackRadius) {
											potentialTarget.damage(level, this.attackDamage);
										}
									}
								}
							}

							this.headStateCounter = 0;
							this.headState = 'crashed';
						}
						break;
					case 'crashed':
						if (this.headStateCounter > this.headCrashedTime) {
							this.headStateCounter = 0;
							this.headState = 'rise';
						}
						break;
					case 'rise':
						head.angle *= 0.95;

						let riseSpeed = 3 * (this.headHoverDistance / this.headRiseTime);
						head.sprite.offsetY += riseSpeed;

						if (this.headStateCounter > this.headRiseTime) {
							head.angle = 0;
							this.headStateCounter = 0;
							this.headState = 'idle';
						}
						break;
				}
			} else {
				this.headDetachCounter++;
			}

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
								}
							}
						}
					}

					if (this.attackTarget) {
						this.setMirror(level, this.attackTarget.x < this.base.x);

						this.changeState(level, 'movingToAttack');
					}
					break;
				case 'movingToAttack':
					if (this.attackTarget) {
						let dist = getDistance(this.base.x, this.base.y, this.attackTarget.x, this.attackTarget.y);
						if (dist > this.attackRange) {
							let move = findPath(this.base, level.getCollideable(this.base, this.base.bias, this.base.bias, 2, 2), this.base.x, this.base.y, this.attackTarget.x, this.attackTarget.y);
							this.base.translateAndLinkages(level, this.speed * move[0], this.speed * move[1]);

							if (move[0] < 0) {
								this.setMirror(level, true);
							} else {
								this.setMirror(level, false);
							}

							rightLeg.rotateAndLinkages(level, this.legDirection ? this.swingSpeed : -this.swingSpeed);
							leftLeg.rotateAndLinkages(level, this.legDirection ? -this.swingSpeed : this.swingSpeed);
							rightArm.rotateAndLinkages(level, this.legDirection ? -this.swingSpeed/3 : this.swingSpeed/3);

							if (Math.abs(rightLeg.angle) > 60) {
								this.legDirection = !this.legDirection;
							}

							let player = level.factions['player'][0];
							if (!this.stomped && Math.abs(rightLeg.angle) < 5) {
								let distanceToPlayer = getDistance(this.base.x, this.base.y, player.x, player.y);
								if (distanceToPlayer > 12) {
									level.setScreenShake(0.05);
								} else if (distanceToPlayer > 7) {
									level.setScreenShake(0.1);
								} else if (distanceToPlayer > 2.5) {
									level.setScreenShake(0.2);
								} else {
									level.setScreenShake(0.3);
								}
								this.stomped = true;
							} else {
								this.stomped = false;
							}
						} else {
							rightLeg.setRotationAndLinkages(level, 0);
							leftLeg.setRotationAndLinkages(level, 0);
							rightArm.setRotationAndLinkages(level, 0);
							this.legDirection = true;

							this.changeState(level, 'attackWindUp');
						}
					} else {
						this.changeState(level, 'idle');
					}
					break;
				case 'attackWindUp':
					let percentageWindUp = this.stateCounter / this.attackWindUpTime;
					this.base.setRotationAndLinkages(level, this.attackWindUpBodyAngle * percentageWindUp);
					rightArm.setRotationAndLinkages(level, this.attackWindUpRightArmAngle * percentageWindUp);

					if (this.stateCounter > this.attackWindUpTime) {
						this.changeState(level, 'attackHold');
					}
					break;
				case 'attackHold':
					if (this.stateCounter > this.attackHoldTime) {
						let weaponArcStart = sword.getArcPoint();

						rightArm.setRotationAndLinkages(level, 0);
						this.base.setRotationAndLinkages(level, this.attackSwingBodyAngle);
						rightArm.setRotationAndLinkages(level, this.attackSwingRightArmAngle);
						sword.setRotationAndLinkages(level, this.attackSwingSwordAngle);

						let weaponArcEnd = sword.getArcPoint();
						level.addObject(new EnemyWeaponSwingParticle(level, this.attackDamage, weaponArcStart, weaponArcEnd, [rightArm.x, rightArm.y], sword.arcSize, sword.mirror,
							'rgba(210, 210, 210, 1)', 1, 0, 0, 0, 0, 0, this.attackSwingTime, 2));

						this.changeState(level, 'attackSwing');
					}
					break;
				case 'attackSwing':
					if (this.stateCounter > this.attackSwingTime) {
						sword.setRotationAndLinkages(level, 0);
						rightArm.setRotationAndLinkages(level, 0);
						this.base.setRotationAndLinkages(level, 0);

						this.changeState(level, 'idle');
					}
					break;
				case 'beforeDetach':
					if (this.stateCounter > this.timeBeforeDetach) {
						this.changeState(level, 'headRise');
					}
					break;
				case 'headRise':
					let riseSpeed = this.headHoverDistance / this.headRiseTime;
					this.base.translateLinkageAndCalibrate(level, head, 0, riseSpeed);

					if (this.stateCounter > this.headRiseTime) {
						this.changeState(level, 'headHover');
					}
					break;
				case 'headHover':
					if (this.stateCounter > this.headHoverTime) {
						this.base.removeLinkage(head);
						head.dontTranslateUponMirror = true;
						head.attackable = true;
						head.collideable = true;
						level.addToFaction(head, 'enemy');

						let headDistanceFromFeet = head.sprite.height * (62/64) - this.headHoverDistance;
						level.translateObject(head, 0, headDistanceFromFeet);
						head.sprite.offsetY = -headDistanceFromFeet;
						this.headDetached = true;

						this.changeState(level, 'idle');
					}
					break;
			}
		}
	}

	getRenderOrder() {
		if (this.headDetached) {
			return [this.children['leftLeg'], this.children['rightLeg'], this.children['torso'], this.children['sword'], this.children['rightArm'], this.children['rightPauldron'], this.children['head']];
		}

		return [this.children['leftLeg'], this.children['rightLeg'], this.children['torso'], this.children['head'], this.children['sword'], this.children['rightArm'], this.children['rightPauldron']];
	}

	getShadowBoundingBox(level, caller) {
		let shadowData = super.getShadowBoundingBox(level, caller);

		if (shadowData) {
			shadowData[0] -= 0.3;
			shadowData[1] -= 0.175;
			shadowData[3] = (level.sprites[this.children['rightLeg'].sprite.name].bottomPixel/level.tileSize - this.children['rightLeg'].sprite.centerY * this.children['rightLeg'].sprite.height) * this.base.sprite.scaleY + 0.03;
		}

		return shadowData;
	}
}