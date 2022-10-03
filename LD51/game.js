function render(game) {
	
}

function tick(game) {
	let screen = game.screens[0];
	let level = screen.level;
	let levelCam = screen.camera;
	let tileSize = level.tileSize * levelCam.zoomLevel;
	//levelCam.x = level.playable[screen.playableSelected].x - (screen.canvas.width / tileSize) / 2;
	//levelCam.y = level.playable[screen.playableSelected].y - (screen.canvas.height / tileSize) / 2;

	if (level.gameStarted) {
		if (level.acceptText) {
			let keys = Object.keys(game.inputs);
			for (var i=0; i<keys.length; i++) {
				if (keys[i].startsWith('Key') || keys[i].startsWith('Digit') || keys[i] == 'Enter') {
					level.resolveText();
					break;
				}
			}
		}

		if (level.gameState == 4 || level.gameState == 10 || level.gameState == 12) {
			if (game.inputs['mouse3']) {
				if (!level.isFrozen() && level.weakspot == 0) {
					if (game.data['rightClickLockout'] === undefined) {
						game.data['rightClickLockout'] = 0;
					} else {
						game.data['rightClickLockout'] -= 1;
					}

					if (game.data['rightClickLockout'] <= 0) {
						let locationClickedX = game.lastMouseX / ((level.tileSize - 1) * levelCam.zoomLevel) + levelCam.x - 0.5;
						let locationClickedY = game.lastMouseY / ((level.tileSize - 1) * levelCam.zoomLevel) + levelCam.y - 0.5;
						let snapTileDistance = 0.5;

						let hitEnemy = null;
						for (var faction in level.factions) {
							if (faction != 'player') {
								for (var i=0; i<level.factions[faction].length; i++) {
									let enemy = level.factions[faction][i];
									if (enemy.attackable && enemy.checkBoundingBoxCollision(level, locationClickedX - snapTileDistance, locationClickedY - snapTileDistance,
										locationClickedX + snapTileDistance, locationClickedY + snapTileDistance)) {

										hitEnemy = enemy;
										break;
									}
								}
							}

							if (hitEnemy) {
								break;
							}
						}

						if (hitEnemy) {
							let topPixel = 0
							let spriteData = level.sprites[hitEnemy.sprite.name];
							if (spriteData) {
								topPixel = (spriteData.topPixel/level.tileSize) * hitEnemy.sprite.scaleY;
							}

							level.addObject(new SpriteFadeParticle(hitEnemy.x - hitEnemy.sprite.centerX * hitEnemy.sprite.width + 0.5 * hitEnemy.sprite.width + hitEnemy.sprite.offsetX,
								hitEnemy.y - hitEnemy.sprite.centerY * hitEnemy.sprite.height + topPixel + hitEnemy.sprite.offsetY - 0.7, new Sprite('attack_1_1.png', 0, 0, 1, 1, 1, 0.5, 0.5), 0, 1, 0, 0.0012, 0, 0, 0, 40, 4));

							for (var i=0; i<level.playable.length; i++) {
								if (level.playable[i] instanceof ChildObject && level.playable[i].parent.attackTarget != hitEnemy) {
									level.playable[i].parent.changeState(level, 'movingToAttack');
									level.playable[i].parent.attackTarget = hitEnemy;
								}
							}
						} else {
							for (var i=0; i<level.playable.length; i++) {
								level.playable[i].targetX = locationClickedX;
								level.playable[i].targetY = locationClickedY;

								if (level.playable[i] instanceof ChildObject) {
									level.playable[i].parent.changeState(level, 'moving');
									level.playable[i].parent.attackTarget = null;
								}
							}

							level.addObject(new SpriteFadeParticle(locationClickedX, locationClickedY, new Sprite('move_1_1.png', 0, 0, 1, 1, 1, 0.5, 0.5), 0, 1, 0, 0.0012, 0, 0, 0, 40, 0));
						}

						level.notYetMoved = false;

						game.data['rightClickLockout'] = 20;
					}
				}
			} else {
				game.data['rightClickLockout'] = 0;
			}
		}
	} else {
		if (level.playButtonAlpha > 0 && !level.clickedPlay && game.inputs['mouse1']) {
			for (var childIndex in level.factions['player'][0].parent.children) {
				let child = level.factions['player'][0].parent.children[childIndex];
				if (level.sprites[child.sprite.name]) {
					child.opacity = 1;
				}
			}

			level.playButtonAlpha = 0;
			level.clickedPlay = true;
		}
	}
}

launchExample();