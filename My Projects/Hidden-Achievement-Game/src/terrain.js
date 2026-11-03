/**
 * Low poly terrain built from UI.tiles
 * - every tile is split into a grid of cells, each cell is 2 triangles
 * - heights come from the tile's biome + perlin noise, water is kept flat
 * - each triangle gets one color, so p5's flat normals give the faceted look
 *
 * world coords: x, y are the same as the player / tiles, z is height (up)
 */

class Terrain {

	static biomes = {
		0: { base: 30, rough: 50, color: [0, 200, 0] },     // grass
		1: { base: 8,  rough: 6,  color: [194, 178, 128] }, // sand
		2: { base: 0,  rough: 0,  color: [9, 195, 219] },   // water
	}

	constructor(){
		this.cols = 40
		this.rows = 40
		this.cellSize = UI.canvasWidth / this.cols // 8 cells per tile
		this.waterLevel = 0
		this.heights = [] // heights[row][col] on the regular (un-jittered) grid
		this.geometry = null
	}

	generate(){
		// called from setup(), p5 functions don't exist before that
		noiseSeed(42)
		randomSeed(42)
		noiseDetail(4, 0.5)

		let cellsPerTile = this.cols / UI.tileDivisor
		let points = []

		for (let j = 0; j <= this.rows; j++) {
			this.heights.push([])
			points.push([])

			for (let i = 0; i <= this.cols; i++) {
				let x = i * this.cellSize
				let y = j * this.cellSize

				let biome = this.biomeAt(x, y)
				let z = biome.base + biome.rough * (noise(x * 0.008, y * 0.008) - 0.5) * 2
				if (this.touchesWater(i, j)) {
					z = this.waterLevel
				}
				z = max(z, this.waterLevel)
				this.heights[j].push(z)

				// nudge vertices so the triangles aren't a perfect grid,
				// but never across a tile edge (keeps visuals in sync with gameplay tiles)
				let jx = (i % cellsPerTile == 0) ? 0 : random(-0.3, 0.3) * this.cellSize
				let jy = (j % cellsPerTile == 0) ? 0 : random(-0.3, 0.3) * this.cellSize
				points[j].push(createVector(x + jx, y + jy, z))
			}
		}

		this.geometry = buildGeometry(() => {
			noStroke()
			beginShape(TRIANGLES)
			for (let j = 0; j < this.rows; j++) {
				for (let i = 0; i < this.cols; i++) {
					let a = points[j][i]
					let b = points[j][i + 1]
					let c = points[j + 1][i + 1]
					let d = points[j + 1][i]

					// alternate the diagonal for a less regular pattern
					if ((i + j) % 2 == 0) {
						this.addFace(a, b, c)
						this.addFace(a, c, d)
					} else {
						this.addFace(a, b, d)
						this.addFace(b, c, d)
					}
				}
			}
			endShape()
		})
		this.geometry.computeNormals(FLAT)
	}

	addFace(a, b, c){
		// one color per triangle, picked from the tile under its center
		let type = this.tileTypeAt((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3)
		let base = color(...Terrain.biomes[type].color)
		fill(lerpColor(base, color(0), random(0, 0.12)))

		vertex(a.x, a.y, a.z)
		vertex(b.x, b.y, b.z)
		vertex(c.x, c.y, c.z)
	}

	tileTypeAt(x, y){
		let col = constrain(Math.floor(x / UI.tileWidth), 0, UI.tileDivisor - 1)
		let row = constrain(Math.floor(y / UI.tileHeight), 0, UI.tileDivisor - 1)
		return UI.tiles[row][col]
	}

	touchesWater(i, j){
		// check the (up to) 4 cells that share vertex i, j
		for (let cj = j - 1; cj <= j; cj++) {
			for (let ci = i - 1; ci <= i; ci++) {
				if (ci < 0 || cj < 0 || ci >= this.cols || cj >= this.rows) {continue}
				let x = (ci + 0.5) * this.cellSize
				let y = (cj + 0.5) * this.cellSize
				if (this.tileTypeAt(x, y) == 2) {return true}
			}
		}
		return false
	}

	biomeAt(x, y){
		// blend base / rough between tile centers so biomes slope into each other
		let last = UI.tileDivisor - 1
		let u = constrain(x / UI.tileWidth - 0.5, 0, last)
		let v = constrain(y / UI.tileHeight - 0.5, 0, last)
		let c0 = Math.floor(u)
		let r0 = Math.floor(v)
		let c1 = min(c0 + 1, last)
		let r1 = min(r0 + 1, last)
		let fu = u - c0
		let fv = v - r0

		let get = (r, c, key) => Terrain.biomes[UI.tiles[r][c]][key]
		let blend = (key) => lerp(
			lerp(get(r0, c0, key), get(r0, c1, key), fu),
			lerp(get(r1, c0, key), get(r1, c1, key), fu),
			fv
		)
		return { base: blend("base"), rough: blend("rough") }
	}

	heightAt(x, y){
		/***
		 * returns the ground height at world position x, y
		 * (bilinear between the 4 surrounding grid points)
		 */
		let u = constrain(x / this.cellSize, 0, this.cols - 0.001)
		let v = constrain(y / this.cellSize, 0, this.rows - 0.001)
		let i = Math.floor(u)
		let j = Math.floor(v)
		let h = this.heights
		return lerp(
			lerp(h[j][i], h[j][i + 1], u - i),
			lerp(h[j + 1][i], h[j + 1][i + 1], u - i),
			v - j
		)
	}

	render(){
		// ocean around the world so the edges don't float in the sky
		push()
		translate(UI.canvasWidth / 2, UI.canvasHeight / 2, this.waterLevel - 2)
		fill(...Terrain.biomes[2].color)
		plane(8000, 8000)
		pop()

		model(this.geometry)
	}
}
