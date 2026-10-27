class UI {
	static tiles = [
		[0, 0, 0, 0, 0],
		[1, 1, 0, 0, 0],
		[2, 2, 1, 1, 1],
		[2, 2, 2, 2, 2],
		[2, 2, 2, 2, 2],
	];

	static canvasWidth = 1000;
	static canvasHeight = 1000;

	static tileDivisor = 5;

	static tileHeight = this.canvasHeight / this.tileDivisor;
	static tileWidth = this.canvasWidth / this.tileDivisor;


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