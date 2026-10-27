/***
 * 0 = grass
 * 1 = sand
 * 2 = water
 *
 */

// singletons
var audioEngine = new MyAudioEngine()
var achievementSys = new AchievementSystem()
var particleEngine = new ParticleEngine(20000)
var player = new Player()

player.addSub(audioEngine)
player.addSub(achievementSys)
player.addSub(particleEngine)

achievementSys.addSub(particleEngine)


const sampleInt = setInterval(()=>{
	console.log("active:",particleEngine.active.length)
	console.log("available:",particleEngine.inactive.length)

},5000)

function preload(){
	audioEngine.loadSoundFiles()
}

// runs once by p5 engine upon loading
function setup() {
	createCanvas(UI.canvasWidth, UI.canvasHeight, document.getElementById("myCanvas"));
	outputVolume(0.3, 0.1);
	frameRate(60);

	// move later
	const achievementArea = document.getElementById("achievement-area")
	for (let key in achievementSys.achievements){
		let achievement = document.createElement("div")
		achievement.id = key
		achievement.innerHTML = key
		achievement.classList.add("achievement")
		achievementArea.appendChild(achievement)
	}
}

// continiously called by the p5 engine
function draw() {
	background(220);

	// draw the tiles
	for (let y = 0; y < UI.tileDivisor; y++) {
		for (let x = 0; x < UI.tileDivisor; x++) {
			let c;
			if (UI.tiles[y][x] == 0) {
				c = color(0, 200, 0);
			} else if (UI.tiles[y][x] == 1) {
				c = color(194, 178, 128);
			} else {
				c = color(9, 195, 219);
			}
			fill(c);
			rect(x * UI.tileWidth, y * UI.tileHeight, UI.tileWidth, UI.tileHeight);
		}
	}

	// write code to render a seperate section to render all the achievements the player has collected 


	fill(255, 0, 0);
	noStroke();
	ellipse(player.x, player.y, player.size, player.size);
	player.move()

	//particles 
	
	for (let id of particleEngine.active){
		if (particleEngine.particles[id].lifetime > 0){
			particleEngine.particles[id].render()
			particleEngine.particles[id].update()
		}
	}

	particleEngine.cleanUp()

}


function keyPressed() {
}

function mouseClicked() {
	// Code to run. "mouseX" for mouse x coordinate, "mouseY"
	console.log("clicked!")
 	particleEngine.createFirework()
}
