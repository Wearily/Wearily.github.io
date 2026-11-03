class UI {
	static tiles = []; // filled by generateIsland() in setup()

	// size of the canvas on screen
	static canvasWidth = 1000;
	static canvasHeight = 1000;

	// size of the world the player walks around in
	static worldWidth = 2000;
	static worldHeight = 2000;

	static tileDivisor = 20;

	static tileHeight = this.worldHeight / this.tileDivisor;
	static tileWidth = this.worldWidth / this.tileDivisor;

	static generateIsland() {
		/***
		 * builds the tile map as an island:
		 * ocean around the edge, a sand beach, grass inland, and a small oasis lake
		 * called from setup(), needs p5's noise()
		 */
		noiseSeed(7)
		let n = this.tileDivisor
		let center = (n - 1) / 2
		let oasis = [center + 3.5, center - 2.5] // tile coords of the inland lake

		this.tiles = []
		for (let y = 0; y < n; y++) {
			let row = []
			for (let x = 0; x < n; x++) {
				// 0 in the middle of the map, 1 at the edge, plus noise for a ragged coastline
				let d = dist(x, y, center, center) / (n / 2)
				let land = 1 - d + (noise(x * 0.25, y * 0.25) - 0.5) * 0.6
				let lake = dist(x, y, oasis[0], oasis[1])

				if (d > 0.9 || land < 0.25 || lake < 1.3) {
					row.push(2) // water
				} else if (land < 0.38 || lake < 2.3) {
					row.push(1) // sand
				} else {
					row.push(0) // grass
				}
			}
			this.tiles.push(row)
		}
	}


	static getTileID(x,y) {
		var tileX = Math.floor(x/this.tileWidth)
		var tileY = Math.floor(y/this.tileHeight)
		return [tileX, tileY]
	}

	static getTileName(intType){
		let Name = null;
		if (intType == 0) {Name="grass"}
		if (intType == 1) {Name="sand"}
		if (intType == 2) {Name="water"}
		return Name
	}

	static idToTypeList(idList){
		/**
		 * idList = [ [0,0] , [1,0] ..] 2dArray
		 * 
		 */
		let tempArr = []
		for (let i = 0 ; i < idList.length; i++) {
			let intType = this.tiles[idList[i][1]] [idList[i][0]]
			tempArr.push(this.getTileName(intType))
		}

		return tempArr
	}
}