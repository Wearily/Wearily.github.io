/**
 * Footstep audio
 *
 * Steps are timed by distance walked (one footfall per stride), not by how long a sample is,
 * so every surface has a natural walking rhythm.
 *
 * Two sound sets, picked with MyAudioEngine.soundSet:
 *   - "experimental": synthesized steps in assets/sounds/experimental (made by tools/generate_footsteps.py),
 *                     5 variations per surface, each one a whole footstep with its body baked in
 *   - "original"    : the recordings in assets/sounds, sliced into steps and layered with:
 *       thump : a short low sine drop, the weight of the heel landing (land only)
 *       plop  : a falling sine, the foot breaking the water surface (water only)
 *       noise : filtered noise, the brush / crunch / slosh texture
 * Every step picks a different file / slice than the last one and gets random pitch, level and filter,
 * so no two steps sound the same.
 *
 * Extra moments:
 *   - feet alternate left / right (slight pan and pitch difference)
 *   - stepping onto new terrain plays an accented step (a big splash when wading in)
 *   - the first few steps after leaving water drip
 *   - stopping plants the trailing foot with a soft settle step
 *
 * Uses p5.sound to load the files, then raw Web Audio nodes for each voice.
 * Everything goes through p5.soundOut, so outputVolume() still controls it.
 */

function soundVariants(base, count){
	// "experimental/grass", 3 -> ["experimental/grass_1", "experimental/grass_2", "experimental/grass_3"]
	return Array.from({ length: count }, (_, i) => base + "_" + (i + 1))
}

class MyAudioEngine {

	static soundSet = "experimental" // "experimental" or "original", see the top of the file

	// one table per sound set, one entry per tile type (same keys as Terrain.biomes / ParticleEngine.trails)
	// samples: file names under assets/sounds (no .wav), a different one is picked each step
	// slice: seconds to play from a transient inside the file, null plays the whole file
	// level is relative to the file after it has been normalised to a common peak
	static soundSets = {
		experimental: {
			0: { // grass: heel + toe roll, a rustle of blades
				samples: soundVariants("experimental/grass", 5), level: 0.8, stride: 80, slice: null,
				rate: [0.93, 1.07], tone: 9000
			},
			1: { // sand: shorter strides that sink in, a swelling crunch
				samples: soundVariants("experimental/sand", 5), level: 0.85, stride: 72, slice: null,
				rate: [0.9, 1.06], tone: 8000
			},
			2: { // water: long wading strides, splash + plunge + bubbles
				samples: soundVariants("experimental/water", 5), level: 0.7, stride: 105, slice: null,
				rate: [0.88, 1.04], tone: 10000
			}
		},
		original: {
			0: { // grass: soft heel on turf, a brush of blades
				samples: ["grass"], level: 0.8, stride: 80, slice: 0.16, rate: [0.9, 1.1], tone: 7000,
				thump: { freq: 85, level: 0.35, decay: 0.07 },
				noise: { type: "bandpass", freq: 4500, q: 0.7, level: 0.07, decay: 0.09 }
			},
			1: { // sand: shorter strides that sink in, a dry crunch
				samples: ["sand"], level: 0.85, stride: 72, slice: 0.22, rate: [0.85, 1.05], tone: 5000,
				thump: { freq: 65, level: 0.25, decay: 0.09 },
				noise: { type: "bandpass", freq: 1800, q: 1.2, level: 0.09, decay: 0.16 }
			},
			2: { // water: long wading strides, a splash with a low plop under it
				samples: ["water"], level: 0.7, stride: 105, slice: 0.3, rate: [0.8, 1.0], tone: 9000,
				plop: { from: 380, to: 110, level: 0.25, decay: 0.12 },
				noise: { type: "lowpass", freq: 2500, q: 0.5, level: 0.06, decay: 0.2 }
			}
		}
	}

	static get surfaces(){
		return MyAudioEngine.soundSets[MyAudioEngine.soundSet]
	}

