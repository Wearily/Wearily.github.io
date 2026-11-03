class Player {

	constructor(){

		// screen coordinate values
		this.subs = []
		this.tile = [0, 0] // track which tile you're previously standing on
		this.tileHistory = [this.tile] // a list with only 10 items 
		this.x = 100
		this.y = 100
		this.speed = 5
		this.size = 40
		this.moveHistory = [ ]
		// this.world = ui
	}

	spawn(x, y){
		// place the player and reset the tile they start on
		this.x = x
		this.y = y
		this.tile = UI.getTileID(x, y)
		this.tileHistory = [this.tile]
	}

	addSub(object){
		this.subs.push(object)
	}

	updateTileHistory(){
		//update tile and tile history
		// change comparison to content rather than object itself
		if (!haveSameElements (this.tile, UI.getTileID(this.x, this.y) ) ) {
			//console.log("tilehistory:", this.tileHistory)
			this.tileHistory.push(UI.getTileID(this.x,this.y)) //adds to the end
			this.tile = UI.getTileID(this.x, this.y)
		}
		
		if (this.tileHistory.length > 10) {
			this.tileHistory = this.tileHistory.slice(-10)
		}

	}

	move(facing = -HALF_PI){
		/***
		 * facing: the angle the camera looks along the ground (radians)
		 * W walks that way, S walks back, A / D strafe
		 * the default (-HALF_PI) is north, same as the old fixed controls
		 */
		let forwardX = Math.cos(facing)
		let forwardY = Math.sin(facing)
		let rightX = -forwardY
		let rightY = forwardX
		let dx = 0
		let dy = 0

		// handle player movement
		if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
			this.moveHistory.push("left")
			dx -= rightX
			dy -= rightY
		}

		if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
			this.moveHistory.push("right")
			dx += rightX
			dy += rightY
		}

		if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
			this.moveHistory.push("up")
			dx += forwardX
			dy += forwardY
		}

		if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) {
			this.moveHistory.push("down")
			dx -= forwardX
			dy -= forwardY
		}

		// same speed in every direction (diagonals included), and stay inside the world
		let length = Math.hypot(dx, dy)
		let moveX = length > 0 ? dx / length : 0
		let moveY = length > 0 ? dy / length : 0
		this.x = constrain(this.x + moveX * this.speed, 0, UI.worldWidth - 1)
		this.y = constrain(this.y + moveY * this.speed, 0, UI.worldHeight - 1)

		
		// if any movement key is pressed
		if (keyIsDown(LEFT_ARROW) || keyIsDown(65) ||
			keyIsDown(RIGHT_ARROW) || keyIsDown(68) ||
			keyIsDown(UP_ARROW) || keyIsDown(87) ||
			keyIsDown(DOWN_ARROW) || keyIsDown(83)
		 ){

			//update stats
			this.updateTileHistory()
			
			this.broadcast({
				'name': "move",
				"tileInt": this.getCurrentTile(),
				'tileHistory': this.tileHistory,
				"moveHistory":this.moveHistory,
				"playerX": this.x,
				"playerY": this.y,
				"moveX": moveX, // direction actually walked (unit vector, 0 if keys cancel out)
				"moveY": moveY,
				"size":this.size
			})
		 }



	}

	static keyDirections = {
		37: "left", 65: "left",   // left arrow, A
		39: "right", 68: "right", // right arrow, D
		38: "up", 87: "up",       // up arrow, W
		40: "down", 83: "down"    // down arrow, S
	}

	pressKey(code){
		// moveHistory records every frame a key is held, so single taps get lost there
		let direction = Player.keyDirections[code]
		if (direction) {
			this.broadcast({
				'name': "key pressed",
				"direction": direction
			})
		}
	}

	fireworkLaunched(){
		this.broadcast({
			'name': "firework launched",
			"time": millis()
		})
	}

	getCurrentTile() {
		/*** 
		 * this function returns the tile type ( aka number)
		 * base on the player's current position
		 *
		 * args: None
		 *
		 * return : int
		 *
		 * error: returns None if index or divide by zero error
		 * 
		 */
		try{
			var col = Math.floor(this.x/ UI.tileWidth);
			var row = Math.floor(this.y/ UI.tileHeight);
			return UI.tiles[row][col];
		}
		catch(error){
			return null
		}
	}
	
	broadcast(event){
		// call the update function of all subs
		for (let sub of this.subs){
			sub.update(event)
		}
	}

}
