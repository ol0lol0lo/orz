let select = s => document.querySelector(s),
  selectAll = s =>  document.querySelectorAll(s),
		mainSVG = select('#mainSVG'),
		wheel = select('#wheel'),
		ring = select('#ring'),
		numEmitters = 50,
		numParticles = 6,
		mainCircleRadius = 100,
		step = 360 / numEmitters,
		xmlns = "http://www.w3.org/2000/svg",
		emitterArr = [],
		p = select('.p'),
		emmitterTl = gsap.timeline(),
		offset = 60,
		colorArr = ['#00E3FF', '#50E3C1', '#00819D', 'red', 'yellow']

gsap.set('svg', {
	visibility: 'visible'
})

gsap.set(ring, {
	attr: {
		r: mainCircleRadius
	}
})
function createEmitters () {
	
	for (let i = 0; i < numEmitters; i++) {
		
		let angle = step * i,
				point = {
					x: (Math.cos(angle * Math.PI / 180) * mainCircleRadius) + 400,
					y: (Math.sin(angle * Math.PI / 180) * mainCircleRadius) + 300
				},
				emitter = document.createElementNS(xmlns, 'g');
		wheel.appendChild(emitter)
		
		gsap.set(emitter, {
			x: point.x,
			y: point.y
		})
		
		emitterArr.push(emitter);
		populateEmitter({emitter: emitter, angle: angle})
		//gsap.delayedCall(i/20, populateEmitter, [{emitter: emitter, angle: angle}])
	}
	
	
}
function populateEmitter(obj) {
	
	//return;
	for(let i = 0; i < numParticles; i++) {
		let clone = p.cloneNode(true);
		obj.emitter.appendChild(clone);
		gsap.set(clone, {
			attr: {
				y1: 0,
				y2: 'random(-2, -23)'
			},
			strokeWidth: 'random(0.5, 2)',
			stroke: colorArr[i % colorArr.length],
				transformOrigin: '50% 100%',
				rotation: obj.angle
		})
	}
	
	
}

function animateEmitters() {
	
	//return 
	//console.log("animateEmitters();")
	for (let i = 0; i < numEmitters; i++) {
	
		//console.log(emitterArr.length)
		
		
		let angle = step * i;
	
		let tl = gsap.timeline();
		tl.fromTo(emitterArr[i].children, {
			x: 0,
			y: 0,
			attr: {
				y1: 0,
				y2: 'random(-2, -13)'
			}	
		}, {
			//duration: 'random(0.1, 0.3)',
		 physics2D: {
			 velocity: 'random(90, 500)',
			 angle: `random(${angle + 85},${angle + 95})`,
			 gravity: 0
		 },
			attr: {
				y2: 0
			},
				repeat: -1,
			ease: 'expo.in',
			//strokeWidth: 0,
			//repeatDelay:0,
			repeatRefresh: true
		})	
		
		emmitterTl.add(tl, i/offset)
	}
}

createEmitters();

let ringTl = gsap.timeline({repeat: -1});
ringTl.from(ring, {
	drawSVG:'0% 0%',
	duration: (1/offset) * numEmitters,
	ease: 'linear'
})
.to(ring, {
	drawSVG:'50% 50%',
	duration: (1/offset) * numEmitters,
	ease: 'linear'
	
})
let snap = gsap.utils.snap(1)
//console.log(colorArr[snap(gsap.utils.random(0, 5))])
gsap.to(ring, {
	duration: 6,
	rotation: -360,
	repeat: -1,
	ease: 'linear',
	svgOrigin: '400 300'
})
gsap.to(ring, {
	stroke: function() {		
		return gsap.utils.random(colorArr)
	},
	duration: 2,
	repeat: -1,
	ease: 'linear',
	repeatRefresh: true
})

animateEmitters()

 gsap.globalTimeline.timeScale(0.75).seek(100)