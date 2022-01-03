let countries = {};
let provinces = {};
let player = '';
let save = [];
let popsToConvert = [];

function upload() {
	let fileUpload = document.getElementById('fileUpload');
	fileUpload.addEventListener('change', getFile);
	fileUpload.click();
}

function getFile(event) {
	const upload = event.target;
	if ('files' in upload && upload.files.length > 0) {
		changeView(0);
		loadFile(upload.files[0]).then(function(content) {
			readFile(content.replace(/[\r\t]/g, '').split('\n'));
		}).catch(function(error) {console.log(error);});
	}
}

function loadFile(file) {
	const reader = new FileReader();
	return new Promise(function(resolve, reject) {
		reader.onload = function(event) {resolve(event.target.result);};
		reader.onerror = function(error) {reject(error);};
		reader.readAsText(file);
	});
}

function readFile(content) {
	let lineCount = document.createElement('p');
	lineCount.id = 'lineCount';
	lineCount.innerHTML = 'Your save is ' + content.length.toLocaleString() + ' lines long!';
	document.getElementById('reading').appendChild(lineCount);

	window.requestAnimationFrame(function() {
		window.requestAnimationFrame(function() {
			grabInfo(content);
		});
	});
}

function changeView(mode) {
	let warn = document.getElementById('warn');
	let reading = document.getElementById('reading');
	let lineCount = document.getElementById('lineCount');
	let saveEditor = document.getElementById('saveEditor');
	switch(mode) {
		case 0:
			if (lineCount) {lineCount.remove();}
			warn.style['display'] = 'none';
			saveEditor.style['display'] = 'none';
			reading.style['display'] = 'block';
			reading.style['justify-content'] = 'center';
			reading.style['margin-top'] = '13vh';
			reading.style['text-align'] = 'center';
			break;
		case 1:
			if (lineCount) {lineCount.remove();}
			warn.style['display'] = 'none';
			reading.style['display'] = 'none';
			saveEditor.style['display'] = 'flex';
			saveEditor.style['margin'] = '50px 150px';
			saveEditor.style['justify-content'] = 'space-between';
			saveEditor.style['align-items'] = 'start';
			break;
	}
}

function insertAlphabetically(tagSelect, tagOption, min, max) {
	if (min == max) {
		if (tagSelect.children[min].innerHTML.localeCompare(tagOption.innerHTML) == 1) {
			tagSelect.insertBefore(tagOption, tagSelect.children[min]);
			return;
		}

		tagSelect.insertBefore(tagOption, tagSelect.children[min+1]);
		return;
	}

	if (max - min == 1) {
		if (tagSelect.children[min].innerHTML.localeCompare(tagOption.innerHTML) == 1) {
			tagSelect.insertBefore(tagOption, tagSelect.children[min]);
			return;
		}

		if (tagSelect.children[max].innerHTML.localeCompare(tagOption.innerHTML) == 1) {
			tagSelect.insertBefore(tagOption, tagSelect.children[max]);
			return;
		}

		tagSelect.insertBefore(tagOption, tagSelect.children[max+1]);
		return;
	}

	let mid = (((max - min) / 2) >> 0) + min;
	if (tagSelect.children[mid].innerHTML.localeCompare(tagOption.innerHTML) == 1) {
		max = mid - 1;
	} else {
		min = mid + 1;
	}

	insertAlphabetically(tagSelect, tagOption, min, max);
}

function properNounDisplay(culture) {
	let fixedString = '';
	let splitCulture = culture.split('_');
	for (let j=0; j<splitCulture.length; j++) {
		let cultureWord = splitCulture[j];
		fixedString += ' ';
		fixedString += cultureWord.charAt(0).toUpperCase();
		fixedString += cultureWord.substring(1).toLowerCase();
	}

	return fixedString.substring(1);
}

