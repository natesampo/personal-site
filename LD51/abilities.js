class Ability extends UIButton {
	constructor(name, description, cooldown, duration, damage, spriteName, img, owner, ultimate, targeting, tutorial) {
		super(0, 0, (img) ? img.width : 0, (img) ? img.height : 0, img, '', null);
		this.name = name;
		this.description = description;
		this.cooldown = cooldown;
		this.duration = duration;
		this.damage = damage;
		this.spriteName = spriteName;
		this.owner = owner;
		this.ultimate = ultimate;
		this.targeting = targeting;
		this.tutorial = tutorial;

		// how long it takes to travel from selection to bottom UI slot
		this.timeToSlot = 41;

		this.slot = 0;
		this.spinCounter = 0;
		this.movingToSlot = false;
		this.cooldownCounter = 0;
		this.durationCounter = 0;
		this.speedX = 0;
		this.speedY = 0;
		this.speedScaleX = 0;
		this.speedScaleY = 0;
		this.destinationX = 0;
		this.destinationY = 0;
		this.selecting = false;
		this.activated = false;
		this.mouseFollowObject = null;
		this.notYetUsed = true;
	}

	onImageLoad(level, newImg) {
		if (!this.owner) {
			this.scaleX = 4;
			this.scaleY = 4;
			this.x = window.innerWidth/2 - (this.scaleX * newImg.width)/2;
			this.y = window.innerHeight/2.4 - (this.scaleY * newImg.height)/2;
			this.width = newImg.width;
			this.height = newImg.height;
			this.img = newImg;
		}
	}

	hover() {
		super.hover();

		if (!this.owner && this.img) {
			this.scaleX = 4.5;
			this.scaleY = 4.5;
			this.x = window.innerWidth/2 - (this.scaleX * this.img.width)/2;
			this.y = window.innerHeight/2.4 - (this.scaleY * this.img.height)/2;
		}
	}

	unhover() {
		super.unhover();

		if (!this.owner && this.img) {
			this.scaleX = 4;
			this.scaleY = 4;
			this.x = window.innerWidth/2 - (this.scaleX * this.img.width)/2;
			this.y = window.innerHeight/2.4 - (this.scaleY * this.img.height)/2;
		}
	}

	canDoAbility() {
		if (this.owner && !this.movingToSlot && this.cooldownCounter <= 0) {
			return true;
		}

		return false;
	}

	onClick(level, x, y) {
		if (this.canDoAbility() && this.duration > 0) {
			if (!contains(this.owner.activeAbilities, this)) {
				this.owner.activeAbilities.push(this);
				this.cooldownCounter = this.getCooldownWithModifiers();
				this.notYetUsed = false;
			}
		} else if (!this.owner) {
			level.factions['player'][0].addAbility(this);

			if (this.ultimate) {
				this.destinationX = window.innerWidth/2 + 205;
				this.destinationY = window.innerHeight - 109;
				this.speedX = (this.destinationX - this.x)/this.timeToSlot;
				this.speedY = (this.destinationY - this.y)/this.timeToSlot;
			} else {
				this.destinationX = window.innerWidth/2 - 68 + (91 * this.slot);
				this.destinationY = window.innerHeight - 92;
				this.speedX = (this.destinationX - this.x)/this.timeToSlot;
				this.speedY = (this.destinationY - this.y)/this.timeToSlot;
			}

			this.speedScaleX = (1 - this.scaleX)/this.timeToSlot;
			this.speedScaleY = (1 - this.scaleY)/this.timeToSlot;

			level.audio['freezeoffering'].play();
			this.movingToSlot = true;
		}
	}

	whileActive(level) {
		if (level.gameState == 4 || level.gameState == 10 || level.gameState == 12) {
			this.durationCounter++;
		}

		if (this.duration != null) {
			if (this.durationCounter > this.duration * 60) {
				this.onEnd(level);
			}
		}
	}

	onEnd(level) {
		this.durationCounter = 0;
		remove(this.owner.activeAbilities, this);
	}

	getCooldownWithModifiers() {
		if (this.cooldown != null) {
			if (this.owner) {
				return this.cooldown * 60 * (1 - (this.owner.cdr/100));
			} else {
				return this.cooldown * 60;
			}
		}

		return this.cooldown;
	}

	getDamageWithModifiers() {
		if (this.damage != null && this.owner) {
			return this.damage * (1 + (this.owner.spellAmp/100));
		}

		return this.damage;
	}

	tick(level) {
		super.tick(level);

		if (this.cooldownCounter > 0 && !level.isFrozen() && (level.gameState == 4 || level.gameState == 10 || level.gameState == 12)) {
			this.cooldownCounter--;
		}

		if (!this.owner && this.img) {
			this.spinCounter++;
		}

		if (this.movingToSlot) {
			this.x += this.speedX;
			this.y += this.speedY;
			this.scaleX += this.speedScaleX;
			this.scaleY += this.speedScaleY;

			if (this.y >= this.destinationY) {
				this.movingToSlot = false;
				this.speedX = 0;
				this.speedY = 0;
				this.speedScaleX = 0;
				this.speedScaleY = 0;
				this.x = this.destinationX;
				this.y = this.destinationY;
				this.scaleX = 1;
				this.scaleY = 1;

				level.thaw();
			}
		}
	}
}

