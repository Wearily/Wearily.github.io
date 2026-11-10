/**
 * Skin switches the look of the UI around the canvas (garden, pixel, pop, clean)
 * and keeps the "x of y found" progress in the top bar.
 * - listens to the achievement system like the other subs
 * - the chosen theme is remembered between visits
 */

class Skin {

	static themes = ["garden", "pixel", "pop", "clean"]

	constructor(){
		this.theme = "garden"
		this.total = 0
		this.buttons = []
	}

	setup(){
		// called from setup(), after the achievement panel exists
		this.buttons = [...document.querySelectorAll("#theme-switch button")]
		for (let button of this.buttons){
			button.addEventListener("click", () => {
				this.apply(button.dataset.theme)
				button.blur() // keep the game keys (space / enter) away from the button
			})
		}

		let saved = null
		try { saved = localStorage.getItem("hidden-achievement-theme") } catch (e) {}
		this.apply(Skin.themes.includes(saved) ? saved : this.theme)

		this.total = Object.keys(achievementSys.achievements).length
		this.refresh()
	}

	apply(theme){
		this.theme = theme
		document.body.dataset.theme = theme
		for (let button of this.buttons){
			button.setAttribute("aria-pressed", button.dataset.theme == theme)
		}
		try { localStorage.setItem("hidden-achievement-theme", theme) } catch (e) {}
	}

	update(event){
		if (event.name == "achievement complete" || event.name == "all achievements complete"){
			this.refresh()
		}
	}

	refresh(){
		let done = Object.values(achievementSys.achievements).filter(value => value).length
		document.getElementById("progress-count").textContent = done + " of " + this.total + " found"
		document.getElementById("progress-fill").style.setProperty("--p", this.total ? done / this.total : 0)
	}
}
