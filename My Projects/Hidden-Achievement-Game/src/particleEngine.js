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

		if (this.isFirework) {
			this.dx *= this.drag;
			this.dy *= this.drag;
			this.dy += this.gravity;
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

	constructor(amount){
		this.particles = [ ] // all particles data
		this.active = [] // store all the active IDs ( the ids are just list indices)
		this.inactive = [] //store the indices for inactive particles

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
		
		if (event.name == "move"){
			if (event.moveHistory.at(-1) == "up") {
				this.createDust(event.playerX, event.playerY+20, 5, 2, 270, 5 ,10 )		
			}
			else if (event.moveHistory.at(-1) == "down") {
				this.createDust(event.playerX, event.playerY-20, 5,  2,  90, 5,10  )		
			}
			else if (event.moveHistory.at(-1) == "left") {
				this.createDust(event.playerX, event.playerY+20, 5,  2,  0, 5,10  )		
			}
			else if (event.moveHistory.at(-1) == "right") {
				this.createDust(event.playerX, event.playerY+20, 5, 2, 180, 5, 10  )		
			}
		}

	}

	createDust(x,y,amount,speed,angle,size,lifespan){
		 // aquire 
		 for (let i = 0; i < amount ; i ++){
			 if (this.inactive.length === 0) {break}

			 let id = this.activate() // return a particle id that is from the inactive list, and add to the active
			
			//change the info on the particle
			 let xoffset = randomInt (-10, 10) 
			 let yoffset = randomInt (-5, 5) 
			 
			 let part = this.particles[id]
	
			 part.lifetime = lifespan
			 part.maxtime = lifespan;
			 part.x = x + xoffset
			 part.y = y + yoffset

			 // set speed and direction
			 part.speed = speed
			 part.dx = part.speed * Math.cos(angle*(Math.PI / 180))
			 part.dy = part.speed * Math.sin(angle*(Math.PI / 180)) * -1


			 part.radius = size
			 part.radiusDec = part.radius/ part.lifetime;

			 part.isFirework = false; // set to false
			 part.colorDec = 0.5
			 
			 part.r = randomInt(200,255)
			 part.g = randomInt(200,255)
			 part.b = randomInt(200,255)
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