class Windmill extends Ability {
	constructor(img, owner) {
		let description = 'Throw your axe like a boomerang, dealing your attack damage to enemies near you but preventing you from attacking';
		let cooldown = 8;
		let duration = 2.5;
		let damage = null;
		let spriteName = 'abilitywindmill.png';
		let ultimate = false;
		let tutorial = null;
		let targeting = 'none';

		super('Windmill', description, cooldown, duration, damage, spriteName, img, owner, ultimate, targeting, tutorial);

		this.circleSpeed = 15;
		this.extendSpeed = 0.02;
		this.timeToReturn = 0.5;

		this.enemiesTouching = [];
	}

	onClick(level, x, y) {
		if (this.canDoAbility()) {
			level.notYetUsedAbility = false;

			this.owner.children['rightHand'].removeLinkage(this.owner.children['axe']);
			this.owner.base.addLinkage(this.owner.children['axe']);
			this.owner.base.setLinkageXYAndCalibrate(level, this.owner.children['axe'], this.owner.base.x + (this.owner.children['axe'].mirror ? -0.25 : 0.25), this.owner.base.y);
			this.owner.children['axe'].dontTranslateUponMirror = true;
			this.owner.children['axe'].angle = 45;
			this.owner.axeless = true;

			if (this.owner.state != 'idle' && this.owner.state != 'moving' && this.owner.state != 'movingToAttack') {
				if (this.owner.attackTarget) {
					this.owner.changeState(level, 'movingToAttack');
				} else {
					this.owner.changeState(level, 'idle');
				}
			}
		}

		super.onClick(level, x, y);
	}

	whileActive(level) {
		if (this.durationCounter > (this.duration - this.timeToReturn) * 60) {
			let timeLeft = Math.max(this.duration * 60 - this.durationCounter, 1);
			let portionOfReturnLeft = timeLeft / (this.timeToReturn * 60);
			this.owner.base.extendLinkageRadius(level, this.owner.children['axe'], -this.extendSpeed * 0.9 * (this.duration / this.timeToReturn));
			this.owner.base.addLinkageAngle(this.owner.children['axe'], portionOfReturnLeft * ((this.owner.children['axe'].mirror != this.owner.base.mirror) ? -this.circleSpeed : this.circleSpeed));
			this.owner.children['axe'].angle += (360 - (this.owner.children['axe'].angle % 360)) / timeLeft;
		} else {
			this.owner.base.extendLinkageRadius(level, this.owner.children['axe'], this.extendSpeed);
			this.owner.base.addLinkageAngle(this.owner.children['axe'], (this.owner.children['axe'].mirror != this.owner.base.mirror) ? -this.circleSpeed : this.circleSpeed);
			this.owner.children['axe'].angle += this.circleSpeed;
		}

		let oldEnemiesTouching = this.enemiesTouching;
		this.enemiesTouching = [];
		for (var faction in level.factions) {
			if (faction != 'player') {
				for (var i=0; i<level.factions[faction].length; i++) {
					if (level.factions[faction][i].checkObjectCollision(level, this.owner.children['axe'])) {
						this.enemiesTouching.push(level.factions[faction][i]);
					}
				}
			}
		}

		for (var i=0; i<this.enemiesTouching.length; i++) {
			if (!contains(oldEnemiesTouching, this.enemiesTouching[i])) {
				this.enemiesTouching[i].damage(level, this.owner.attackDamage * (1 + this.owner.spellAmp/100));

				let newAudio = new Audio(level.audio['attack'].src);
				newAudio.volume = level.audio['attack'].volume;
				newAudio.play();
				level.addScreenShake(0.15);
			}
		}

		super.whileActive(level);
	}

