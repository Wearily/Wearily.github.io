class UI {
	static tiles = []; // filled by generateIsland() in setup()

	// size of the canvas on screen
	static canvasWidth = 1000;
	static canvasHeight = 1000;

	// size of the world the player walks around in
	static worldWidth = 3000;
	static worldHeight = 3000;

	static tileDivisor = 30;

	// the original island is 20 x 20 tiles, it sits in the west of the map so there is room to grow east
	static islandSize = 20;
	static islandOffset = [0, 5]; // tile coords of its top left corner

	static tileHeight = this.worldHeight / this.tileDivisor;
	static tileWidth = this.worldWidth / this.tileDivisor;

	static get islandCenter() {
		// middle of the original island in world coords
		return [
			(this.islandOffset[0] + this.islandSize / 2) * this.tileWidth,
			(this.islandOffset[1] + this.islandSize / 2) * this.tileHeight
		]
	}

	static generateIsland() {
		/***
		 * builds the tile map: the original island (unchanged) in the west,
		 * then an extension to the east, see addExtension()
		 * called from setup(), needs p5's noise()
		 */
		noiseSeed(7)
		this.tiles = Array.from({ length: this.tileDivisor }, () => Array(this.tileDivisor).fill(2)) // all ocean

		let island = this.originalIsland()
		for (let y = 0; y < this.islandSize; y++) {
			for (let x = 0; x < this.islandSize; x++) {
				this.tiles[y + this.islandOffset[1]][x + this.islandOffset[0]] = island[y][x]
			}
		}

		this.addExtension()
	}

	static originalIsland() {
		/***
		 * the first island as a islandSize x islandSize map:
		 * ocean around the edge, a sand beach, grass inland, and a small oasis lake
		 */
		let n = this.islandSize
		let center = (n - 1) / 2
		let oasis = [center + 3.5, center - 2.5] // tile coords of the inland lake

		let tiles = []
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
			tiles.push(row)
		}
		return tiles
	}

	static addExtension() {
		/***
		 * grows the island east into new land, joined to the old east coast by a sand bar:
		 * highlands with a rocky range and a snowy peak, woods to the north,
		 * and a grassy point with a stone plaza of ruins to the south
		 * tile coords are for the whole map, all of it only replaces water
		 */
		this.addPath([[16, 15], [19, 15], [21, 15]], 1.1, 1) // sand bar
		this.addLand(22.5, 8.5, 3.4, "woods")
		this.addLand(24.5, 15, 4.6, "highlands")
		this.addLand(22.5, 21, 2.8, "ruins")

		// a 3x3 plaza in the middle of the ruins, with a path leading up to the highlands
		for (let y = 20; y <= 22; y++) {
			for (let x = 21; x <= 23; x++) {
				this.tiles[y][x] = 6
			}
		}
		this.addPath([[22, 19], [22, 17.5]], 0.6, 6)
	}

	static addLand(cx, cy, size, kind) {
		/***
		 * a blob of new land centred on tile (cx, cy), "size" tiles across from the middle to the shore
		 * kind picks the tiles: "woods" (one big chunk of forest), "highlands" (grass at the foot,
		 * then mountain, then a snowy peak) or "ruins" (grass)
		 */
		for (let y = 1; y < this.tileDivisor - 1; y++) {
			for (let x = 1; x < this.tileDivisor - 1; x++) {
				// 0 in the middle of the blob, 1 at its edge, plus noise for a ragged shore
				let edge = dist(x, y, cx, cy) / size + (noise(x * 0.4 + 20, y * 0.4 + 20) - 0.5) * 0.5
				if (edge >= 1 || this.tiles[y][x] != 2) {continue}

				if (edge > 0.8) {
					this.tiles[y][x] = 1 // sand
				} else if (kind == "highlands" && edge < 0.4) {
					this.tiles[y][x] = 5 // snow
				} else if (kind == "highlands" && edge < 0.7) {
					this.tiles[y][x] = 4 // mountain
				} else {
					this.tiles[y][x] = (kind == "woods") ? 3 : 0
				}
			}
		}
	}

	static addPath(points, width, type) {
		// a line of tiles of one type along points [[x, y], ...], only replaces water
		for (let y = 1; y < this.tileDivisor - 1; y++) {
			for (let x = 1; x < this.tileDivisor - 1; x++) {
				if (this.tiles[y][x] == 2 && this.distToPath(x, y, points) < width) {
					this.tiles[y][x] = type
				}
			}
		}
	}

	static distToPath(x, y, points) {
		// distance from the tile (x, y) to the closest bit of a line made of points [[x, y], ...]
		let best = Infinity
		for (let i = 0; i < points.length - 1; i++) {
			let [ax, ay] = points[i]
			let [bx, by] = points[i + 1]
			let len2 = Math.pow(bx - ax, 2) + Math.pow(by - ay, 2)
			let t = constrain(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / len2, 0, 1)
			best = Math.min(best, dist(x, y, ax + t * (bx - ax), ay + t * (by - ay)))
		}
		return best
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
		if (intType == 3) {Name="forest"}
		if (intType == 4) {Name="mountain"}
		if (intType == 5) {Name="snow"}
		if (intType == 6) {Name="stone"}
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