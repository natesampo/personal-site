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
		document.getElementById('downloadButton').download = 'New ' + file.name;
		reader.readAsText(file, 'ascii');
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

function removeAllChildren(element) {
	while (element && element.firstChild) {
		element.removeChild(element.firstChild);
	}
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

function improperNounDisplay(culture) {
	return culture.replace(/s/g, '_').toLowerCase();
}

function saveToString() {
	return save.join('\r\n');
}

function popToString(pop) {
	return (+pop['size']).toLocaleString() + ' ' + properNounDisplay(pop['culture']) + ' ' + properNounDisplay(pop['type']) + ' in ' + pop['location'];
}

function grabInfo(content) {
	let saveEditor = document.getElementById('saveEditor');
	let tagSelect = document.getElementById('tagSelect');
	let fromCultureSelect = document.getElementById('fromCultureSelect');
	let whereSelect = document.getElementById('whereSelect');
	let toCultureSelect = document.getElementById('toCultureSelect');
	let primaryCultureText = document.getElementById('primaryCultureText');
	let acceptedCultureText = document.getElementById('acceptedCultureText');
	let religionText = document.getElementById('religionText');
	let downloadButton = document.getElementById('downloadButton');
	removeAllChildren(tagSelect);
	removeAllChildren(toCultureSelect);
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
						trackingPop['line'] = i;
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
		let properPrimaryCulture = properNounDisplay(countries[tagSelect.value]['primary_culture']);
		let toCultureOption;
		if (properPrimaryCulture != 'None') {
			toCultureOption = document.createElement('option');
			toCultureOption.innerHTML = properPrimaryCulture;
			toCultureSelect.appendChild(toCultureOption);
		}

		primaryCultureText.innerHTML = properPrimaryCulture;

		if (countries[tagSelect.value]['accepted_cultures'].length > 0) {
			acceptedCultureText.innerHTML = '';
			for (let i=0; i<countries[tagSelect.value]['accepted_cultures'].length; i++) {
				let properAcceptedCulture = properNounDisplay(countries[tagSelect.value]['accepted_cultures'][i]);

				toCultureOption = document.createElement('option');
				toCultureOption.innerHTML = properAcceptedCulture;
				toCultureSelect.appendChild(toCultureOption);

				acceptedCultureText.innerHTML += ', ' + properAcceptedCulture;
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
		removeAllChildren(toCultureSelect);
		if (countries[this.value]) {
			let properPrimaryCulture = properNounDisplay(countries[this.value]['primary_culture']);
			let toCultureOption;
			if (properPrimaryCulture != 'None') {
				toCultureOption = document.createElement('option');
				toCultureOption.innerHTML = properPrimaryCulture;
				toCultureSelect.appendChild(toCultureOption);
			}

			primaryCultureText.innerHTML = properPrimaryCulture;

			if (countries[this.value]['accepted_cultures'].length > 0) {
				acceptedCultureText.innerHTML = '';
				for (let i=0; i<countries[this.value]['accepted_cultures'].length; i++) {
					let properAcceptedCulture = properNounDisplay(countries[this.value]['accepted_cultures'][i]);

					toCultureOption = document.createElement('option');
					toCultureOption.innerHTML = properAcceptedCulture;
					toCultureSelect.appendChild(toCultureOption);

					acceptedCultureText.innerHTML += ', ' + properAcceptedCulture;
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

	toCultureSelect.addEventListener('change', function(event) {
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

function calculateProvince(prov, convertTo, tag, fromCultureSelectValue) {
	let provHit = false;
	if (prov['pops']) {
		for (let i=0; i<prov['pops'].length; i++) {
			let pop = prov['pops'][i];
			if (properNounDisplay(pop['culture']) != convertTo) {
				let safe = false;
				switch (fromCultureSelectValue) {
					case 'Non-accepted':
						if (pop['culture'] != countries[tag]['primary_culture']) {
							for (let j=0; j<countries[tag]['accepted_cultures'].length; j++) {
								if (pop['culture'] == countries[tag]['accepted_cultures'][j]) {
									safe = true;
									break;
								}
							}

							if (!safe) {
								addPopForConversion(popsToConvert, pop, provHit);
								provHit = true;
							}
						}
						break;
					case 'Non-accepted and accepted not on their cores':
						let accepted = false;
						if (pop['culture'] != countries[tag]['primary_culture']) {
							for (let j=0; j<countries[tag]['accepted_cultures'].length; j++) {
								if (pop['culture'] == countries[tag]['accepted_cultures'][j]) {
									accepted = true;
									break;
								}
							}
						}

						if (pop['culture'] == countries[tag]['primary_culture'] || accepted) {
							for (let j=0; j<prov['cores'].length; j++) {
								let tempCountry = countries[prov['cores'][j]];
								if (tempCountry) {
									if (tempCountry['primary_culture'] == pop['culture']) {
										safe = true;
										break;
									} else {
										for (let k=0; k<tempCountry['accepted_cultures'].length; k++) {
											if (pop['culture'] == tempCountry['accepted_cultures'][k]) {
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

						if (!safe) {
							addPopForConversion(popsToConvert, pop, provHit);
							provHit = true;
						}
						break;
					case 'Non-primary':
						if (pop['culture'] != countries[tag]['primary_culture']) {
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

function calculateEffects() {
	let tagSelect = document.getElementById('tagSelect');
	let fromCultureSelect = document.getElementById('fromCultureSelect');
	let whereSelect = document.getElementById('whereSelect');
	let toCultureSelect = document.getElementById('toCultureSelect');
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

	if (toCultureSelect.value != '') {
		switch (whereSelect.value) {
			case 'Owned Provinces':
				if (provinces['owned'][tagSelect.value]) {
					for (let i=0; i<provinces['owned'][tagSelect.value].length; i++) {
						calculateProvince(provinces['owned'][tagSelect.value][i], toCultureSelect.value, tagSelect.value, fromCultureSelect.value);
					}
				}
				break;
			case 'Owned Core Provinces':
				if (provinces['ownedCores'][tagSelect.value]) {
					for (let i=0; i<provinces['ownedCores'][tagSelect.value].length; i++) {
						calculateProvince(provinces['ownedCores'][tagSelect.value][i], toCultureSelect.value, tagSelect.value, fromCultureSelect.value);
					}
				}
				break;
			case 'All Core Provinces':
				if (provinces['cores'][tagSelect.value]) {
					for (let i=0; i<provinces['cores'][tagSelect.value].length; i++) {
						calculateProvince(provinces['cores'][tagSelect.value][i], toCultureSelect.value, tagSelect.value, fromCultureSelect.value);
					}
				}
				break;
			case 'All Owned and All Core Provinces':
				let provsHit = [];
				if (provinces['owned'][tagSelect.value]) {
					for (let i=0; i<provinces['owned'][tagSelect.value].length; i++) {
						provsHit.push(provinces['owned'][tagSelect.value][i]);
						calculateProvince(provinces['owned'][tagSelect.value][i], toCultureSelect.value, tagSelect.value, fromCultureSelect.value);
					}
				}

				if (provinces['cores'][tagSelect.value]) {
					for (let i=0; i<provinces['cores'][tagSelect.value].length; i++) {
						let safe = true;
						for (let j=0; j<provsHit.length; j++) {
							if (provinces['cores'][tagSelect.value][i] == provsHit[j]) {
								safe = false;
								break;
							}
						}

						if (safe) {
							calculateProvince(provinces['cores'][tagSelect.value][i], toCultureSelect.value, tagSelect.value, fromCultureSelect.value);
						}
					}
				}
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

	let popConversionCheckAll = document.createElement('input');
	popConversionCheckAll.type = 'checkbox';
	popConversionCheckAll.id = 'popConversionCheckAll';
	popConversionCheckAll.name = 'popConversionCheckAll';
	popConversionCheckAll.checked = true;
	popConversionCheckAll.onclick = function () {
		let otherCheckboxes = document.getElementsByClassName('popConversionCheckbox');
		for (let i=0; i<otherCheckboxes.length; i++) {
			otherCheckboxes[i].checked = this.checked;
		}
	};

	let popConversionCheckAllLabel = document.createElement('label');
	popConversionCheckAllLabel.htmlFor = 'popConversionCheckAll';
	popConversionCheckAllLabel.innerHTML = 'Select All';
	popConversionCheckAllLabel.id = 'popConversionCheckAllLabel';
	popConversionCheckAllLabel.classList.add('popConversionLabel');

	let popConversionCheckAllDiv = document.createElement('div');
	popConversionCheckAllDiv.classList.add('popConversion');
	popConversionCheckAllDiv.appendChild(popConversionCheckAll);
	popConversionCheckAllDiv.appendChild(popConversionCheckAllLabel);

	conversionStats.appendChild(popConversionCheckAllDiv);

	let totalPopsToConvert = 0;
	for (let i=0; i<popsToConvert.length; i++) {
		let pop = popsToConvert[i];
		let popStr = popToString(pop);

		let popConversionCheckbox = document.createElement('input');
		popConversionCheckbox.type = 'checkbox';
		popConversionCheckbox.id = popStr;
		popConversionCheckbox.name = popStr;
		popConversionCheckbox.checked = true;
		popConversionCheckbox.classList.add('popConversionCheckbox');
		popConversionCheckbox.onclick = function () {
			if (!this.checked) {
				document.getElementById('popConversionCheckAll').checked = false;
				return;
			}

			let otherCheckboxes = document.getElementsByClassName('popConversionCheckbox');
			for (let j=0; j<otherCheckboxes.length; j++) {
				if (!otherCheckboxes[j].checked) {
					return;
				}
			}

			document.getElementById('popConversionCheckAll').checked = true;
		};

		let popConversionLabel = document.createElement('label');
		popConversionLabel.htmlFor = popStr;
		popConversionLabel.innerHTML = popStr;
		popConversionLabel.classList.add('popConversionLabel');

		let popConversionDiv = document.createElement('div');
		popConversionDiv.classList.add('popConversion');
		popConversionDiv.appendChild(popConversionCheckbox);
		popConversionDiv.appendChild(popConversionLabel);

		conversionStats.appendChild(popConversionDiv);
		totalPopsToConvert += +pop['size'];
	}

	popsToConvertText.innerHTML = totalPopsToConvert.toLocaleString();
}

function convert() {
	let tagSelect = document.getElementById('tagSelect');
	let religionSelect = document.getElementById('religionSelect');
	let toCultureSelect = document.getElementById('toCultureSelect');
	let totalPopsConvertedText = document.getElementById('totalPopsConvertedText');
	let totalProvincesConvertedText = document.getElementById('totalProvincesConvertedText');
	let downloadButton = document.getElementById('downloadButton');

	if (toCultureSelect.value == '') {
		return;
	}

	let numPops = +totalPopsConvertedText.innerHTML.replace(/\,/g, '');
	let numProvinces = +totalProvincesConvertedText.innerHTML.replace(/\,/g, '');

	let provsHit = [];

	for (let i=popsToConvert.length-1; i>=0; i--) {
		let pop = popsToConvert.pop();

		let popCheckbox = document.getElementById(popToString(pop));
		if (popCheckbox && popCheckbox.checked) {
			let split = save[pop['line']].split('=');
			save[pop['line']] = improperNounDisplay(toCultureSelect.value) + '='
				+ (religionSelect.value == 'Convert to Country Religion' ? countries[tagSelect.value]['religion'] : split[1]);

			pop['culture'] = toCultureSelect.value.toLowerCase().replace(/ /g, '_');
			if (religionSelect.value == 'Convert to Country Religion') {
				pop['religion'] = countries[tagSelect.value]['religion'];
			}

			numPops += +pop['size'];

			let alreadyHit = false;
			for (let j=0; j<provsHit.length; j++) {
				if (pop['location'] == provsHit[j]) {
					alreadyHit = true;
					break;
				}
			}
			if (!alreadyHit) {
				numProvinces++;
				provsHit.push(pop['location']);
			}
		}
	}

	totalPopsConvertedText.innerHTML = numPops.toLocaleString();
	totalProvincesConvertedText.innerHTML = numProvinces.toLocaleString();

	if (numPops > 0) {
		downloadButton.href = 'data:text/plain;charset=ascii,' + escape(saveToString());
		downloadButton.style['display'] = 'inline-block';
	}

	calculateEffects();
}