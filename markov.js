const { createApp } = Vue

function Symbol(symbol) {
	this.symbol = symbol;
	this.numFollowing = 0;
	this.listFollowing = new Object();
}

Symbol.prototype.put = function(symbol) {
	if (!this.listFollowing[symbol]) {
		this.listFollowing[symbol] = 1;
	}else {
		this.listFollowing[symbol] += 1;
	}
	this.numFollowing++;
}

Symbol.prototype.get = function() {
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

const app = createApp({

	data() {
		return {
			input: "",
			nSymbols: 125,
			text: "",
			mkChain: {},
			page: "MDL",
			alert: new Alert(),
		}
	},
	watch: {
		page: function() {
			this.alert.text = "";
		},
	},
	methods: {
		toHTML: function(text) {
			return `<span>${text}</span>`;
		},

		makeChainEvent: function(continued) {
			let prevChain = null;
			if (continued) {
				prevChain = this.mkChain;
			}
			this.mkChain = this.makeMarkovChain(this.input, prevChain);
		},

		genTextEvent: function() {
			this.text = this.generateText(this.mkChain, this.nSymbols);
		},

		makeMarkovChain: function(text, chain) {
			try {
				this.alert.text = "";
				let continued = chain;
				if (!continued) {
					chain = new Object();
				}
				const tokenRegex = /([\n\w]['’]*)+|\S/g;
				const tokens = text.match(tokenRegex);
				for (let i = 0; i < tokens.length - 1; i++) {
					const token = tokens[i];
					if (!chain.hasOwnProperty(token)) {
						chain[token] = new Symbol(token);
					}
					chain[token].put(tokens[i + 1]);
				}

				const lastToken = tokens[tokens.length - 1];
				if (!chain[lastToken]) {
					chain[lastToken] = new Symbol(lastToken);
					//chain[lastToken].put(lastToken);
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

		generateText: function(chain, n, init) {

			this.alert.text = "";

			let text = "";
			let previousSymbol = (init) ? init : this.pickRandomProperty(chain);

			if (!previousSymbol) {
				this.alert.type = "danger";
				this.alert.text = "No model trained! Go to 'Train Model' to fix this.";
				return "";
			}

			const spaceAfterRgx = /[-,.!?:;"]/;
			//const spaceBeforeRgx = /[-]/g;
			for (let i = 0; i < n; i++) {
				const nextSymbol = chain[previousSymbol].get();
				
				//const spaceBefore = (spaceBeforeRgx.test(previousSymbol)) ? "" : " ";
				const spaceAfter = (spaceAfterRgx.test(nextSymbol)) ? "" : " ";
				previousSymbol = previousSymbol.replace("\n", "<br/>");
				text += previousSymbol + spaceAfter;
				
				if (nextSymbol) {
					previousSymbol = nextSymbol;
				} else {
					const newSymbol = this.pickRandomProperty(chain);
					previousSymbol = newSymbol;
					text += "<br/>";
				}
			}
			
			return text;
		},

		pickRandomProperty: function(obj) {
			var result;
			var count = 0;
			for (var prop in obj)
				if (Math.random() < 1/++count)
				   result = prop;
			return result;
		},

		processFile() {
			console.log('selected a file');
			console.log(this.$refs.myFile.files[0]);
			
			let file = this.$refs.myFile.files[0];
			if(!file || file.type !== 'text/plain') return;
			
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
			
		  }
	}

});

app.mount("#app");
