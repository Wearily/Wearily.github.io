/**
 * Bird's eye camera
 * - orbitControl() handles rotate (left drag), pan (right drag) and zoom (wheel)
 * - the camera glides after the player, any pan offset drifts back once the player moves
 * - a second "hud" camera is used to draw 2D overlays (fireworks) in screen coords
 *
 * up vector is (0, 0, -1) because p5 flips y, this makes +z (height) point up on screen
 */

class BirdCamera {

	constructor(){
		this.cam = null        // main 3D camera
		this.hud = null        // default camera, z = 0 maps 1:1 to screen pixels
		this.focus = null      // smoothed player position the camera glides after
		this.lastPlayer = null

		this.minPitch = 15     // degrees above the ground
		this.maxPitch = 85
		this.minDist = 200
		this.maxDist = 1500
		this.followSpeed = 0.08 // how fast the bird catches up to the player
		this.panReturn = 0.95   // how much pan offset is kept each frame while moving
	}

	setup(px, py, pz){
		this.hud = createCamera()
		this.cam = createCamera() // created last so it's the active camera
		this.cam.perspective(PI / 3, width / height, 5, 8000)

		this.focus = createVector(px, py, pz)
		this.lastPlayer = createVector(px, py)

		// start south of the player looking north, same orientation as the old 2D map
		this.placeEye(px, py, pz, radians(60), 600, HALF_PI)
	}

	placeEye(cx, cy, cz, pitch, dist, azimuth){
		this.cam.camera(
			cx + dist * cos(pitch) * cos(azimuth),
			cy + dist * cos(pitch) * sin(azimuth),
			cz + dist * sin(pitch),
			cx, cy, cz,
			0, 0, -1
		)
	}

	update(px, py, pz){
		setCamera(this.cam)
		orbitControl()
		this.clamp()
		this.follow(px, py, pz)
	}

	clamp(){
		// keep orbitControl from going under the ground, over the top, or too far / close
		let c = this.cam
		let offset = createVector(c.eyeX - c.centerX, c.eyeY - c.centerY, c.eyeZ - c.centerZ)
		let r = offset.mag()
		let pitch = constrain(asin(offset.z / r), radians(this.minPitch), radians(this.maxPitch))
		let azimuth = atan2(offset.y, offset.x)

		// orbitControl flips the up vector when it rotates past the pole,
		// the eye ends up on the opposite side so turn it back around
		if (c.upZ > 0) {
			azimuth += PI
		}

		this.placeEye(c.centerX, c.centerY, c.centerZ, pitch, constrain(r, this.minDist, this.maxDist), azimuth)
	}

	follow(px, py, pz){
		let c = this.cam
		let center = createVector(c.centerX, c.centerY, c.centerZ)
		let offset = p5.Vector.sub(center, this.focus) // whatever right drag panning added

		this.focus.lerp(px, py, pz, this.followSpeed)

		if (this.lastPlayer.x != px || this.lastPlayer.y != py) {
			offset.mult(this.panReturn)
		}
		this.lastPlayer.set(px, py)

		// move eye and center together, keeps the current rotation and zoom
		let shift = p5.Vector.add(this.focus, offset).sub(center)
		c.setPosition(c.eyeX + shift.x, c.eyeY + shift.y, c.eyeZ + shift.z)
	}

	beginHUD(){
		// draw on top of the 3D scene using screen coords (0,0 top left)
		clearDepth()
		setCamera(this.hud)
		noLights()
		push()
		translate(-width / 2, -height / 2)
	}

	endHUD(){
		pop()
	}
}