	onEnd(level) {
		this.enemiesTouching = [];

		let baseAngle = this.owner.enraged ? 270 : 0;
		this.owner.children['axe'].dontTranslateUponMirror = false;
		this.owner.children['axe'].angle = baseAngle;
		this.owner.children['axe'].mirror = this.owner.children['rightHand'].mirror;

		let rightHandAngle = this.owner.children['rightHand'].angle;
		this.owner.children['rightHand'].setRotationAndLinkages(level, baseAngle);

		let moveX = this.owner.enraged ? 0.078125 : (this.owner.children['rightHand'].mirror ? -0.09375 : 0.09375);
		let moveY = this.owner.enraged ? (this.owner.children['rightHand'].mirror ? 0.1171875 : -0.1171875) : 0.0625;
		level.setObjectXY(this.owner.children['axe'], this.owner.children['rightHand'].x + moveX, this.owner.children['rightHand'].y + moveY);
		this.owner.base.removeLinkage(this.owner.children['axe']);
		this.owner.children['rightHand'].addLinkage(this.owner.children['axe']);
		this.owner.children['rightHand'].setRotationAndLinkages(level, rightHandAngle);
		this.owner.axeless = false;

		super.onEnd(level);
	}
}

class Enrage extends Ability {
	constructor(img, owner) {
		let description = 'Become enraged, growing larger and gaining bonus Damage, Attack Speed, and Movement Speed';
		let cooldown = 18;
		let duration = 6;
		let damage = null;
		let spriteName = 'abilityenrage.png';
		let ultimate = false;
		let tutorial = null;
		let targeting = 'none';

		super('Enrage', description, cooldown, duration, damage, spriteName, img, owner, ultimate, targeting, tutorial);

		this.damageBonus = 2;
		this.moveSpeedBonus = 0.04;
		this.scaleFactor = 1.25;

		this.damageGiven = 0;
		this.moveSpeedGiven = 0;
		this.scaleFactorGiven = 0;
	}

	onClick(level, x, y) {
		if (this.canDoAbility()) {
			this.owner.enraged = true;

			switch(this.owner.state) {
				case 'idle':
				case 'moving':
				case 'movingToAttack':
					this.owner.startEnraged(level);
					break;
				case 'attackWindUp':
				case 'attackHold':
					this.owner.startAttackSwing(level);
					break;
			}

			this.owner.scale(level, this.scaleFactor * (1 + this.owner.spellAmp/100));
			this.owner.base.translateAndLinkages(level, 0, -(this.owner.children['rightLeg'].y - this.owner.base.y) * this.scaleFactor * (1 + this.owner.spellAmp/100));
			this.scaleFactorGiven += this.scaleFactor * (1 + this.owner.spellAmp/100);
			this.owner.attackDamage += this.damageBonus * (1 + this.owner.spellAmp/100);
			this.damageGiven += this.damageBonus * (1 + this.owner.spellAmp/100);
			this.owner.speed += this.moveSpeedBonus * (1 + this.owner.spellAmp/100);
			this.moveSpeedGiven += this.moveSpeedBonus * (1 + this.owner.spellAmp/100);
		}

		super.onClick(level, x, y);
	}

	whileActive(level) {
		super.whileActive(level);
	}

	onEnd(level) {
		this.owner.base.translateAndLinkages(level, 0, (this.owner.children['rightLeg'].y - this.owner.base.y) * (1 + this.scaleFactorGiven));
		this.owner.scale(level, 1/this.scaleFactorGiven);
		this.scaleFactorGiven = 0;

		if (this.owner.state == 'idle' || this.owner.state == 'moving' || this.owner.state == 'movingToAttack') {
			this.owner.exitEnraged(level);
		}

		this.owner.attackDamage -= this.damageGiven;
		this.damageGiven = 0;
		this.owner.speed -= this.moveSpeedGiven;
		this.moveSpeedGiven = 0;
		this.owner.enraged = false;

		super.onEnd(level);
	}
}