	static busLevel = 0.6    // footsteps sit just under everything else (player SFX, not voice)
	static footPan = 0.12    // how far left / right the feet are, kept subtle so it never feels off-centre
	static maxVoices = 24    // drop new layers past this so a stuck key can't pile up nodes
	static stopDelay = 150   // ms without a move event before we count the player as stopped
	static dripSteps = 3     // wet steps after walking out of water

	constructor(){
		this.files = {}      // p5.SoundFile per sample name
		this.analysis = {}   // { norm, onsets } per sample name, filled once the file has loaded
		this.ctx = null
		this.bus = null
		this.noiseBuffer = null
		this.voices = 0

		// walking state
		this.walking = false
		this.walked = 0         // distance since the last footfall
		this.lastPos = null
		this.lastTile = null
		this.foot = 0           // 0 = left, 1 = right
		this.stepsTaken = 0     // footfalls since the player started moving
		this.wet = 0            // drip steps left after leaving water
		this.stopTimer = null
		this.lastOnset = {}     // last slice used per file, so the same one isn't picked twice in a row
		this.lastFile = {}      // last file used per surface, same idea
	}

	loadSoundFiles(){
		// called from preload(), only the active sound set is loaded
		for (let id in MyAudioEngine.surfaces){
			for (let name of MyAudioEngine.surfaces[id].samples){
				this.files[name] = loadSound('assets/sounds/' + name + '.wav', (file) => {
					this.analysis[name] = MyAudioEngine.analyse(file.buffer)
				})
			}
		}
	}

	static analyse(buffer){
		/***
		 * finds the peak level (to even out loudness between files)
		 * and where each footstep transient starts (so a long file gives several different steps)
		 *
		 * return: { norm: gain that brings the peak to 1, onsets: [seconds] }
		 */
		let data = buffer.getChannelData(0)
		let win = Math.floor(buffer.sampleRate * 0.01) // 10 ms windows
		let env = []
		for (let i = 0; i < data.length; i += win){
			let m = 0
			for (let j = i; j < Math.min(i + win, data.length); j++){
				m = Math.max(m, Math.abs(data[j]))
			}
			env.push(m)
		}
		let peak = Math.max(...env, 0.0001)

		let onsets = []
		let lastPeak = -100
		for (let k = 0; k < env.length; k++){
			let isPeak = env[k] >= peak * 0.45 &&
						 env[k] >= (env[k - 1] || 0) &&
						 env[k] >= (env[k + 1] || 0)
			if (!isPeak || k - lastPeak < 6) {continue} // at least 60 ms between steps
			lastPeak = k

			// walk back to where the transient starts rising
			let start = k
			while (start > 0 && env[start - 1] > env[k] * 0.25 && k - start < 8) {start--}
			let t = Math.max(0, start * 0.01 - 0.005)
			let tooClose = onsets.length > 0 && t - onsets[onsets.length - 1] < 0.04
			if (!tooClose && buffer.duration - t >= 0.08) {onsets.push(t)} // need enough tail left to be a step
		}
		if (onsets.length == 0) {onsets.push(0)}

		return { norm: 1 / peak, onsets: onsets }
	}

	setupContext(){
		// built lazily, p5's audio context exists by now but may still be suspended
		if (this.ctx) {return true}
		if (typeof getAudioContext != "function") {return false}

		this.ctx = getAudioContext()
		this.bus = this.ctx.createGain()
		this.bus.gain.value = MyAudioEngine.busLevel
		this.bus.connect(p5.soundOut.input)

		// half a second of white noise, every noise layer reads a random part of it
		let length = Math.floor(this.ctx.sampleRate * 0.5)
		this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
		let data = this.noiseBuffer.getChannelData(0)
		for (let i = 0; i < length; i++) {data[i] = Math.random() * 2 - 1}
		return true
	}

	update(event){
		if (event.name == "key pressed"){
			// a key press is a user gesture, browsers only let audio start from one
			if (this.setupContext() && this.ctx.state != "running") {this.ctx.resume()}
		}

		if (event.name == "move"){
			this.onMove(event)
		}
	}

