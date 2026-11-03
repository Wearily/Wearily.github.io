/**
 * Toaster pop ups for achievements
 * - listens to the achievement system for "achievement complete"
 * - shows one toast at a time (extras wait in a queue)
 * - once a toast has slid in, it broadcasts "toast shown" with its position
 *   in canvas pixels so other systems (particles) can react around it
 */

class Toaster {

	constructor(){
		this.subs = []
		this.queue = []      // achievement events waiting for their turn
		this.showing = false
		this.duration = 3000 // ms a toast stays on screen
		this.area = null
		this.canvas = null
	}

	setup(){
		// called from setup(), sits the toast area on top of the canvas
		this.canvas = document.getElementById("myCanvas")
		this.area = document.getElementById("toast-area")
		this.area.style.left = this.canvas.offsetLeft + "px"
		this.area.style.top = this.canvas.offsetTop + "px"
		this.area.style.width = this.canvas.offsetWidth + "px"
	}

	addSub(object){
		this.subs.push(object)
	}

	update(event){
		if (event.name == "achievement complete"){
			this.queue.push(event)
			if (!this.showing) {
				this.showNext()
			}
		}
	}

	showNext(){
		if (this.queue.length === 0) {
			this.showing = false
			return
		}
		this.showing = true
		let event = this.queue.shift()

		let toast = document.createElement("div")
		toast.classList.add("toast")
		toast.innerHTML = `<div class="toast-title">Achievement Unlocked!</div>
							<div class="toast-name">${event.achievementName}</div>`
		this.area.appendChild(toast)

		// let the slide in finish so we broadcast where the toast actually ended up
		toast.addEventListener("transitionend", () => {
			this.broadcast({
				name: "toast shown",
				achievementName: event.achievementName,
				...this.getCanvasRect(toast)
			})
		}, { once: true })

		toast.offsetHeight // force a reflow so the transition plays
		toast.classList.add("show")

		setTimeout(() => {
			toast.classList.remove("show")
			setTimeout(() => {
				toast.remove()
				this.showNext()
			}, 400)
		}, this.duration)
	}

	getCanvasRect(element){
		/***
		 * returns the element's rect in canvas pixel coords
		 * (same coords the fireworks are drawn in)
		 */
		let canvasRect = this.canvas.getBoundingClientRect()
		let rect = element.getBoundingClientRect()
		let scale = width / canvasRect.width
		return {
			x: (rect.left - canvasRect.left) * scale,
			y: (rect.top - canvasRect.top) * scale,
			w: rect.width * scale,
			h: rect.height * scale
		}
	}

	broadcast(event){
		// call the update function of all subs
		for (let sub of this.subs){
			sub.update(event)
		}
	}
}