class SummonSnakeMage extends Ability {
	constructor(img, owner) {
		let description = 'Magical snakes burrow underground, summon one to the surface to fight for you until it dies\nCooldown starts when snake dies';
		let cooldown = 10;
		let duration = null;
		let damage = null;
		let spriteName = 'abilitysnakemage.png';
		let ultimate = false;
		let tutorial = 'Left-Click a spot on the ground to use this ability';
		let targeting = 'area';

		super('Summon Snake Mage', description, cooldown, duration, damage, spriteName, img, owner, ultimate, targeting, tutorial);

		this.summonFadeSpeed = 0.015;
		this.summonMaxOpacity = 1.5;

		this.snakeFriend = null;
		this.summoningParticleBottom = null;
		this.summoningParticleTop = null;
		this.summoningParticleFront = null;
		this.summonDirection = true;
	}

	onClick(level, x, y) {
		if (this.canDoAbility() && !this.selecting) {
			this.selecting = true;

			this.snakeFriend = new SnakeMage(0, 0);
			let boundingBox = this.snakeFriend.getRenderOrder()[0].getShadowBoundingBox(level);
			// shape, shapeData, color, outlineColor, x, y, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority
			this.mouseFollowObject = new ShapeParticle('ellipse', [boundingBox[1] - boundingBox[0], 22 / level.tileSize], 'rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 1)',
				x / ((level.tileSize - 1) * level.screen.camera.zoomLevel) + level.screen.camera.x - 0.5,
				y / ((level.tileSize - 1) * level.screen.camera.zoomLevel) + level.screen.camera.y - 0.5,
				0, 1, 0, 0, 0, 0, 0, 99999, 1);
			level.addObject(this.mouseFollowObject);
			level.holdingAbility = this;
		}

		super.onClick(level, x, y);

		this.notYetUsed = true;
	}