	onMove(event){
		let s = MyAudioEngine.surfaces[event.tileInt]
		if (!s || !this.setupContext() || this.ctx.state != "running") {
			this.lastPos = [event.playerX, event.playerY]
			return
		}

		// how far the player actually went (zero when pushing into the edge of the world)
		let moved = 0
		if (this.lastPos){
			moved = Math.hypot(event.playerX - this.lastPos[0], event.playerY - this.lastPos[1])
			if (moved > 50) {moved = 0} // a teleport / respawn, not a step
		}
		this.lastPos = [event.playerX, event.playerY]
		if (moved == 0) {return}

		// starting to walk: the first footfall comes almost at once, so the key feels responsive
		if (!this.walking) {
			this.walking = true
			this.walked = s.stride * 0.8
		}

		// walking onto different terrain lands straight away, with some extra weight
		let changed = this.lastTile != null && this.lastTile != event.tileInt
		let leftWater = changed && this.lastTile == 2
		let enteredWater = changed && event.tileInt == 2
		this.lastTile = event.tileInt

		if (leftWater) {this.wet = MyAudioEngine.dripSteps}
		if (enteredWater) {this.wet = 0}

		this.walked += moved
		if (changed){
			this.step(event.tileInt, enteredWater ? 1.6 : 1.25, enteredWater ? 0.85 : 1)
		} else if (this.walked >= s.stride){
			this.step(event.tileInt)
		}

		// no move event for a moment means the player stopped
		clearTimeout(this.stopTimer)
		this.stopTimer = setTimeout(() => this.onStop(event.tileInt), MyAudioEngine.stopDelay)
	}

	onStop(tileInt){
		let s = MyAudioEngine.surfaces[tileInt]
		// plant the trailing foot, unless the last footfall only just happened
		if (s && this.stepsTaken >= 2 && this.walked > s.stride * 0.35){
			this.step(tileInt, 0.5, 0.92)
		}
		this.walking = false
		this.stepsTaken = 0
		this.walked = 0
		this.lastPos = null
	}

	step(tileInt, accent = 1, pitch = 1){
		/***
		 * one footfall on the given surface
		 * accent: loudness multiplier (transitions, settle step)
		 * pitch: playback rate multiplier, lower = heavier
		 */
		let s = MyAudioEngine.surfaces[tileInt]
		if (!s) {return}

		this.walked = 0
		this.stepsTaken++
		this.foot = 1 - this.foot

		let when = this.ctx.currentTime + MyAudioEngine.rand(0, 0.01) // a little human timing
		let pan = (this.foot ? 1 : -1) * MyAudioEngine.footPan
		let footPitch = this.foot ? 1 : 0.97 // feet never land quite the same
		let rate = MyAudioEngine.rand(...s.rate) * footPitch * pitch
		let level = accent * MyAudioEngine.rand(0.8, 1)

		this.playSample(s.samples, s.slice, rate, s.level * level, s.tone * MyAudioEngine.rand(0.8, 1.1), pan, when)
		if (s.thump) {this.playTone(s.thump.freq * 1.6, s.thump.freq, s.thump.level * level, s.thump.decay, pan, when)}
		if (s.plop) {this.playTone(s.plop.from * rate, s.plop.to, s.plop.level * level, s.plop.decay * accent, pan, when + 0.015)}
		if (s.noise) {this.playNoise(s.noise, s.noise.level * level, pan, when)}

		// dripping after walking out of water, fading over the next few steps
		if (this.wet > 0 && tileInt != 2){
			let drip = this.wet / MyAudioEngine.dripSteps
			let water = MyAudioEngine.surfaces[2]
			this.playSample(water.samples, 0.15, MyAudioEngine.rand(1.3, 1.6), 0.3 * drip, 6000, pan, when + 0.03)
			this.wet--
		}
	}

	// ---- voices ----

	voice(node, endTime){
		// panner -> bus, and keep count so we can cap how many are alive
		let panner = this.ctx.createStereoPanner()
		node.connect(panner)
		panner.connect(this.bus)
		this.voices++
		setTimeout(() => {
			panner.disconnect()
			this.voices--
		}, (endTime - this.ctx.currentTime) * 1000 + 50)
		return panner
	}

