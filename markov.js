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
			return {'text': key, 'probability': value / this.numFollowing};
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
			selectedBook: "",
			probabilityOfSentence: 0.0,
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

				//Separate texts separated by two or more newlines (with possibly whitespace inbetween) into paragraphs
				//This works well for the project gutenberg books but may not be optimal for all data
				const paragraphRegex = /\n+\s+\n+/g;
				const paragraphs = text.split(paragraphRegex);
				for (let paragraph of paragraphs) {
					//Skip any paragraphs that were made as only line breaks and/or whitespace
					if (paragraph.replace(/\\n|\\r/, "").trim() == "") {
						continue;
					}

					//match non-whitespace with a possible line-break at the end
					const tokenRegex = /\S+\n?/g;
					const tokens = paragraph.match(tokenRegex);
					//Add a terminator token to the end of each paragraph
					tokens.push("[END]");

					//Add each token to the data structure storing the model
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

		//Gets the previous nGrams tokens that were generated.
		//If the n-gram number is more than the number of tokens generated, it pads the result with [START] tokens
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
			let probability = 1.0;
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

			let j = generatedNGrams.length;
			for (let i = 0; i < n; i++) {
				let nextNGramObject = chain[previousNGram].get();
				let nextNGram = nextNGramObject.text;
				probability *= nextNGramObject.probability;
				generatedNGrams.push(nextNGram);
				
				//Line breaks and the terminator tokens should be represented as actual line breaks in HTML
				nextNGram = nextNGram.replace(/\n|\r|(\[END\])/, "<br/>");
				text += " " + nextNGram;
				
				previousNGram = this.getLastNGrams(generatedNGrams, j+1);
				j += 1;

				//If the chain has terminated or the value stored in previousNGram doesn't exist in the model
				//then start generating again as if from the beginning.
				if (nextNGram == "[END]" || !chain[previousNGram]) {
					generatedNGrams = [];
					j = 0;
					previousNGram = this.getLastNGrams(generatedNGrams, j);
				}
			}
			
			this.probabilityOfSentence = probability;
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

		fetchBook() {
			fetch(`${window.location.href}books/${this.selectedBook}.txt`,
			{
				method: "GET",
			}).then(response => response.text()).then(data => this.input = data);
		}
	}

});

app.mount("#app");
