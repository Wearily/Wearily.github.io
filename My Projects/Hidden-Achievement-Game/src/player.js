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

	move(){

		// handle player movement
		if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
			this.moveHistory.push("left")
			
			if (this.x >= 0) {
				this.x -= this.speed;
			}
		}
		
		if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
			this.moveHistory.push("right")

			if (this.x <= UI.canvasWidth) {
				this.x += this.speed;
			}
		}
		
		if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
			this.moveHistory.push("up")

			if (this.y - this.speed > 0) {
				this.y -= this.speed;
			}

		}
		
		if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) {
			this.moveHistory.push("down")

			if (this.y+this.speed < UI.canvasHeight) {
				this.y += this.speed;
			}

		}

		
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
				"size":this.size
			})
		 }



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