	playSample(samples, sliceLength, rate, level, tone, pan, when){
		/***
		 * samples: the surface's file names, one is picked (not the same as last time)
		 * sliceLength: seconds to play from a transient in the file, null plays the whole file
		 */
		if (this.voices >= MyAudioEngine.maxVoices) {return}

		let loaded = samples.filter(n => this.files[n] && this.files[n].buffer && this.analysis[n])
		let group = samples[0]
		let fresh = loaded.filter(n => n != this.lastFile[group])
		let pool = fresh.length > 0 ? fresh : loaded
		if (pool.length == 0) {return}
		let name = MyAudioEngine.pick(pool)
		this.lastFile[group] = name

		let file = this.files[name]
		let info = this.analysis[name]

		// pick a transient, not the one we used last time (whole files always start at 0)
		let offset = 0
		if (sliceLength != null){
			let choices = info.onsets.filter(t => t != this.lastOnset[name])
			if (choices.length == 0) {choices = info.onsets}
			offset = MyAudioEngine.pick(choices)
			this.lastOnset[name] = offset
		}

		let length = Math.min(sliceLength ?? file.buffer.duration, file.buffer.duration - offset)
		let duration = length / rate // real time the slice takes at this playback rate
		let gain = level * info.norm

		let src = this.ctx.createBufferSource()
		src.buffer = file.buffer
		src.playbackRate.value = rate

		let filter = this.ctx.createBiquadFilter()
		filter.type = "lowpass"
		filter.frequency.value = tone

		// short fade in / out so slicing mid-file never clicks
		let amp = this.ctx.createGain()
		amp.gain.setValueAtTime(0, when)
		amp.gain.linearRampToValueAtTime(gain, when + 0.004)
		amp.gain.setValueAtTime(gain, when + duration * 0.5)
		amp.gain.exponentialRampToValueAtTime(0.0001, when + duration)

		src.connect(filter)
		filter.connect(amp)
		this.voice(amp, when + duration).pan.value = pan

		src.start(when, offset)
		src.stop(when + duration + 0.01)
	}

	playTone(from, to, level, decay, pan, when){
		// a sine that drops in pitch: the body of the step
		if (this.voices >= MyAudioEngine.maxVoices) {return}

		let osc = this.ctx.createOscillator()
		osc.type = "sine"
		osc.frequency.setValueAtTime(from, when)
		osc.frequency.exponentialRampToValueAtTime(to, when + decay)

		let amp = this.ctx.createGain()
		amp.gain.setValueAtTime(0, when)
		amp.gain.linearRampToValueAtTime(level, when + 0.005)
		amp.gain.exponentialRampToValueAtTime(0.0001, when + decay)

		osc.connect(amp)
		this.voice(amp, when + decay).pan.value = pan

		osc.start(when)
		osc.stop(when + decay + 0.01)
	}

	playNoise(spec, level, pan, when){
		// filtered noise burst: brush of grass, crunch of sand, slosh of water
		if (this.voices >= MyAudioEngine.maxVoices) {return}

		let decay = spec.decay * MyAudioEngine.rand(0.8, 1.2)
		let src = this.ctx.createBufferSource()
		src.buffer = this.noiseBuffer

		let filter = this.ctx.createBiquadFilter()
		filter.type = spec.type
		filter.frequency.value = spec.freq * MyAudioEngine.rand(0.85, 1.15)
		filter.Q.value = spec.q

		let amp = this.ctx.createGain()
		amp.gain.setValueAtTime(0, when)
		amp.gain.linearRampToValueAtTime(level, when + 0.003)
		amp.gain.exponentialRampToValueAtTime(0.0001, when + decay)

		src.connect(filter)
		filter.connect(amp)
		this.voice(amp, when + decay).pan.value = pan

		src.start(when, Math.random() * (this.noiseBuffer.duration - decay))
		src.stop(when + decay + 0.01)
	}

	static pick(list){
		return list[Math.floor(Math.random() * list.length)]
	}

	static rand(min, max){
		return min + Math.random() * (max - min)
	}
}
