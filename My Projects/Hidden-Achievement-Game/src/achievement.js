/**
 * The achievement system will track all the possible achievements we can obtain
 * - we need player's tile history []
 * - player's key input history []
 * - player's coordinate []
 * - timing element
 * - We need a way to identify the start time of a event or achievement procedure sequence
 *
 * 
 */

class AchievementSystem{
	/**
	 *	event = {
	 *.  "name": "move",
	 *   "tileHistory": [...],
	 *  }
	 *
	 *
	 * 
	 */
	constructor(){
		this.subs = []

		// state for the newer achievements
		this.visited = new Set()  // "x,y" ids of every tile stepped on (tileHistory only keeps 10)
		this.distance = 0         // total distance walked
		this.lastPos = null       // player position on the previous move event
		this.peak = null          // highest terrain height, found on first use
		this.statueTimer = null   // restarts on every move
		this.keyHistory = []      // single key taps, newest last
		this.fireworkTimes = []   // millis() of recent click fireworks
		this.cameraTurn = 0       // signed camera rotation around the player (radians)
		this.visitedLand = new Set() // visited tiles that aren't water
		this.landCount = null     // number of island tiles, found on first use
		this.firstUnlockTime = null // millis() when the first achievement was unlocked
		this.allComplete = false
 	}

	achievements = {
		"touch grass": false, // will be achieve if the last 5 tiles are grass tile
		"stay hydrated": false, // last 5 tiles are water
		"looking for oil": false, // last 5 tiles are sand
		"oasis": false, // 3 sand, then last 3 water
		"dizzy":false,
		"cartographer": false, // visit every tile on the island
		"four corners": false, // stand on all 4 corner tiles
		"king of the hill": false, // stand on the highest point of the terrain
		"edge of the world": false, // walk into the edge of the map
		"triathlon": false, // grass, sand, water, sand, grass in that order
		"marathon": false, // walk 20,000 units in total
		"statue": false, // don't move for 30 seconds
		"konami code": false, // up up down down left right left right
		"bird's eye": false, // rotate the camera a full circle
		"pyromaniac": false // click 20 fireworks within 10 seconds
	}

	static triathlon = ["grass", "sand", "water", "sand", "grass"]
	static konami = ["up", "up", "down", "down", "left", "right", "left", "right"]

	addSub(object){
		this.subs.push(object)
	}

	update(event){
		/*** 
		 *
		 *
		 *
		 *
		 */
		
			if (event.name == "move"){
				//console.log("idtoTYpeHistory:", UI.idToTypeList(event.tileHistory.slice(-5)))
				if (haveSameElements( UI.idToTypeList(event.tileHistory.slice(-5)),
															["grass","grass","grass","grass","grass"]) &&
						!this.achievements["touch grass"] ){
							this.achievements["touch grass"] = true
							
							document.getElementById("touch grass").style.backgroundColor = "#ffffff"
						  
							console.log("YOU TOUCHED GRASS!")
						this.broadcast({
							name: "achievement complete",
							achievementName : "Touch Grass"
						})
					
				}
				else if (haveSameElements( UI.idToTypeList(event.tileHistory.slice(-5)),
															["water","water","water","water","water"]) &&
						!this.achievements["stay hydrated"] ){
							this.achievements["stay hydrated"] = true
							document.getElementById("stay hydrated").style.backgroundColor = "#ffffff"
							console.log("Way to stay hydrated!")
						this.broadcast({
							name: "achievement complete",
							achievementName : "Stay Hydrated"
						})

				}
				else if (haveSameElements( UI.idToTypeList(event.tileHistory.slice(-6)),
															["sand","sand","sand","water","water","water"]) &&
						!this.achievements["oasis"] ){
							this.achievements["oasis"] = true
							document.getElementById("oasis").style.backgroundColor = "#ffffff"
							console.log("What a nice stay it has been!")
						this.broadcast({
							name: "achievement complete",
							achievementName : "Oasis"
						})
				}
					
				else if (haveSameElements( UI.idToTypeList(event.tileHistory.slice(-5)),
															["sand","sand","sand","sand","sand"]) &&
						!this.achievements["looking for oil"] ){
							this.achievements["looking for oil"] = true
							document.getElementById("looking for oil").style.backgroundColor = "#ffffff"

							console.log("$$$$$$$ OIL $$$$$$$$")
						this.broadcast({
							name: "achievement complete",
							achievementName : "Looking For Oil"
						})
				}
				else if (haveSameElements( event.moveHistory.slice(-4),
															["up","right","down", "left"]) &&
						!this.achievements["dizzy"] ){
							this.achievements["dizzy"] = true
					    document.getElementById("dizzy").style.backgroundColor = "#ffffff"

							console.log("Woaahhhah... 🤮!")
						this.broadcast({
							name: "achievement complete",
							achievementName : "Dizzy"
						})

				}
			}

			// newer achievements are checked on their own, so several can unlock on the same step
			if (event.name == "move"){
				this.checkExploring(event)
				this.checkStatue()
			}

			if (event.name == "key pressed"){
				this.keyHistory.push(event.direction)
				this.keyHistory = this.keyHistory.slice(-AchievementSystem.konami.length)
				if (haveSameOrder(this.keyHistory, AchievementSystem.konami)){
					this.unlock("konami code", "Konami Code", "↑ ↑ ↓ ↓ ← → ← → ... cheater!")
				}
			}

			if (event.name == "camera moved"){
				this.cameraTurn += event.turn
				if (Math.abs(this.cameraTurn) >= Math.PI * 2){
					this.unlock("bird's eye", "Bird's Eye", "You circled like a hawk")
				}
			}

			if (event.name == "firework launched"){
				// only keep clicks from the last 10 seconds
				this.fireworkTimes.push(event.time)
				this.fireworkTimes = this.fireworkTimes.filter(t => t > event.time - 10000)
				if (this.fireworkTimes.length >= 20){
					this.unlock("pyromaniac", "Pyromaniac", "🔥🔥🔥 Someone stop them 🔥🔥🔥")
				}
			}

			this.trackProgress()
	}

