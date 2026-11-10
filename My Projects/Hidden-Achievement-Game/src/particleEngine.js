/**
 * Dust particles speed should depend on player speed,
 * if the player is holding down a button, their speed should increase due to acceleration
 * so that when the player do a quick pivit in direction, their speed is set to 0, and the dust should
 * now settle at the location instead of flying off in a direction
 * 
 */


function randomInt(min, max) {
	// Example: min = -10, max = -1
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

class Particles{

	constructor(x,y,radius, lifetime, color = [255,255,255], isFirework = false ){
		this.x = x
		this.y = y
		this.speed = 0
		this.dx = 0 //smallest x step we can take, to maintain a give angle
		this.dy = 0 //smallest y step we can take, to maintain a give angle
		this.radius = radius
		this.lifetime = lifetime // track current life
		this.maxtime = lifetime // track initial life 
		this.r = color[0]
		this.g = color[1]
		this.b = color[2]
		this.colorDec = 0.5;
		this.radiusDec = radius/lifetime;

		this.isFirework = isFirework
		this.gravity = 0
		this.drag = 1
		this.z = 0  // dust only: height above the terrain
		this.dz = 0 // dust only: upward speed
	}

	update(){
		// what attributes will change if I want the dust trail effect?
		if (this.lifetime <= 0){
			return
		}

		//changing the radius of the particle
		if ((this.radius - this.radiusDec) > 1) {
			this.radius = this.radius - this.radiusDec;
		} else {
			this.radius = 1;
		}

		//negative numbers to be register as black
		this.r = Math.floor(this.r - this.colorDec);
		this.g = Math.floor(this.g - this.colorDec);
		this.b = Math.floor(this.b - this.colorDec)

		this.dx *= this.drag;
		this.dy *= this.drag;

		if (this.isFirework) {
			this.dy += this.gravity; // screen space, pulls down the screen
		} else {
			// dust gets kicked up off the ground and falls back onto it
			this.z = Math.max(0, this.z + this.dz);
			this.dz -= this.gravity;
		}
		
		//movement physic
		this.x += this.dx 
		this.y += this.dy

		
		this.lifetime--;

	}

	render(){
		let c = color(this.r,this.g,this.b)
		fill(c)
		circle(this.x, this.y, this.radius)
	}

}

class ParticleEngine {

	// dust trail for each tile type, same keys as Terrain.biomes (0 grass, 1 sand, 2 water)
	// size / lifespan are [min, max], spread is in degrees around the direction behind the player
	static trails = {
		0: { // grass: a few clippings flicked up that drop straight back down
			amount: 3, speed: 2.5, spread: 50, size: [4, 7], lifespan: [14, 22],
			drag: 0.9, lift: 2, gravity: 0.25,
			colors: [[150, 225, 70], [190, 235, 110], [110, 180, 40]] // lighter than the grass so it shows up
		},
		1: { // sand: a wide, slow cloud that hangs in the air before settling
			amount: 6, speed: 1.5, spread: 80, size: [8, 14], lifespan: [25, 40],
			drag: 0.94, lift: 0.4, gravity: 0.01,
			colors: [[225, 205, 155], [200, 180, 130], [240, 225, 180]]
		},
		2: { // water: droplets spray out to the sides and splash back in
			amount: 5, speed: 3, spread: 140, size: [3, 6], lifespan: [18, 26],
			drag: 0.96, lift: 3, gravity: 0.3,
			colors: [[200, 240, 255], [150, 220, 245], [255, 255, 255]]
		},
	}

	constructor(amount){
		this.particles = [ ] // all particles data
		this.active = [] // store all the active IDs ( the ids are just list indices)
		this.inactive = [] //store the indices for inactive particles
		this.lastTile = null // tile type from the last move event, to spot the player stepping onto new terrain

		// create a "amount" amount of particles and store them into this.particles list, then set them to all be inactive
		for (var i = 0; i < amount; i++) {
			this.particles.push( new Particles ( 0 , 0 , 0 , 1 ) )
			this.inactive.push(i)
		}
	}

	update(event){

		/**
		 *				let xoffset = randomNegativeInt (-10, 10) 
				let yoffset = randomNegativeInt (-10, 10) 
				let r = randomNegativeInt (15, 25) 
				this.particles.push( new Particles ( event.playerX + xoffset , 
																					event.playerY + player.size/2 + yoffset , 
																					r, 
																					255) )
		 * 
		 */
		if (event.name == "achievement complete"){
			for (let i = 0; i < 40; i++){
				this.createFirework()
			}
		}
		
		if (event.name == "toast shown"){
			// ring of fireworks around the toast
			let cx = event.x + event.w / 2
			let cy = event.y + event.h / 2
			let bursts = 10
			for (let i = 0; i < bursts; i++){
				let angle = (i / bursts) * Math.PI * 2
				this.createFirework(cx + Math.cos(angle) * (event.w / 2 + 30),
									cy + Math.sin(angle) * (event.h / 2 + 30),
									25)
			}
		}

		if (event.name == "move" && (event.moveX != 0 || event.moveY != 0)){
			let trail = ParticleEngine.trails[event.tileInt]
			if (!trail) {return}

			// movement follows the camera now, so kick dust out behind the actual walking direction
			// (createDust angles are in degrees with y flipped, 270 = straight down the screen)
			let angle = Math.atan2(event.moveY, -event.moveX) * 180 / Math.PI
			this.createDust(event.playerX - event.moveX * 20,
							event.playerY - event.moveY * 20,
							angle, trail)

			// stepping onto a different terrain throws up a ring of it all around the player
			if (this.lastTile != null && this.lastTile != event.tileInt){
				this.createDust(event.playerX, event.playerY, angle, trail, trail.amount * 5, 360)
			}
			this.lastTile = event.tileInt
		}

	}

	createDust(x, y, angle, trail = ParticleEngine.trails[0], amount = trail.amount, spread = trail.spread){
		 // aquire
		 for (let i = 0; i < amount ; i ++){
			 if (this.inactive.length === 0) {break}

			 let id = this.activate() // return a particle id that is from the inactive list, and add to the active

			//change the info on the particle
			 let xoffset = randomInt (-10, 10)
			 let yoffset = randomInt (-5, 5)

			 let part = this.particles[id]

			 part.lifetime = randomInt(trail.lifespan[0], trail.lifespan[1])
			 part.maxtime = part.lifetime;
			 part.x = x + xoffset
			 part.y = y + yoffset

			 // set speed and direction, fanned out by the trail's spread
			 let partAngle = angle + (Math.random() - 0.5) * spread
			 part.speed = trail.speed * (0.5 + Math.random())
			 part.dx = part.speed * Math.cos(partAngle*(Math.PI / 180))
			 part.dy = part.speed * Math.sin(partAngle*(Math.PI / 180)) * -1

			 // throw it up off the ground, gravity brings it back down
			 part.z = 0
			 part.dz = trail.lift * (0.5 + Math.random())
			 part.gravity = trail.gravity
			 part.drag = trail.drag

			 part.radius = randomInt(trail.size[0], trail.size[1])
			 part.radiusDec = part.radius/ part.lifetime;

			 part.isFirework = false; // set to false
			 part.colorDec = 0.5

			 let base = trail.colors[randomInt(0, trail.colors.length - 1)]
			 part.r = Math.min(255, base[0] + randomInt(-15,15))
			 part.g = Math.min(255, base[1] + randomInt(-15,15))
			 part.b = Math.min(255, base[2] + randomInt(-15,15))
		 }
	}

	createFirework(x=randomInt(50, width - 50), y=randomInt(20,100), amount = 40) {
		let baseR = randomInt(100,255)
		let baseG = randomInt(100,255)
		let baseB = randomInt(100,255)

		for (let i = 0; i < amount; i++) {
			if (this.inactive.length === 0) {break}
			let id = this.activate()

			let part = this.particles[id]
			part.lifetime = randomInt(35,60)
			part.maxtime = part.lifetime
			part.x = x
			part.y = y

			let angle = Math.random() * 360
			let speed = randomInt(2,6)
			part.dx = Math.cos(angle*(Math.PI / 180)) * speed
			part.dy = Math.sin(angle*(Math.PI / 180)) * speed

			part.radius = randomInt(5,8)
			part.radiusDec = part.radius / part.lifetime
			part.colorDec = 1.5

			part.isFirework = true
			part.gravity = .12
			part.drag = .98

			part.r = Math.min(255, baseR + randomInt(-20,20))
			part.g = Math.min(255, baseG + randomInt(-20,20))
			part.b = Math.min(255, baseB + randomInt(-20,20))

			
		}
	}

	activate(){
		/**this function returns a id from the inactive list , and appends the id to the active list*/
		if (this.inactive.length > 0){
			var i = this.inactive.pop();
			this.active.push(i);
			return i;
		}else{
			throw new Error("OUT OF ACTIVE PARTICLES");
		}

	}

	cleanUp(){ // this function will clear particles in the list that are dead

		//0 1 2 3 4 5 6  8
		for (var i = this.active.length-1; i >= 0; i--) {
			var id = this.active[i]
			
			if (this.particles[id].lifetime <= 0) {
				this.inactive.push(id);
				this.active.splice(i,1)
			}
		}

	}
	
}
