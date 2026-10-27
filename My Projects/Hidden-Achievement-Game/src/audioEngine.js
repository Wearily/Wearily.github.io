class MyAudioEngine {
	soundEffects = {};
	
	loadSoundFiles() {
		this.soundEffects["grass"] = loadSound('assets/sounds/grass.wav');
		this.soundEffects["sand"] = loadSound('assets/sounds/sand.wav');
		this.soundEffects["water"] = loadSound('assets/sounds/water.wav');
	}

	
	playSound(tileInt) {
		let soundName = UI.getTileName(tileInt);
		if (soundName != null && !this.soundEffects[soundName].isPlaying()) {
			//console.log("Playing:", soundName);
			this.soundEffects[soundName].play();
		}
	}

	update(event){
		//console.log("event:",JSON.stringify(event))
		if (event.name == "move"){
			this.playSound(event.tileInt)
		}
	}
}
