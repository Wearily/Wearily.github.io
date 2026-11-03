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
var terrain = new Terrain()
var birdCam = new BirdCamera() // not "camera", that's a p5 function

// where the mouse went down, used to tell a click from a camera drag
var pressX = 0
var pressY = 0

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
	createCanvas(UI.canvasWidth, UI.canvasHeight, WEBGL, document.getElementById("myCanvas"));
	outputVolume(0.3, 0.1);
	frameRate(60);

	terrain.generate()
	birdCam.setup(player.x, player.y, terrain.heightAt(player.x, player.y))

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
	background(170, 210, 235); // sky
	noStroke();

	// move first so the camera doesn't lag a frame behind
	player.move()
	let groundZ = terrain.heightAt(player.x, player.y)
	birdCam.update(player.x, player.y, groundZ)

	// draw the terrain
	ambientLight(120);
	directionalLight(255, 250, 235, 0.4, 0.5, -1);
	terrain.render()

	// write code to render a seperate section to render all the achievements the player has collected


	// player sits on top of the terrain
	push();
	translate(player.x, player.y, groundZ + player.size / 2);
	fill(255, 0, 0);
	sphere(player.size / 2, 6, 4);
	pop();

	//particles

	// dust lives in the world, lift it onto the terrain
	for (let id of particleEngine.active){
		let part = particleEngine.particles[id]
		if (part.lifetime > 0 && !part.isFirework){
			push()
			translate(0, 0, terrain.heightAt(part.x, part.y) + 2)
			part.render()
			pop()
			part.update()
		}
	}

	// fireworks are drawn on top of everything in screen coords
	birdCam.beginHUD()
	for (let id of particleEngine.active){
		let part = particleEngine.particles[id]
		if (part.lifetime > 0 && part.isFirework){
			part.render()
			part.update()
		}
	}
	birdCam.endHUD()

	particleEngine.cleanUp()

}


function keyPressed() {
}

function mousePressed() {
	pressX = mouseX
	pressY = mouseY
}

function mouseClicked() {
	// Code to run. "mouseX" for mouse x coordinate, "mouseY"
	// ignore clicks that were really camera drags
	if (dist(mouseX, mouseY, pressX, pressY) > 4) {return}
	console.log("clicked!")
 	particleEngine.createFirework()
}
