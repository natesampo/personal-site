class Enemy extends GameObject {
	constructor(name, boss, hp, attackDamage, x, y, sprite, animationSpeed, speed) {
		super(x, y, sprite, 0, animationSpeed, true, false, true, speed, 1);
		this.name = name;
		this.boss = boss;
		this.hp = hp;
		this.attackDamage = attackDamage;

		this.faction = 'enemy';
		this.hpTotal = hp;
		this.recentlyDamagedFlashTime = 25;
		this.dieFadeSpeed = 0.024;

		this.recentlyDamaged = 0;
	}

	// returns if the enemy died
	damage(level, dmg) {
		this.hp -= dmg;

		if (this.hp <= 0) {
			this.attackable = false;
			this.collideable = false;
			level.removeFromFaction(this);

			return true;
		} else {
			this.recentlyDamaged = this.recentlyDamagedFlashTime;
		}

		return false;
	}

	getAllOpposing(level) {
		let opposingList = [];
		for (var faction in level.factions) {
			if (faction != this.faction) {
				opposingList = opposingList.concat(level.factions[faction]);
			}
		}

		return opposingList;
	}

	findNearestTarget(level) {
		let targetList = this.getAllOpposing(level);

		let closestDistance = null;
		let closestTarget = null;
		for (var i=0; i<targetList.length; i++) {
			let target = targetList[i];
			let distance = getDistance(this.x, this.y, target.x, target.y);
			if (closestDistance == null || closestDistance > distance) {
				closestDistance = distance;
				closestTarget = target;
			}
		}

		return closestTarget;
	}

	getShadowBoundingBox(level) {
		if (level.sprites[this.sprite.name]) {
			let spriteData = level.sprites[this.sprite.name];
			return [(spriteData.leftPixel/level.tileSize - this.sprite.centerX * this.sprite.width) * this.sprite.scaleX,
						(spriteData.rightPixel/level.tileSize - this.sprite.centerX * this.sprite.width) * this.sprite.scaleX,
						(spriteData.topPixel/level.tileSize - this.sprite.centerY * this.sprite.height) * this.sprite.scaleY,
						(spriteData.bottomPixel/level.tileSize - this.sprite.centerY * this.sprite.height) * this.sprite.scaleY];
		}
	}

	die(level) {
		level.removeFromMap(this);
	}

	tick(level) {
		super.tick(level);

		if (this.hp <= 0) {
			this.opacity -= this.dieFadeSpeed;

			if (this.opacity <= 0) {
				this.die(level);
			}
		} else {
			if (this.recentlyDamaged > 0) {
				this.recentlyDamaged--;
			}
		}
	}
}