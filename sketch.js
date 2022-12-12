// Your code will go here

// Open up your console - if everything loaded properly you should see the version number 
// corresponding to the latest version of ml5 printed to the console and in the p5.js canvas.

// Initialize the Image Classifier method with MobileNet
let mobileNet;

let video; 

console.log('ml5 version:', ml5.version);

// When the model is loaded
function modelReady() {
	console.log('Model is ready!');
	mobileNet.predict(puffin, gotResults)
  }

function gotResults(error, results) {
	if (error) {
		console.error(error);
	} else {
		let testo = Object.keys(results[0]);
		console.log(testo);
		console.log(typeof testo);

		const obj = {
			name: 'John',
			age: 30,
			city: 'New York'
		  };

		for (const key of testo) {
			console.log(`${key}: ${obj[key]}`);
		}


		let list = document.getElementById("myList");

		for(let key in results[0]) {
			let li = document.createElement("li");
			li.innerText = key;
			list.appendChild(li);
			console.log(key + ":", results[0][key]);
		}
		let birdName = (results[0]);
		birdName.toString();

		fill(0);
		textSize(64);
		text(birdName, 250, height - 100);
		createP(results);
	}
}

function imageReady() {
	image(puffin, 0, 0, width, height);
}

function setup(){
	createCanvas(640, 480);
	//video = createCapture(VIDEO);
	puffin = createImg('images/puffin.jpg', 'a puffin bird', imageReady);
	puffin.hide();
	background(200);
	textSize(width / 3);
	textAlign(CENTER, CENTER);
	mobileNet = ml5.imageClassifier('MobileNet', modelReady);
}

function draw(){ }