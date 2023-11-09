function NGram(token) {
	this.token = token;
	this.numFollowing = 0;
	this.listFollowing = new Object();
}

//Add the current token to the map of tokens that follow the current ngram sequence
NGram.prototype.put = function(token) {
	if (!this.listFollowing[token]) {
		this.listFollowing[token] = 1;
	}else {
		this.listFollowing[token] += 1;
	}
	this.numFollowing++;
}

//Get a random token that comes after the previous n-gram sequence
//According to the probability that the tokens have
NGram.prototype.get = function() {
	let n = Math.random();
	let cProb = 0.0;
	for (let [key, value] of Object.entries(this.listFollowing)) {
		cProb += (value / this.numFollowing);
		if (cProb > n) {
			return key;
		}
	}
	return null;
}

function Alert() {
	this.type = "success";
	this.text = "";
}

const { createApp } = Vue

const app = createApp({

	data() {
		return {
			input: "",
			nTokens: 125,
			nGrams: 2,
			startSym: "",
			text: "",
			mkChain: {},
			page: "MDL",
			alert: new Alert(),
			books: ["Alice in Wonderland", "Frankenstein", "Metamorphasis", "Pride and Prejudice", "Sherlock Holmes"],
			selectedBook: ""
		}
	},
	watch: {
		page() {
			this.alert.text = "";
		},
	},
	methods: {
		toHTML(text) {
			return `<span>${text}</span>`;
		},

		makeChainEvent(continued) {
			let prevChain = null;
			if (continued) {
				prevChain = this.mkChain;
			}
			this.mkChain = this.makeMarkovChain(this.input, prevChain);
		},

		genTextEvent() {
			this.text = this.generateText(this.mkChain, this.nTokens, this.startSym);
		},

		makeMarkovChain(text, chain) {
			try {
				this.alert.text = "";
				let continued = chain;
				if (!continued) {
					chain = new Object();
				}

				//Separate texts separated by two newlines into paragraphs
				const paragraphRegex = /\n+\s*\n+/g;
				const paragraphs = text.split(paragraphRegex);
				for (let paragraph of paragraphs) {
					if (paragraph.replace(/\\n|\\r/, "").trim() == "") {
						continue;
					}
					const tokenRegex = /([\S]['’]*)+/g;
					const tokens = paragraph.match(tokenRegex);
					tokens.push("[END]");
					for (let i = 0; i < tokens.length; i++) {
						const token = this.getLastNGrams(tokens, i);
						if (!chain.hasOwnProperty(token)) {
							chain[token] = new NGram(token);
						}
						chain[token].put(tokens[i]);
					}
				}

				this.alert.type = "success";
				if (continued) {
					this.alert.text = "Data succesfully added to model!";
				}else {
					this.alert.text = "Model succesfully trained!";
				}
				
				return chain;
			}catch(e) {
				this.alert.type = "danger";
				this.alert.text = e;
			}
		},

		getLastNGrams(tokens, i) {
			let token = "";
			for (let j = this.nGrams; j > 0; j--) {
				if (i - j < 0) {
					token += "[START] ";
				}else {
					token += tokens[i - j] + " ";
				}
			}
			return token;
		},

		generateText(chain, n, init) {
			this.alert.text = "";

			if (!chain || Object.keys(chain).length === 0) {
				this.alert.type = "danger";
				this.alert.text = "No model trained! Go to 'Train Model' to fix this.";
				return "";
			}

			let text = init;
			let generatedNGrams = (init) ? init.split(" ") : [];
			if (generatedNGrams.length > 0 && generatedNGrams.length < this.nGrams) {
				this.alert.type = "danger";
				this.alert.text = "You must enter at least as many starting symbols as n-grams (or leave the field blank).";
				return "";
			}

			let previousNGram = this.getLastNGrams(generatedNGrams, generatedNGrams.length);

			if (!chain[previousNGram]) {
				this.alert.type = "danger";
				this.alert.text = "The entered starting symbols do not appear in the model!";
				return "";
			}

			const spaceBeforeRgx = /[-,.!?:;"]/;
			//const spaceBeforeRgx = /[-]/g;
			let j = generatedNGrams.length;
			for (let i = 0; i < n; i++) {
				let nextNGram = chain[previousNGram].get();
				generatedNGrams.push(nextNGram);
				
				//const spaceBefore = (spaceBeforeRgx.test(previousNGram)) ? "" : " ";
				const spaceBefore = (spaceBeforeRgx.test(nextNGram)) ? "" : " ";
				nextNGram = nextNGram.replace(/\\n|\\r|(\[END\])/, "<br/>");
				text += " " + nextNGram;
				
				previousNGram = this.getLastNGrams(generatedNGrams, j+1);
				j += 1;
				if (nextNGram == "[END]" || !chain[previousNGram]) {
					console.log("end")
					console.log(nextNGram);
					console.log(previousNGram);
					generatedNGrams = [];
					j = 0;
					previousNGram = this.getLastNGrams(generatedNGrams, j);
				}
			}
			
			return text;
		},

		pickRandomProperty(obj) {
			var result;
			var count = 0;
			for (var prop in obj)
				if (Math.random() < 1/++count)
				   result = prop;
			return result;
		},

		processFile() {
			//console.log(this.$refs.myFile.files[0]);
			
			let file = this.$refs.myFile.files[0];
			
			// Credit: https://stackoverflow.com/a/754398/52160
			let reader = new FileReader();
			reader.readAsText(file, "UTF-8");
			reader.onload =  evt => {
			  this.input = evt.target.result;
			}
			reader.onerror = evt => {
				this.alert.type="danger";
				this.alert.text = evt;
			  console.error(evt);
			}
			
		},

		fetchFromGutenberg() {
			fetch(`${window.location.href}books/${this.selectedBook}.txt`,
			{
				method: "GET",
			}).then(response => response.text()).then(data => this.input = data);
		}
	}

});

app.mount("#app");