	whileActive(level) {
		if (this.activated) {
			this.summoningParticleBottom = this.mouseFollowObject;
			this.mouseFollowObject = null;
			this.summoningParticleBottom.shapeData = [this.summoningParticleBottom.shapeData[0], this.summoningParticleBottom.shapeData[1]];

			this.summoningParticleTop = new ShapeParticle('ellipse', [this.summoningParticleBottom.shapeData[0], this.summoningParticleBottom.shapeData[1]],
				this.summoningParticleBottom.color, this.summoningParticleBottom.outlineColor, this.summoningParticleBottom.x, this.summoningParticleBottom.y - 1,
				0, 0, 0, 0, 0, 0, 0, 99999, 3);
			level.addObject(this.summoningParticleTop);

			// make a new canvas to exclude areas already drawn by the above two particles
			let newCanvas = document.createElement('canvas');
			newCanvas.width = this.summoningParticleBottom.shapeData[0] * 2 * level.tileSize;
			newCanvas.height = level.tileSize + this.summoningParticleBottom.shapeData[1] * level.tileSize;
			let newContext = newCanvas.getContext('2d');

			newContext.lineWidth = 1;
			newContext.fillStyle = 'rgba(255, 255, 255, 1)';
			newContext.strokeStyle = 'rgba(255, 255, 255, 1)';
			newContext.beginPath();
			newContext.ellipse(this.summoningParticleBottom.shapeData[0] * level.tileSize, level.tileSize, this.summoningParticleBottom.shapeData[0] * level.tileSize,
				this.summoningParticleBottom.shapeData[1] * level.tileSize, toRadians(this.summoningParticleBottom.angle), 0, 2*Math.PI);
			newContext.ellipse(this.summoningParticleTop.shapeData[0] * level.tileSize, 0, this.summoningParticleTop.shapeData[0] * level.tileSize,
				this.summoningParticleTop.shapeData[1] * level.tileSize, toRadians(this.summoningParticleTop.angle), 0, 2*Math.PI);
			newContext.fill();
			newContext.closePath();
			newContext.globalCompositeOperation = 'source-out';
			newContext.fillStyle = 'rgba(255, 255, 255, 0.5)';
			newContext.fillRect(0, 0, newCanvas.width, level.tileSize);
			newContext.globalCompositeOperation = 'source-over';
			newContext.beginPath();
			newContext.ellipse(this.summoningParticleBottom.shapeData[0] * level.tileSize, level.tileSize, this.summoningParticleBottom.shapeData[0] * level.tileSize,
				this.summoningParticleBottom.shapeData[1] * level.tileSize, toRadians(this.summoningParticleBottom.angle), 0, 2*Math.PI);
			newContext.fill();
			newContext.closePath();

			// x, y, image, angle, opacity, velX, velY, velRot, gravity, airResistance, duration, renderPriority
			this.summoningParticleFront = new ImageParticle(this.summoningParticleBottom.x - this.summoningParticleBottom.shapeData[0], this.summoningParticleTop.y,
				newCanvas, 0, 0, 0, 0, 0, 0, 0, 99999, 3);
			level.addObject(this.summoningParticleFront);

			this.notYetUsed = false;
			this.activated = false;
		}

		if (this.summoningParticleFront && this.summoningParticleTop && this.summoningParticleBottom) {
			if (this.summonDirection) {
				this.summoningParticleFront.opacity += this.summonFadeSpeed/2;
				this.summoningParticleTop.opacity += this.summonFadeSpeed;
				this.summoningParticleBottom.opacity = Math.max(this.summoningParticleTop.opacity, this.summoningParticleBottom.opacity);

				if (this.summoningParticleTop.opacity >= this.summonMaxOpacity) {
					this.summoningParticleBottom.opacity = this.summoningParticleTop.opacity;
					this.summonDirection = false;

					level.addObject(this.snakeFriend);
					this.snakeFriend.base.setXYAndPullLinkages(level, this.summoningParticleBottom.x, this.summoningParticleBottom.y);
					this.snakeFriend.changeState(level, 'stasis');
					for (var child in this.snakeFriend.children) {
						this.snakeFriend.children[child].opacity = 0;
					}
				}
			} else {
				this.summoningParticleFront.opacity -= this.summonFadeSpeed/2;
				this.summoningParticleBottom.opacity -= this.summonFadeSpeed;
				this.summoningParticleTop.opacity -= this.summonFadeSpeed;

				for (var child in this.snakeFriend.children) {
					this.snakeFriend.children[child].opacity += this.summonFadeSpeed * (1/this.summonMaxOpacity);
				}

				if (this.summoningParticleTop.opacity <= 0) {
					level.removeFromMap(this.summoningParticleFront);
					level.removeFromMap(this.summoningParticleBottom);
					level.removeFromMap(this.summoningParticleTop);
					this.summoningParticleFront = null;
					this.summoningParticleBottom = null;
					this.summoningParticleTop = null;

					for (var child in this.snakeFriend.children) {
						this.snakeFriend.children[child].opacity = 1;
					}
					level.addToFaction(this.snakeFriend.base, 'player');
					this.snakeFriend.changeState(level, 'idle');
				}
			}
		}

		this.cooldownCounter = this.getCooldownWithModifiers();
		if (!this.snakeFriend || this.snakeFriend.hp <= 0) {
			this.onEnd(level);
		}

		super.whileActive(level);
	}

	onEnd(level) {
		this.summonDirection = true;
		this.snakeFriend = null;
		if (this.mouseFollowObject) {
			level.removeFromMap(this.mouseFollowObject);
			this.mouseFollowObject = null;
		}

		super.onEnd(level);
	}

	tick(level) {
		if (this.selecting) {
			this.cooldownCounter = this.getCooldownWithModifiers();
		} else if (this.mouseFollowObject) {
			this.onEnd(level);
		}

		super.tick(level);
	}