	trackProgress(){
		// start the clock on the first achievement, report the total time once they're all done
		let unlocked = Object.values(this.achievements).filter(done => done).length

		if (unlocked > 0 && this.firstUnlockTime === null){
			this.firstUnlockTime = millis()
		}

		if (unlocked == Object.keys(this.achievements).length && !this.allComplete){
			this.allComplete = true
			let totalTime = millis() - this.firstUnlockTime
			console.log("ALL ACHIEVEMENTS COMPLETE in", totalTime, "ms")
			this.broadcast({
				name: "all achievements complete",
				totalTime: totalTime
			})
		}
	}

	checkExploring(event){
		let last = UI.tileDivisor - 1
		let tile = event.tileHistory.at(-1)

		// the player can step a few pixels off the left / right edge, ignore those tile ids
		if (tile[0] >= 0 && tile[0] <= last && tile[1] >= 0 && tile[1] <= last){
			let id = tile[0] + "," + tile[1]
			this.visited.add(id)
			if (UI.tiles[tile[1]][tile[0]] != 2){
				this.visitedLand.add(id)
			}
		}

		// cartographer, every tile on the island (the ocean doesn't count)
		if (this.landCount === null){
			this.landCount = UI.tiles.flat().filter(type => type != 2).length
		}
		if (this.visitedLand.size == this.landCount){
			this.unlock("cartographer", "Cartographer", "You've seen it all!")
		}

		let corners = ["0,0", last + ",0", "0," + last, last + "," + last]
		if (corners.every(id => this.visited.has(id))){
			this.unlock("four corners", "Four Corners", "Every corner of the world")
		}

		if (haveSameOrder(UI.idToTypeList(event.tileHistory.slice(-5)), AchievementSystem.triathlon)){
			this.unlock("triathlon", "Triathlon", "Run, swim, run!")
		}

		// king of the hill, reads the terrain singleton
		if (this.peak === null){
			this.peak = Math.max(...terrain.heights.flat())
		}
		if (terrain.heightAt(event.playerX, event.playerY) >= this.peak - 5){
			this.unlock("king of the hill", "King of the Hill", "On top of the world!")
		}

		// the player is kept between 0 and the world size - 1
		if (event.playerX <= 0 || event.playerX >= UI.worldWidth - 1 ||
			event.playerY <= 0 || event.playerY >= UI.worldHeight - 1){
			this.unlock("edge of the world", "Edge of the World", "Here be dragons")
		}

		// marathon, add up how far the player actually moved
		if (this.lastPos){
			this.distance += Math.hypot(event.playerX - this.lastPos[0], event.playerY - this.lastPos[1])
		}
		this.lastPos = [event.playerX, event.playerY]
		if (this.distance >= 20000){
			this.unlock("marathon", "Marathon", "26.2 miles later...")
		}
	}

	checkStatue(){
		// every move restarts the 30 second countdown
		clearTimeout(this.statueTimer)
		if (!this.achievements["statue"]){
			this.statueTimer = setTimeout(() => {
				this.unlock("statue", "Statue", "Are you still there?")
			}, 30000)
		}
	}

	unlock(key, achievementName, message){
		// same steps as the original achievements: flag, side panel, log, broadcast
		if (this.achievements[key]) {return}
		this.achievements[key] = true
		document.getElementById(key).style.backgroundColor = "#ffffff"
		console.log(message)
		this.broadcast({
			name: "achievement complete",
			achievementName : achievementName
		})
		this.trackProgress() // statue unlocks from a timer, outside update()
	}


	broadcast(event){
		// call the update function of all subs
		for (let sub of this.subs){
			sub.update(event)
		}
	}
}


