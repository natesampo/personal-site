class Offering extends UIButton {
	constructor(name, description, spriteName) {
		super(0, 0, 0, 0, null, '', null);
		this.name = name;
		this.description = description;
		this.spriteName = spriteName;

		this.slot = 0;
		this.gapBetweenSlots = window.innerWidth/4;
	}

	onImageLoad(level, newImg) {
		this.scaleX = 4;
		this.scaleY = 4;
		this.x = window.innerWidth/2 - (this.scaleX * newImg.width)/2 + (this.slot - 1) * this.gapBetweenSlots;
		this.y = window.innerHeight/2.4 - (this.scaleY * newImg.height)/2;
		this.width = newImg.width;
		this.height = newImg.height;
		this.img = newImg;
	}

	hover() {
		super.hover();

		if (this.img) {
			this.scaleX = 4.5;
			this.scaleY = 4.5;
			this.x = window.innerWidth/2 - (this.scaleX * this.img.width)/2 + (this.slot - 1) * this.gapBetweenSlots;
			this.y = window.innerHeight/2.4 - (this.scaleY * this.img.height)/2;
		}
	}

	unhover() {
		super.unhover();

		if (this.img) {
			this.scaleX = 4;
			this.scaleY = 4;
			this.x = window.innerWidth/2 - (this.scaleX * this.img.width)/2 + (this.slot - 1) * this.gapBetweenSlots;
			this.y = window.innerHeight/2.4 - (this.scaleY * this.img.height)/2;
		}
	}

	onClick(level, x, y) {
		for (var i=0; i<level.numOfferingsPerFreeze; i++) {
			remove(level.screen.ui, level.currentFreezeOffering[i]);
		}

		level.audio['freezeoffering'].play();
		level.thaw();
	}

	updateSlot(level) {
		this.slot = getIndex(level.currentFreezeOffering, this);
		this.unhover();
	}
}

class AttackDamageOffering extends Offering {
	constructor() {
		let name = 'Attack Damage';
		let description = 'Increase attack damage by 3';
		let spriteName = 'attackoffering.png';

		super(name, description, spriteName);
	}

	onClick(level, x, y) {
		super.onClick(level, x, y);

		level.factions['player'][0].parent.attackDamage += 2;
	}
}

class AttackSpeedOffering extends Offering {
	constructor() {
		let name = 'Attack Speed';
		let description = 'Increase attack speed by 10';
		let spriteName = 'attackspeedoffering.png';

		super(name, description, spriteName);
	}

	onClick(level, x, y) {
		super.onClick(level, x, y);

		level.factions['player'][0].parent.attackSpeed += 10;
	}
}

class CdrOffering extends Offering {
	constructor() {
		let name = 'Cooldown Reduction';
		let description = 'Decrease cooldown of spells by 5%';
		let spriteName = 'cdroffering.png';

		super(name, description, spriteName);
	}

	onClick(level, x, y) {
		super.onClick(level, x, y);

		let cdr = 5;

		level.factions['player'][0].parent.cdr += cdr;
		for (var i=0; i<level.factions['player'][0].parent.basicAbilities.length; i++) {
			let ability = level.factions['player'][0].parent.basicAbilities[i];
			ability.cooldownCounter *= (1 - cdr/100);
		}
		for (var i=0; i<level.factions['player'][0].parent.ultimateAbilities.length; i++) {
			let ability = level.factions['player'][0].parent.ultimateAbilities[i];
			ability.cooldownCounter *= (1 - cdr/100);
		}
	}
}

class SpellAmpOffering extends Offering {
	constructor() {
		let name = 'Spell Amplification';
		let description = 'Increase effects of spells by 15%';
		let spriteName = 'spellampoffering.png';

		super(name, description, spriteName);
	}

	onClick(level, x, y) {
		super.onClick(level, x, y);

		level.factions['player'][0].parent.spellAmp += 15;
	}
}

class HealthOffering extends Offering {
	constructor() {
		let name = 'Health';
		let description = 'Increase maximum health by 20 and heal for 40';
		let spriteName = 'healthoffering.png';

		super(name, description, spriteName);
	}

	onClick(level, x, y) {
		super.onClick(level, x, y);

		level.factions['player'][0].parent.hpTotal += 20;
		level.factions['player'][0].parent.hp = Math.min(level.factions['player'][0].parent.hp + 40, level.factions['player'][0].parent.hpTotal);
	}
}