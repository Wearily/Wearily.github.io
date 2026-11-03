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
			this.queue.push({ title: "Achievement Unlocked!", text: event.achievementName })
		}
		else if (event.name == "all achievements complete"){
			this.queue.push({
				title: "All Achievements Complete!",
				text: "Time: " + Toaster.formatTime(event.totalTime),
				style: "toast-final"
			})
		}
		else {
			return
		}

		if (!this.showing) {
			this.showNext()
		}
	}

	static formatTime(ms){
		// 754000 -> "12m 34s"
		let totalSeconds = Math.floor(ms / 1000)
		let minutes = Math.floor(totalSeconds / 60)
		let seconds = String(totalSeconds % 60).padStart(2, "0")
		return minutes + "m " + seconds + "s"
	}

	showNext(){
		if (this.queue.length === 0) {
			this.showing = false
			return
		}
		this.showing = true
		let entry = this.queue.shift()

		let toast = document.createElement("div")
		toast.classList.add("toast")
		if (entry.style) {
			toast.classList.add(entry.style)
		}
		toast.innerHTML = `<div class="toast-title">${entry.title}</div>
							<div class="toast-name">${entry.text}</div>`
		this.area.appendChild(toast)

		// let the slide in finish so we broadcast where the toast actually ended up
		toast.addEventListener("transitionend", () => {
			this.broadcast({
				name: "toast shown",
				achievementName: entry.text,
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