function grabInfo(content) {
	let saveEditor = document.getElementById('saveEditor');
	let tagSelect = document.getElementById('tagSelect');
	let fromCultureSelect = document.getElementById('fromCultureSelect');
	let whereSelect = document.getElementById('whereSelect');
	let primaryCultureText = document.getElementById('primaryCultureText');
	let acceptedCultureText = document.getElementById('acceptedCultureText');
	let religionText = document.getElementById('religionText');
	let endTagList = [];
	let depth = 0;
	let currCountry = '';
	let currProvince = {};
	let cultureMode = false;
	let trackingPop = {};
	save = content;
	countries = {};
	provinces = {'cores': {}, 'owned': {}, 'ownedCores': {}};
	for (let i=0; i<content.length; i++) {
		let line = content[i];
		if (depth == 0) {
			if (line.includes('=')) {
				if (line.startsWith('player=')) {
					player = line.split('=')[1].replace(/\"/g, '').substring(0, 3);
				} else {
					let firstHalf = line.split('=')[0];
					if (firstHalf.length > 0) {
						if (/^\d+$/.test(firstHalf)) {
							currProvince['id'] = +firstHalf;
						} else if (firstHalf.length == 3 && firstHalf == firstHalf.toUpperCase()) {
							currCountry = firstHalf;
							countries[currCountry] = {'primary_culture': 'none', 'accepted_cultures': [], 'religion': 'noreligion'};

							let tagOption = document.createElement('option');
							tagOption.innerHTML = currCountry;
							if (!/\d/.test(currCountry)) {
								if (tagSelect.children.length == 0) {
									tagSelect.appendChild(tagOption);
								} else if (tagSelect.children[tagSelect.children.length-1].innerHTML.localeCompare(currCountry) == -1) {
									tagSelect.appendChild(tagOption);
								} else {
									insertAlphabetically(tagSelect, tagOption, 0, tagSelect.children.length-1);
								}
							} else {
								endTagList.push(tagOption);
							}
						}
					}
				}
			}
		} else if (currProvince['id']) {
			if (depth == 1) {
				if (line.startsWith('name=')) {
					currProvince['name'] = line.split('=')[1].replace(/\"/g, '');
				} else if (line.startsWith('owner=')) {
					let owner = line.split('=')[1].replace(/\"/g, '');
					currProvince['owner'] = owner;
					if (provinces['owned'][owner]) {
						provinces['owned'][owner].push(currProvince);
					} else {
						provinces['owned'][owner] = [currProvince];
					}

					if (currProvince['cores']) {
						for (let j=0; j<currProvince['cores'].length; j++) {
							if (currProvince['cores'][j] == owner) {
								if (provinces['ownedCores'][owner]) {
									provinces['ownedCores'][owner].push(currProvince);
								} else {
									provinces['ownedCores'][owner] = [currProvince];
								}
								break;
							}
						}
					}
				} else if (line.startsWith('core=')) {
					let corer = line.split('=')[1].replace(/\"/g, '');
					if (currProvince['cores']) {
						currProvince['cores'].push(corer);
					} else {
						currProvince['cores'] = [corer];
					}

					if (provinces['cores'][corer]) {
						provinces['cores'][corer].push(currProvince);
					} else {
						provinces['cores'][corer] = [currProvince];
					}

					if (currProvince['owner'] && currProvince['owner'] == corer) {
						if (provinces['ownedCores'][corer]) {
							provinces['ownedCores'][corer].push(currProvince);
						} else {
							provinces['ownedCores'][corer] = [currProvince];
						}
					}
				} else if (!trackingPop['type'] && line.startsWith('clerks=')) {
					trackingPop['type'] = 'clerks';
					trackingPop['location'] = currProvince['name'];
					if (currProvince['pops']) {
						currProvince['pops'].push(trackingPop);
					} else {
						currProvince['pops'] = [trackingPop];
					}
				} else if (!trackingPop['type'] && line.startsWith('craftsmen=')) {
					trackingPop['type'] = 'craftsmen';
					trackingPop['location'] = currProvince['name'];
					if (currProvince['pops']) {
						currProvince['pops'].push(trackingPop);
					} else {
						currProvince['pops'] = [trackingPop];
					}
				}
			} else if (depth == 2) {
				if (trackingPop['type'] && line.includes('=')) {
					let split = line.split('=');
					if (split[0] == 'size' && /^\d+$/.test(split[1])) {
						trackingPop['size'] = split[1];
					} else if (split[0] != 'id' && split[0] != 'money' && split[0] != 'ideology' && split[0] != 'issues'
						&& split[0] != 'con' && split[0] != 'mil' && split[0] != 'literacy' && split[0] != 'con_factor' && split[0] != 'life_needs'
						&& split[0] != 'everyday_needs' && split[0] != 'luxury_needs' && split[0] != 'days_of_loss' && split[0] != 'random'
						&& split[0] != 'bank' && split[0] != 'promoted' && split[0] != 'demoted' && split[0] != 'production_type'
						&& split[0] != 'stockpile' && split[0] != 'need' && split[0] != 'last_spending' && split[0] != 'current_producing'
						&& split[0] != 'percent_afforded' && split[0] != 'percent_sold_domestic' && split[0] != 'percent_sold_export'
						&& split[0] != 'leftover' && split[0] != 'throttle' && split[0] != 'needs_cost' && split[0] != 'production_income'
						&& split[0] != 'faction' && split[0] != 'converted' && split[0] != 'size_changes' && split[0] != 'movement_tag'
						&& split[0] != 'movement_issue' && split[0] != 'external_migration' && split[0] != 'local_migration') {
						trackingPop['culture'] = split[0];
						trackingPop['religion'] = split[1];
					}
				}
			}
		} else if (currCountry != '') {
			if (line.startsWith('primary_culture=')) {
				countries[currCountry]['primary_culture'] = line.split('=')[1].replace(/\"/g, '');
			} else if (line.startsWith('culture=')) {
				cultureMode = true;
			} else if (line.startsWith('religion=')) {
				countries[currCountry]['religion'] = line.split('=')[1].replace(/\"/g, '');
			} else if (cultureMode && line.startsWith('\"')) {
				countries[currCountry]['accepted_cultures'].push(line.replace(/\"/g, ''));
			}
		}

		if (line.includes('{')) {
			depth += (line.match(/\{/g) || []).length;
		}

		if (line.includes('}')) {
			depth -= (line.match(/\}/g) || []).length;

			if (cultureMode) {
				cultureMode = false;
			}

			if (trackingPop['type'] && depth <= 1) {
				trackingPop = {};
			}

			if (depth == 0) {
				currCountry = '';
				currProvince = {};
			}
		}
	}

	for (let i=0; i<endTagList.length; i++) {
		tagSelect.appendChild(endTagList[i]);
	}

	if (countries[player]) {
		tagSelect.value = player;
	}

	if (countries[tagSelect.value]) {
		primaryCultureText.innerHTML = properNounDisplay(countries[tagSelect.value]['primary_culture']);

		if (countries[tagSelect.value]['accepted_cultures'].length > 0) {
			acceptedCultureText.innerHTML = '';
			for (let i=0; i<countries[tagSelect.value]['accepted_cultures'].length; i++) {
				acceptedCultureText.innerHTML += ', ' + properNounDisplay(countries[tagSelect.value]['accepted_cultures'][i]);
			}
			acceptedCultureText.innerHTML = acceptedCultureText.innerHTML.substring(2);
		} else {
			acceptedCultureText.innerHTML = 'None';
		}

		religionText.innerHTML = properNounDisplay(countries[tagSelect.value]['religion']);
	} else {
		primaryCultureText.innerHTML = 'None';
		acceptedCultureText.innerHTML = 'None';
		religionText.innerHTML = 'Noreligion';
	}

	tagSelect.addEventListener('change', function(event) {
		if (countries[this.value]) {
			primaryCultureText.innerHTML = properNounDisplay(countries[this.value]['primary_culture']);

			if (countries[this.value]['accepted_cultures'].length > 0) {
				acceptedCultureText.innerHTML = '';
				for (let i=0; i<countries[this.value]['accepted_cultures'].length; i++) {
					acceptedCultureText.innerHTML += ', ' + properNounDisplay(countries[this.value]['accepted_cultures'][i]);
				}
				acceptedCultureText.innerHTML = acceptedCultureText.innerHTML.substring(2);
			} else {
				acceptedCultureText.innerHTML = 'None';
			}

			religionText.innerHTML = properNounDisplay(countries[this.value]['religion']);
		}

		calculateEffects();
	});

	fromCultureSelect.addEventListener('change', function(event) {
		calculateEffects();
	});

	whereSelect.addEventListener('change', function(event) {
		calculateEffects();
	});

	calculateEffects();
	changeView(1);
}

function addPopForConversion(popsToConvert, pop, provinceAlreadyHit) {
	let provincesToConvertText = document.getElementById('provincesToConvertText');

	provincesToConvertText.innerHTML = (+provincesToConvertText.innerHTML + (provinceAlreadyHit ? 0 : 1)).toLocaleString();

	popsToConvert.push(pop);
}

function calculateEffects() {
	let tagSelect = document.getElementById('tagSelect');
	let fromCultureSelect = document.getElementById('fromCultureSelect');
	let whereSelect = document.getElementById('whereSelect');
	let popsToConvertText = document.getElementById('popsToConvertText');
	let provincesToConvertText = document.getElementById('provincesToConvertText');
	let conversionStats = document.getElementById('conversionStats');

	provincesToConvertText.innerHTML = 0;
	popsToConvertText.innerHTML = 0;

	let elementsToDelete = document.getElementsByClassName('popConversion');
	for (let i=elementsToDelete.length-1; i>=0; i--) {
		elementsToDelete[i].remove();
	}

	popsToConvert = [];

	if (!countries[tagSelect.value]) {
		let popConversionText = document.createElement('p');
		popConversionText.innerHTML = 'None';
		popConversionText.classList.add('popConversion');
		conversionStats.appendChild(popConversionText);
		return;
	}

	let convertTo = '';
	if (countries[tagSelect.value]['primary_culture'] == 'none') {
		if (countries[tagSelect.value]['accepted_cultures'].length > 0) {
			convertTo = countries[tagSelect.value]['accepted_cultures'][0];
		}
	} else {
		convertTo = countries[tagSelect.value]['primary_culture'];
	}

	if (convertTo != '') {
		switch (whereSelect.value) {
			case 'Owned Provinces':
				if (provinces['owned'][tagSelect.value]) {
					for (let i=0; i<provinces['owned'][tagSelect.value].length; i++) {
						let prov = provinces['owned'][tagSelect.value][i];
						let provHit = false;
						if (prov['pops']) {
							for (let j=0; j<prov['pops'].length; j++) {
								let pop = prov['pops'][j];
								if (pop['culture'] != convertTo) {
									let safe = false;
									switch (fromCultureSelect.value) {
										case 'Non-accepted':
											for (let k=0; k<countries[tagSelect.value]['accepted_cultures'].length; k++) {
												if (pop['culture'] == countries[tagSelect.value]['accepted_cultures'][k]) {
													safe = true;
													break;
												}
											}

											if (!safe) {
												addPopForConversion(popsToConvert, pop, provHit);
												provHit = true;
											}
											break;
										case 'Non-accepted and accepted not on their cores':
											for (let k=0; k<countries[tagSelect.value]['accepted_cultures'].length; k++) {
												if (pop['culture'] == countries[tagSelect.value]['accepted_cultures'][k]) {
													for (let k=0; k<prov['cores'].length; k++) {
														let tempCountry = countries[prov['cores'][k]];
														if (tempCountry) {
															if (tempCountry['primary_culture'] == pop['culture']) {
																safe = true;
																break;
															} else {
																for (let l=0; l<tempCountry['accepted_cultures'].length; l++) {
																	if (tempCountry['accepted_cultures'][l] == pop['culture']) {
																		safe = true;
																		break;
																	}
																}
															}
														}

														if (safe) {
															break;
														}
													}
												}

												if (safe) {
													break;
												}
											}

											if (!safe) {
												addPopForConversion(popsToConvert, pop, provHit);
												provHit = true;
											}
											break;
										case 'All':
											addPopForConversion(popsToConvert, pop, provHit);
											provHit = true;
											break;
									}
								}
							}
						}
					}
				}
				break;
			case 'Owned Core Provinces':
				break;
			case 'All Core Provinces':
				break;
			case 'All Owned and All Core Provinces':
				break;
		}
	}

	if (popsToConvert.length == 0) {
		let popConversionText = document.createElement('p');
		popConversionText.innerHTML = 'None';
		popConversionText.classList.add('popConversion');
		conversionStats.appendChild(popConversionText);
		return;
	}

	let totalPopsToConvert = 0;
	for (let i=0; i<popsToConvert.length; i++) {
		let pop = popsToConvert[i];
		let popConversionText = document.createElement('p');
		popConversionText.innerHTML = (+pop['size']).toLocaleString() + ' ' + properNounDisplay(pop['culture']) + ' ' + properNounDisplay(pop['type']) + ' in ' + pop['location'];
		popConversionText.classList.add('popConversion');
		conversionStats.appendChild(popConversionText);
		totalPopsToConvert += +pop['size']
	}

	popsToConvertText.innerHTML = totalPopsToConvert.toLocaleString();
}

function convert() {

}