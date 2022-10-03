class LichObject extends MobCompositeObject {
	constructor(boss, x, y) {
		// x, y, sprite, angle, animationSpeed, collideable, playable, speed, opacity
		// name, x, y, width, height, frames, centerX, centerY
		let rightHand = new ChildObject(x, y, new Sprite('lichrightHand_2_2.png', 0, 0, 2, 2, 1, 0.1875, 0.625), 0, 0, false, false, false, 0, 1, null, []);
		let staff = new ChildObject(x, y, new Sprite('lichstaff_2_2.png', 0, 0, 2, 2, 1, 0.828125, 0.75), 0, 0, false, false, false, 0, 1, null, []);
		let skull = new ChildObject(x, y, new Sprite('lichskull_2_2.png', 0, 0, 2, 2, 1, 0.546875, 0.25), 0, 0, false, false, false, 0, 1, null, []);
		let torso = new ChildObject(x, y, new Sprite('lichtorso_2_2.png', 0, 0, 2, 2, 1, 0.5, 0.5), 0, 0, true, false, true, 0, 1, null, [skull, staff, rightHand]);

		super({'torso': torso, 'skull': skull, 'staff': staff, 'rightHand': rightHand}, torso, 0, 600);

		this.name = 'Lich';
		this.pentagramAttackRadius = 2.5;
		this.pentagramAttackDamage = 15;
		this.orbsPerVolley = 3;
		this.orbSpeed = 0.2;
		this.orbRadius = 0.5;
		this.orbAttackDamage = 10;

		this.chanceToDropParticle = 0.2;
		this.castSkullAngle = 20;
		this.startCastStaffAngle = 20;
		this.finishCastStaffAngle = 80;
		this.castCooldown = 90;
		this.pentagramCastTime = 140;
		this.pentagramCastSteps = 10;
		this.castPentagramEndTime = 60;
		this.pentagramCastStaffTranslateX = 0.3;
		this.pentagramCastStaffTranslateUpY = -0.3;
		this.pentagramCastStaffTranslateDownY = 0.2;
		this.orbCastTime = 140;
		this.orbCastSteps = 10;
		this.orbCastRightHandTranslateUpY = -0.5;
		this.orbCastRightHandDistance = 1.5;
		this.orbsCast = 0;
		this.orbCastStartTime = 30;
		this.orbCastEndTime = 30;
		this.orbCastHandTranslationX = 0;
		this.orbCastHandTranslationY = 0;
		this.orbCastTranslationMirror = false;
		this.orbDistanceInFrontOfHand = 1;
		this.cooldownSpeed = 1;
		this.extraTickSpeed = 0;
		this.hasSummoned = false;
		this.actuallyBattle = false;
		this.descendSpeed = 0.05;
		this.spawnHeight = -20;
		this.hoverHeight = -0.5;

		this.base.faction = 'enemy';
		skull.speakAudio = 'lich';
		this.boss = boss;

		for (var childIndex in this.children) {
			this.children[childIndex].sprite.offsetY = this.hoverHeight + this.spawnHeight;
		}

		staff.y = rightHand.y;
		torso.setSpecificCalibration(staff);
	}

	getRenderOrder() {
		if (this.state == 'throwOrb') {
			return [this.children['torso'], this.children['skull'], this.children['staff'], this.children['rightHand']];
		}

		return [this.children['torso'], this.children['skull'], this.children['rightHand'], this.children['staff']];
	}

	die(level) {
		super.die(level);

		if (level.factions['enemy']) {
			for (var i=0; i<level.factions['enemy'].length; i++) {
				if (level.factions['enemy'][i].parent && level.factions['enemy'][i].parent instanceof KnightObject) {
					level.factions['enemy'][i].parent.damage(level, level.factions['enemy'][i].parent.hp);
				}
			}
		}

		level.gameState++;
		level.runFreezeCounter = false;
	}

	damage(level, dmg) {
		let dead = super.damage(level, dmg);

		let percentHp = this.hp / this.hpTotal;
		if (percentHp < 0.7) {
			this.cooldownSpeed = 2;
		}
		if (percentHp <= 0.5 && !this.hasSummoned) {
			level.addObject(new KnightObject(false, -2, (window.innerHeight/2) / ((level.tileSize - 1) * level.screen.camera.zoomLevel) + level.screen.camera.y - 0.5));
			level.addObject(new KnightObject(false, (((window.innerWidth) / ((level.tileSize - 1) * level.screen.camera.zoomLevel) + level.screen.camera.x - 0.5) << 0) + 3,
				(window.innerHeight/2) / ((level.tileSize - 1) * level.screen.camera.zoomLevel) + level.screen.camera.y - 0.5));
			this.hasSummoned = true;
		}
		if (percentHp < 0.4) {
			this.extraTickSpeed = 0.5;
		}

		return dead;
	}

	processTick(level) {
		super.processTick(level);

		let skull = this.children['skull'];
		let staff = this.children['staff'];
		let rightHand = this.children['rightHand'];

		if (level.gameState == 9) {
			for (var childIndex in this.children) {
				this.children[childIndex].sprite.offsetY -= 0.5;
			}

			if (this.base.sprite.offsetY < this.spawnHeight) {
				level.gameState++;
				level.runFreezeCounter = true;
				level.freezeCounter = 0;
				level.tutorialString = 'Press Q or click on your new ability to use it!';
				level.notYetUsedAbility = true;
				level.removeFromMap(this);

				level.addObject(new Slime(false, level.factions['player'][0].x - 2, -1.25));
				level.addObject(new Slime(false, level.factions['player'][0].x - 1, -1.25));
				level.addObject(new Slime(false, level.factions['player'][0].x, -1.25));
				level.addObject(new Slime(false, level.factions['player'][0].x + 1, -1.25));
				level.addObject(new Slime(false, level.factions['player'][0].x + 2, -1.25));

				level.audio['music'].play();
			}
		} else if (this.base.sprite.offsetY != this.hoverHeight) {

			for (var childIndex in this.children) {
				this.children[childIndex].sprite.offsetY -= (this.children[childIndex].sprite.offsetY - this.hoverHeight) * this.descendSpeed;
			}

			if (Math.abs(this.base.sprite.offsetY - this.hoverHeight) < 0.02) {
				for (var childIndex in this.children) {
					this.children[childIndex].sprite.offsetY = this.hoverHeight;
				}

				if (level.gameState == 5) {
					level.runFreezeCounter = false;
					level.freezeCounter = 0;

					if (level.factions['player'][0].parent.state == 'idle') {
						level.factions['player'][0].parent.setMirror(level, this.base.x < level.factions['player'][0].x);
					}

					skull.speak('So, you murdered a poor baby slime in cold blood');
				} else if (level.gameState == 11) {
					if (level.factions['player'][0].parent.state == 'idle') {
						level.factions['player'][0].parent.setMirror(level, this.base.x < level.factions['player'][0].x);
					}

					skull.speak('Fine. Demonstrate your prowess to me!');
				}
			}
		}

		if (this.hp > 0) {
			if (Math.random() < this.chanceToDropParticle) {
				//shape, shapeData, color, outlineColor, floor, x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority
				level.addObject(new ShapeFadeFloorParticle('rect', [0.03, 0.03], 'rgba(0, 0, 0, 1)', 'rgba(0, 0, 0, 1)',
					this.base.y - this.base.sprite.centerY * this.base.sprite.height + this.base.sprite.height,
					this.base.x + (-this.base.sprite.centerX + 0.33 + 0.3 * Math.random()) * this.base.sprite.width, this.base.y + this.base.sprite.offsetY + (1 - this.base.sprite.centerY) * this.base.sprite.height - 0.6,
					0, 1, 0, 0.02, 0, 0, 0, 35 + 10 * Math.random(), 0));
			}

			if (this.actuallyBattle) {
				this.stateCounter += this.extraTickSpeed;

				if (this.attackTarget) {
					if (this.attackTarget.x < this.base.x) {
						this.setMirror(level, true);
					} else {
						this.setMirror(level, false);
					}
				}

				let percentage = 0;
				switch(this.state) {
					case 'idle':
						if (level.factions['player']) {
							this.attackTarget = level.factions['player'][0];
						}

						if (this.stateCounter > this.castCooldown / this.cooldownSpeed && this.attackTarget) {
							if (Math.random() < 0.5) {
								this.changeState(level, 'castingPentagram');
							} else {
								this.changeState(level, 'castingOrb');
							}
						}
						break;
					case 'castingOrb':
						percentage = this.stateCounter / this.orbCastTime;
						if (percentage < 1/this.orbCastSteps) {
							skull.setRotationAndLinkages(level, this.castSkullAngle);
						} else if (percentage < 2/this.orbCastSteps) {
							skull.setRotationAndLinkages(level, -this.castSkullAngle);
						} else if (percentage < 3/this.orbCastSteps) {
							skull.setRotationAndLinkages(level, this.castSkullAngle);
						} else if (percentage < 4/this.orbCastSteps) {
							skull.setRotationAndLinkages(level, -this.castSkullAngle);
						} else if (percentage < 5/this.orbCastSteps) {
							skull.setRotationAndLinkages(level, this.castSkullAngle);
						} else {
							this.base.translateLinkageAndCalibrate(level, rightHand, 0, this.orbCastRightHandTranslateUpY);
							this.changeState(level, 'castOrb');
						}
						break;
					case 'castOrb':
						if (this.stateCounter > this.orbCastStartTime / this.cooldownSpeed) {
							let angle = getAngle(rightHand.x, rightHand.y, this.attackTarget.x, this.attackTarget.y);
							let angleMirrored = toRadians(this.base.mirror ? mirrorAngle(angle) : angle);
							angle = toRadians(angle);
							let startX = rightHand.x;
							let startY = rightHand.y;
							this.base.translateLinkageAndCalibrate(level, rightHand, this.orbCastRightHandDistance * Math.cos(angleMirrored), this.orbCastRightHandDistance * Math.sin(angleMirrored));
							this.orbCastHandTranslationX = rightHand.x - startX;
							this.orbCastHandTranslationY = rightHand.y - startY;
							this.orbCastTranslationMirror = this.base.mirror;

							let orbParticle = new ShapeDamageOnceParticle('circle', this.orbRadius, 'rgba(255, 255, 255, 1)', 'rgba(0, 0, 0, 1)',
								rightHand.x + this.orbDistanceInFrontOfHand * Math.cos(angle), rightHand.y + this.orbDistanceInFrontOfHand * Math.sin(angle) + rightHand.sprite.offsetY,
								0, 1, this.orbSpeed * Math.cos(angle), this.orbSpeed * Math.sin(angle), 0, 0, 0, 240, this.orbAttackDamage, 3)
							orbParticle.immuneFactions = ['enemy'];
							level.addObject(orbParticle);
							let newAudio = new Audio(level.audio['shootorb'].src);
							newAudio.volume = level.audio['shootorb'].volume;
							newAudio.play();

							this.orbsCast++;
							this.changeState(level, 'throwOrb');
						}
						break;
					case 'throwOrb':
						if (this.stateCounter > this.orbCastEndTime) {
							this.base.translateLinkageAndCalibrate(level, rightHand, this.orbCastTranslationMirror ? this.orbCastHandTranslationX : -this.orbCastHandTranslationX, -this.orbCastHandTranslationY);

							if (this.orbsCast < this.orbsPerVolley) {
								this.changeState(level, 'castOrb');
							} else {
								this.base.translateLinkageAndCalibrate(level, rightHand, 0, -this.orbCastRightHandTranslateUpY);
								this.base.setRotationAndLinkages(level, 0);

								this.orbsCast = 0;
								this.changeState(level, 'idle');
							}
						}
						break;
					case 'castingPentagram':
						percentage = this.stateCounter / this.pentagramCastTime;
						if (percentage < 1/this.pentagramCastSteps) {
							skull.setRotationAndLinkages(level, this.castSkullAngle);
						} else if (percentage < 2/this.pentagramCastSteps) {
							skull.setRotationAndLinkages(level, -this.castSkullAngle);
						} else if (percentage < 3/this.pentagramCastSteps) {
							skull.setRotationAndLinkages(level, this.castSkullAngle);
						} else if (percentage < 4/this.pentagramCastSteps) {
							skull.setRotationAndLinkages(level, -this.castSkullAngle);
						} else if (percentage < 5/this.pentagramCastSteps) {
							skull.setRotationAndLinkages(level, this.castSkullAngle);
						} else if (percentage < 6/this.pentagramCastSteps) {
							this.base.setLinkageXYAndCalibrate(level, staff, staff.x, rightHand.y + this.pentagramCastStaffTranslateUpY);
							staff.setRotationAndLinkages(level, this.startCastStaffAngle);
						} else if (percentage < 7/this.pentagramCastSteps) {
							staff.setRotationAndLinkages(level, -this.startCastStaffAngle);
						} else if (percentage < 8/this.pentagramCastSteps) {
							staff.setRotationAndLinkages(level, this.startCastStaffAngle);
						} else if (percentage < 9/this.pentagramCastSteps) {
							staff.setRotationAndLinkages(level, -this.startCastStaffAngle);
						} else if (percentage > 1) {
							this.base.translateLinkageAndCalibrate(level, staff, this.pentagramCastStaffTranslateX, -this.pentagramCastStaffTranslateUpY + this.pentagramCastStaffTranslateDownY);
							staff.setRotationAndLinkages(level, this.finishCastStaffAngle);

							// shape, shapeData, color, outlineColor, x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, damage, renderPriority
							let pentagramParticle = new ShapeDamageParticle('pentagram', [this.pentagramAttackRadius, (42.35 * this.pentagramAttackRadius)/level.tileSize], 'rgba(160, 30, 30, 0.1)', 'rgba(160, 30, 30, 1)',
								this.attackTarget.x, this.attackTarget.y, 0, 0, 0, 0, 0, 0, 0, 120, this.pentagramAttackDamage, 1);
							pentagramParticle.immuneFactions = ['enemy'];
							level.addObject(pentagramParticle);

							this.changeState(level, 'castPentagram');
						}
						break;
					case 'castPentagram':
						if (this.stateCounter > this.castPentagramEndTime / this.cooldownSpeed) {
							this.base.translateLinkageAndCalibrate(level, staff, -this.pentagramCastStaffTranslateX, -this.pentagramCastStaffTranslateDownY);
							this.base.setRotationAndLinkages(level, 0);
							this.changeState(level, 'idle');
						}
						break;
				}
			}
		}
	}

	getShadowBoundingBox(level, caller) {
		let shadowData = super.getShadowBoundingBox(level, caller);

		if (shadowData) {
			shadowData[3] = (level.sprites[this.children['torso'].sprite.name].bottomPixel/level.tileSize - this.children['torso'].sprite.centerY * this.children['torso'].sprite.height) * this.base.sprite.scaleY;
		}

		return shadowData;
	}
}