class Slime extends Enemy {
	constructor(boss, x, y) {
		let name = 'Slime';
		let hp = 10;
		let attackDamage = 1;
		let sprite = new Sprite('slime_1_1.png', 0, 0, 1, 1, 1, 0.5, 0.78125);
		super(name, boss, hp, attackDamage, x, y, sprite, 0, 0);

		this.jumpHeight = 1.2;
		this.jumpCooldown = 75 + Math.random() * 20;
		this.jumpVerticalSpeed = 0.07; // how fast it goes up and down
		this.jumpHorizontalSpeed = 0.07; // how fast it moves across the map while jumping
		this.jumpScaleX = 0.7;
		this.jumpScaleEasing = 0.4;
		this.jumpAttackRadius = 1.25;

		this.state = 'idle';
		this.currentJump = 0;
		this.jumpTimer = 0;
		this.jumpScaleY = 1/this.jumpScaleX;
		this.move = [0, 0];
		this.currentJumpDistance = 0;
		this.weebSlime = false;
	}

	changeState(newState, level) {
		this.state = newState;
	}

	getShadowBoundingBox(level) {
		if (level.sprites[this.sprite.name]) {
			let spriteData = level.sprites[this.sprite.name];
			return [spriteData.leftPixel/level.tileSize - this.sprite.centerX * this.sprite.width,
						spriteData.rightPixel/level.tileSize - this.sprite.centerX * this.sprite.width,
						spriteData.topPixel/level.tileSize - this.sprite.centerY * this.sprite.height,
						spriteData.bottomPixel/level.tileSize - this.sprite.centerY * this.sprite.height];
		}
	}

	die(level) {
		super.die(level);

		if (this.weebSlime) {
			level.gameState++;
			level.runFreezeCounter = true;
			level.freezeCounter = level.freezeTime - 20;
		} else {
			if (!level.factions['enemy'] || level.factions['enemy'].length == 0) {
				level.addObject(new WolfObject(false, -2, level.factions['player'][0].y));
				level.abilitiesForNextFreezeOffering++;
			}
		}
	}

	tick(level) {
		super.tick(level);

		if (this.weebSlime) {
			if (level.gameStarted && this.text == '') {
				if (level.gameState == 1) {
					this.speak('|uwu hewwo i\'m a swime (^\u{3C9}^) would u wike to be my fwiendo-chan (\u{2044} \u{2044}\u{2022}\u{2044}\u{3C9}\u{2044}\u{2022}\u{2044} \u{2044})  (\u{30CE}\u{25D5}\u{30EE}\u{25D5})\u{30CE}* \u{3099}\u{2727}\u{2D6}\u{B0}|');
				} else if (level.gameState == 3) {
					this.speak('|m-mister uwu pwease don\'t do dis (\u{256F}\u{B0}\u{25A1}\u{B0})\u{256F}\u{2322} \u{253B}\u{2500}\u{253B}|');
				}
			}
		} else {
			if (this.state != 'jumping') {
				if (this.sprite.scaleX != 1) {
					this.sprite.scaleX += this.jumpScaleEasing * (1 - this.sprite.scaleX);
					this.sprite.scaleY += this.jumpScaleEasing * (1 - this.sprite.scaleY);

					if (1 - this.sprite.scaleX < 0.0001) {
						this.sprite.scaleX = 1;
						this.sprite.scaleY = 1;
					}
				}
			}

			switch(this.state) {
				case 'idle':
					if (this.hp > 0) {
						this.jumpTimer++;

						if (this.jumpTimer > this.jumpCooldown) {
							let target = this.findNearestTarget(level);

							if (target) {
								this.setAttackTarget(level, target);
								this.move = findPath(this, level.getCollideable(this, this.bias, this.bias, 2, 2), this.x, this.y, this.targetX, this.targetY);

								let naturalJumpDistance = (Math.PI/this.jumpVerticalSpeed) * this.jumpHorizontalSpeed;
								this.currentJumpDistance = Math.min(naturalJumpDistance, getDistance(this.x, this.y, this.targetX, this.targetY) - this.jumpAttackRadius*0.5);
								this.changeState('jumping', level);
								this.jumpTimer = 0;
							}
						}
					}
					break;
				case 'jumping':
					let translationalSpeed = Math.min(this.jumpHorizontalSpeed, this.currentJumpDistance/(Math.PI/this.jumpVerticalSpeed));
					level.translateObject(this, translationalSpeed * this.move[0], translationalSpeed * this.move[1]);

					this.sprite.offsetY = -this.jumpHeight * Math.sin(this.currentJump);
					this.sprite.scaleX += this.jumpScaleEasing * (this.jumpScaleX - this.sprite.scaleX);
					this.sprite.scaleY += this.jumpScaleEasing * (this.jumpScaleY - this.sprite.scaleY);

					this.currentJump += this.jumpVerticalSpeed;

					if (this.currentJump > Math.PI) {
						this.changeState('idle', level);
						this.currentJump = 0;
						this.sprite.offsetY = 0;

						let shadowData = this.getShadowBoundingBox(level);
						let radiusY = (this.jumpAttackRadius/((shadowData[1] - shadowData[0])/2)) * (11/level.tileSize);
						let bottomY = level.sprites[this.sprite.name].bottomPixel/level.tileSize - this.sprite.centerY + this.y - 1/level.tileSize;
						level.addObject(new ShapeFadeParticle('ellipse', [this.jumpAttackRadius, radiusY], 'rgba(200, 200, 200, 0.75)', 'rgba(255, 255, 255, 1)',
							this.x, bottomY, 0, 1, 0, 0, 0, 0, 0, 25, 1));

						let opposing = this.getAllOpposing(level);
						for (var i=0; i<opposing.length; i++) {
							let opponent = opposing[i];
							if (getDistance(this.x, this.y, opponent.x, opponent.y) < this.jumpAttackRadius) {
								opponent.damage(level, this.attackDamage);
							}
						}

						let minParticleNum = 3;
						let maxParticleNum = 6;
						let particleNum = minParticleNum + (Math.random() * (1 + maxParticleNum - minParticleNum)) << 0;
						for (var i=0; i<particleNum; i++) {
							let maxParticleSpeedX = 0.02;
							let maxParticleSpeedY = -0.025;

							let particleVelX = maxParticleSpeedX * (Math.random() * 2 - 1);
							let particleVelY = maxParticleSpeedY * Math.random();
							//shape, shapeData, color, outlineColor, floor, x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, priorityRender, fadeSpeed
							level.addObject(new ShapeFadeFloorParticle('rect', [0.03, 0.03], 'rgba(135, 193, 255, 1)', 'rgba(0, 0, 0, 1)',
								bottomY, this.x, bottomY, 0, 1, particleVelX, particleVelY, 0,
								0.0012, 0.024, 25, 0));
						}
					}
					break;
			}
		}
	}
}