	onImageLoad(level, newImg) {
		super.onImageLoad(level, newImg);

		let tempSnakeMageChildren = new SnakeMage(0, 0).getRenderOrder();
		for (var i=0; i<tempSnakeMageChildren.length; i++) {
			if (!level.sprites[tempSnakeMageChildren[i].sprite.name]) {
				let promise = loadSprite(tempSnakeMageChildren[i].sprite.name, level.tileSize);
				if (promise) {
					promise.then(function(imageData) {
						if (imageData) {
							level.sprites[imageData[0]] = imageData[1];
						}
					});
				}
			}
		}
	}
}

class Weakspot extends Ability {
	constructor(img, owner) {
		let description = 'Detect an enemy\'s weak spot and deal a crushing blow';
		let cooldown = 15;
		let duration = null;
		let damage = 150;
		let spriteName = 'abilityweakspot.png';
		let ultimate = true;
		let targeting = 'unit';
		let tutorial = 'Left-Click on an enemy to use this ability';

		super('Weakspot', description, cooldown, duration, damage, spriteName, img, owner, ultimate, targeting, tutorial);

		this.targetedAt = null;

		// potentialTargetList is a data structure of 'EnemyID': [particle, verified]
		// verified is used to determine if the enemy still exists
		this.potentialTargetList = {};
	}

	onClick(level, x, y) {
		if (this.canDoAbility() && !this.selecting) {
			this.selecting = true;

			for (var faction in level.factions) {
				if (faction != 'player') {
					for (var i=0; i<level.factions[faction].length; i++) {
						let potentialTarget = level.factions[faction][i];

						let enemySelectionParticle = new EnemySelectionParticle(potentialTarget);
						this.potentialTargetList[potentialTarget.id] = [enemySelectionParticle, false];
						level.addObject(enemySelectionParticle);
					}
				}
			}

			level.holdingAbility = this;
		}

		super.onClick(level, x, y);

		this.notYetUsed = true;
	}

	whileActive(level) {
		if (this.activated && this.targetedAt) {
			this.potentialTargetList = {};

			for (var i=0; i<this.owner.activeAbilities.length; i++) {
				if (this.owner.activeAbilities[i] instanceof Windmill) {
					this.owner.activeAbilities[i].onEnd(level);
				}
			}

			this.owner.changeState(level, 'weakspot');
			this.owner.children['rightLeg'].setRotationAndLinkages(level, 0);
			this.owner.children['leftLeg'].setRotationAndLinkages(level, 0);
			this.owner.children['rightArm'].setRotationAndLinkages(level, 0);
			this.owner.children['leftArm'].setRotationAndLinkages(level, 0);
			this.owner.initAlignAndCalibrateChildren();

			if (this.owner.base.x < this.targetedAt.x) {
				this.owner.setMirror(level, false);
			} else {
				this.owner.setMirror(level, true);
			}

			level.activateWeakspot(this);

			this.notYetUsed = false;
			this.activated = false;
		} else {
			this.cooldownCounter = 0;
		}

		super.whileActive(level);
	}

	onEnd(level) {
		this.selecting = false;
		this.activated = false;
		this.targetedAt = null;
		this.cooldownCounter = this.getCooldownWithModifiers();

		for (var particle in this.potentialTargetList) {
			level.removeFromMap(this.potentialTargetList[particle][0]);
		}
		this.potentialTargetList = {};

		super.onEnd(level);
	}

	tick(level) {
		if (this.selecting) {
			for (var faction in level.factions) {
				if (faction != 'player') {
					for (var i=0; i<level.factions[faction].length; i++) {
						let potentialTarget = level.factions[faction][i];
						if (!this.potentialTargetList[potentialTarget.id]) {
							let enemySelectionParticle = new EnemySelectionParticle(potentialTarget);
							this.potentialTargetList[potentialTarget.id] = [enemySelectionParticle, true];
							level.addObject(enemySelectionParticle);
						} else {
							this.potentialTargetList[potentialTarget.id][1] = true;
						}
					}
				}
			}

			let enemySelectionKeyList = Object.keys(this.potentialTargetList);
			for (var i=0; i<enemySelectionKeyList.length; i++) {
				let potentialTargetID = enemySelectionKeyList[i];
				if (!this.potentialTargetList[potentialTargetID][1]) {
					level.removeFromMap(this.potentialTargetList[potentialTargetID][0]);
					delete this.potentialTargetList[potentialTargetID];
				}
			}
		}

		super.tick(level);
	}
}