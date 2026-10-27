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
 	}
	
	achievements = {
		"touch grass": false, // will be achieve if the last 5 tiles are grass tile
		"stay hydrated": false, // last 5 tiles are water
		"looking for oil": false, // last 5 tiles are sand
		"oasis": false, // 3 sand, then last 3 water
		"dizzy":false
	}

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
					
				}
				else if (haveSameElements( UI.idToTypeList(event.tileHistory.slice(-6)),
															["sand","sand","sand","water","water","water"]) &&
						!this.achievements["oasis"] ){
							this.achievements["oasis"] = true
							document.getElementById("oasis").style.backgroundColor = "#ffffff"
							console.log("What a nice stay it has been!")
				}
					
				else if (haveSameElements( UI.idToTypeList(event.tileHistory.slice(-5)),
															["sand","sand","sand","sand","sand"]) &&
						!this.achievements["looking for oil"] ){
							this.achievements["looking for oil"] = true
							document.getElementById("looking for oil").style.backgroundColor = "#ffffff"

							console.log("$$$$$$$ OIL $$$$$$$$")
				}
				else if (haveSameElements( event.moveHistory.slice(-4),
															["up","right","down", "left"]) &&
						!this.achievements["dizzy"] ){
							this.achievements["dizzy"] = true
					    document.getElementById("dizzy").style.backgroundColor = "#ffffff"

							console.log("Woaahhhah... 🤮!")
					
				}
			}
	}


	broadcast(event){
		// call the update function of all subs
		for (let sub of this.subs){
			sub.update(event)
		}
	}
}


